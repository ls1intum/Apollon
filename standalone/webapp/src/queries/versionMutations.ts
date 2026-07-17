import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"
import type { UMLModel } from "@tumaet/apollon"
import type { CreateVersionResult } from "@/services/versionRepository"
import { useVersionStore } from "@/stores/useVersionStore"
import { MAX_VERSIONS_PER_DIAGRAM } from "@/constants"
import type { VersionSummary } from "@/types"
import { versionKeys } from "./keys"
import {
  getCachedVersions,
  useBoundRepository,
  type VersionListData,
} from "./versionQueries"
import {
  patchVersionInList,
  removeVersionFromList,
  replaceVersionInList,
} from "./versionListCache"

/**
 * Version-history write operations. Every hook keeps its cache/store side
 * effects on the MUTATION OPTIONS (not `mutate()` call sites): option-level
 * callbacks still run when the calling component unmounts mid-flight, so
 * invalidations and the restore bookkeeping flags can never leak
 * (https://tanstack.com/query/v5/docs/framework/react/guides/mutations).
 *
 * Call sites own only their local UX (toasts for their own failure copy,
 * closing dialogs) via `mutateAsync` try/catch.
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
 * Create a snapshot. No cache forgery: the drawer renders the in-flight /
 * failed row straight from this mutation's state (`variables` + status), and
 * the settle-time invalidation brings in the authoritative list — including
 * any rows the server evicted to fit the cap.
 *
 * `onSettled` RETURNS the invalidation promise, so the mutation stays
 * `isPending` until the refreshed list has landed. That is what lets the
 * optimistic row be derived from `isPending` alone: it stays up until the
 * real row exists, with no gap and no stand-in row to expire.
 */
export function useCreateVersionMutation(diagramId: string) {
  const queryClient = useQueryClient()
  const repo = useBoundRepository()
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
        queryKey: versionKeys.list(repo.kind, diagramId),
      }),
  })
}

export interface EditVersionInfoVariables {
  versionId: string
  patch: { name?: string; description?: string }
}

/** Rename/describe a version. Optimistic patch, rollback on error. */
export function useEditVersionInfoMutation(diagramId: string) {
  const queryClient = useQueryClient()
  const repo = useBoundRepository()
  const listKey = versionKeys.list(repo.kind, diagramId)
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
export function useDeleteVersionMutation(diagramId: string) {
  const queryClient = useQueryClient()
  const repo = useBoundRepository()
  const listKey = versionKeys.list(repo.kind, diagramId)
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
        queryKey: versionKeys.body(repo.kind, diagramId, versionId),
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
 * Restore a version to HEAD. `onMutate` raises the store's
 * `pendingRestoreFromId` BEFORE the request leaves, preserving the
 * self-detection window for the WS `VERSION_RESTORED` event (which typically
 * beats the HTTP response back to this client).
 */
export function useRestoreVersionMutation(diagramId: string) {
  const queryClient = useQueryClient()
  const repo = useBoundRepository()
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
      const restored = getCachedVersions(
        queryClient,
        repo.kind,
        diagramId
      )?.find((v) => v.id === versionId)
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
        queryKey: versionKeys.list(repo.kind, diagramId),
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
export function useUndoRestoreMutation() {
  const queryClient = useQueryClient()
  const repo = useBoundRepository()
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
        queryKey: versionKeys.list(repo.kind, diagramId),
      })
    },
    onError: () => {
      useVersionStore.getState().cancelRestore()
    },
  })
}
