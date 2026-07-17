import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"
import type { UMLModel } from "@tumaet/apollon"
import {
  getVersionRepository,
  type CreateVersionResult,
  type RepositoryKind,
} from "@/services/versionRepository"
import { useVersionStore } from "@/stores/useVersionStore"
import { MAX_VERSIONS_PER_DIAGRAM } from "@/constants"
import type { VersionSummary } from "@/types"
import { versionKeys } from "./keys"
import { getCachedVersions, type VersionListData } from "./versionQueries"
import {
  patchVersionInList,
  removeVersionFromList,
  replaceVersionInList,
} from "./versionListCache"

/**
 * Version-history writes. Cache and store side effects live on the mutation
 * options, never on `mutate()` call sites: call-site callbacks are skipped if
 * the caller unmounts mid-flight, which would leak the restore flags and skip
 * invalidations. Call sites own only their own UX (failure copy, dialogs).
 */

/** Collaborator display name attached to server-side version events. */
function getActor(): string | undefined {
  return sessionStorage.getItem("apollon-collab-name") || undefined
}

/**
 * Kind-accurate eviction messaging after a create. Two distinct cases:
 * unnamed-only evictions are informational (autosaves dropped to fit the
 * cap); any named eviction is real data loss and warns loudly, echoing the
 * cap the backend actually enforced (server 50, local 30).
 */
function notifyEvictions(result: CreateVersionResult): void {
  const { evictedVersionIds, evictedKinds, cap: backendCap } = result
  if (!evictedVersionIds || evictedVersionIds.length === 0) return
  const namedCount = (evictedKinds ?? []).filter((k) => k === "named").length
  const cap = backendCap ?? MAX_VERSIONS_PER_DIAGRAM
  if (namedCount > 0) {
    toast.warning(
      namedCount === 1
        ? `Saved. Your oldest named version was removed — the ${cap}-version cap is full.`
        : `Saved. ${namedCount} oldest named versions were removed — the ${cap}-version cap is full.`,
      { autoClose: 8000 }
    )
  } else {
    const n = evictedVersionIds.length
    toast.info(
      n === 1
        ? "Saved. An older autosave was removed to fit the version cap."
        : `Saved. ${n} older autosaves were removed to fit the version cap.`,
      { autoClose: 5000 }
    )
  }
}

export interface CreateVersionVariables {
  body: UMLModel
  name?: string
  description?: string
}

/**
 * Create a snapshot. The drawer renders the in-flight row from this
 * mutation's state, so nothing optimistic is written to the cache; the
 * settle-time invalidation brings in the authoritative list, including rows
 * the server evicted to fit the cap.
 *
 * `onSettled` RETURNS the invalidation promise, keeping the mutation pending
 * until the refreshed list lands. The drawer's row derives from `isPending`
 * and depends on that: `void`-ing this would flash a gap where the row is
 * neither optimistic nor real.
 */
export function useCreateVersionMutation(
  kind: RepositoryKind,
  diagramId: string
) {
  const queryClient = useQueryClient()
  const repo = getVersionRepository(kind)
  return useMutation({
    mutationFn: ({ body, name, description }: CreateVersionVariables) =>
      repo.create(diagramId, body, {
        name,
        description,
        actor: getActor(),
      }),
    onSuccess: (result) => {
      notifyEvictions(result)
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: versionKeys.list(kind, diagramId),
      }),
  })
}

export interface EditVersionInfoVariables {
  versionId: string
  patch: { name?: string; description?: string }
}

/** Rename/describe a version. Optimistic patch, rollback on error. */
export function useEditVersionInfoMutation(
  kind: RepositoryKind,
  diagramId: string
) {
  const queryClient = useQueryClient()
  const repo = getVersionRepository(kind)
  const listKey = versionKeys.list(kind, diagramId)
  return useMutation({
    mutationFn: ({ versionId, patch }: EditVersionInfoVariables) =>
      repo.editInfo(diagramId, versionId, patch),
    onMutate: async ({ versionId, patch }) => {
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<VersionListData>(listKey)
      queryClient.setQueryData<VersionListData>(listKey, (data) =>
        patchVersionInList(data, versionId, patch)
      )
      return { previous }
    },
    onSuccess: (updated: VersionSummary) => {
      queryClient.setQueryData<VersionListData>(listKey, (data) =>
        replaceVersionInList(data, updated)
      )
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey })
    },
  })
}

/** Delete a version. Optimistic removal, reinstated wholesale on error. */
export function useDeleteVersionMutation(
  kind: RepositoryKind,
  diagramId: string
) {
  const queryClient = useQueryClient()
  const repo = getVersionRepository(kind)
  const listKey = versionKeys.list(kind, diagramId)
  return useMutation({
    mutationFn: ({ versionId }: { versionId: string }) =>
      repo.delete(diagramId, versionId),
    onMutate: async ({ versionId }) => {
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<VersionListData>(listKey)
      queryClient.setQueryData<VersionListData>(listKey, (data) =>
        removeVersionFromList(data, versionId)
      )
      return { previous }
    },
    onSuccess: (_res, { versionId }) => {
      // Immutable body of a deleted row can never be shown again.
      queryClient.removeQueries({
        queryKey: versionKeys.body(kind, diagramId, versionId),
      })
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey })
    },
  })
}

export interface RestoreVersionVariables {
  versionId: string
  /**
   * The live canvas at restore time — the server writes the pre-restore
   * auto-snapshot FROM it (required by the repository contract).
   */
  currentBody: UMLModel
}

/**
 * Restore a version to HEAD. `onMutate` raises `pendingRestoreFromId` before
 * the request leaves: the WS `VERSION_RESTORED` event typically beats the HTTP
 * response back, and must be recognised as self-caused.
 */
export function useRestoreVersionMutation(
  kind: RepositoryKind,
  diagramId: string
) {
  const queryClient = useQueryClient()
  const repo = getVersionRepository(kind)
  return useMutation({
    mutationFn: ({ versionId, currentBody }: RestoreVersionVariables) =>
      repo.restore(diagramId, versionId, {
        currentBody,
        actor: getActor(),
      }),
    onMutate: ({ versionId }) => {
      useVersionStore.getState().beginRestore(versionId)
    },
    onSuccess: ({ autoSnapshotVersionId }, { versionId }) => {
      const restored = getCachedVersions(queryClient, kind, diagramId)?.find(
        (v) => v.id === versionId
      )
      useVersionStore.getState().completeRestore({
        diagramId,
        autoSnapshotVersionId,
        restoredFromVersionId: versionId,
        restoredVersionName:
          restored?.description?.trim() ||
          restored?.name?.trim() ||
          (restored?.seq !== undefined
            ? `#${restored.seq}`
            : versionId.slice(0, 8)),
      })
      void queryClient.invalidateQueries({
        queryKey: versionKeys.list(kind, diagramId),
      })
    },
    onError: () => {
      useVersionStore.getState().cancelRestore()
    },
  })
}

export interface UndoRestoreVariables {
  diagramId: string
  autoSnapshotVersionId: string
  /** Current canvas — captured as the undo's own pre-restore snapshot. */
  currentBody: UMLModel
}

/**
 * Undo a just-completed restore by restoring its auto-snapshot. The caller
 * (UndoRestoreToast) guards the undo window and exits preview first; this
 * hook owns the flag lifecycle and cache reconciliation.
 */
export function useUndoRestoreMutation(kind: RepositoryKind) {
  const queryClient = useQueryClient()
  const repo = getVersionRepository(kind)
  return useMutation({
    mutationFn: ({
      diagramId,
      autoSnapshotVersionId,
      currentBody,
    }: UndoRestoreVariables) =>
      repo.restore(diagramId, autoSnapshotVersionId, {
        currentBody,
        actor: getActor(),
      }),
    onMutate: ({ autoSnapshotVersionId }) => {
      useVersionStore.getState().beginRestore(autoSnapshotVersionId)
    },
    onSuccess: (_res, { diagramId }) => {
      const store = useVersionStore.getState()
      store.cancelRestore()
      store.dismissUndoRestore()
      void queryClient.invalidateQueries({
        queryKey: versionKeys.list(kind, diagramId),
      })
    },
    onError: () => {
      useVersionStore.getState().cancelRestore()
    },
  })
}
