import type { QueryClient } from "@tanstack/react-query"
import { useVersionStore } from "./useVersionStore"
import { usePersistenceModelStore } from "./usePersistenceModelStore"
import {
  getVersionRepository,
  subscribeToLocalVersionEvents,
} from "@/services/versionRepository"
import { queryClient as appQueryClient } from "@/queryClient"
import { versionKeys } from "@/queries/keys"
import { getCachedVersions } from "@/queries/versionQueries"
import { log } from "@/logger"

/**
 * Single side-effect install for the versioning feature. Wires:
 *
 *   1. Cascade-delete: when `usePersistenceModelStore.deleteModel(id)`
 *      removes a local diagram, purge its IDB version trail too.
 *   2. Cross-tab consistency: a BroadcastChannel message from any tab
 *      invalidates that diagram's local version-list query, so every other
 *      tab's mounted drawer/banner refetches.
 *
 * (The old visibilitychange refetch loop is gone: the version-list query
 * itself sets `refetchOnWindowFocus: true` with `staleTime: 0`, which covers
 * exactly the mounted-consumer set the loop used to iterate.)
 *
 * Idempotent under StrictMode/HMR — the disposers from a prior install
 * are torn down before a new install runs, so listeners never double up.
 */

let dispose: (() => void) | null = null

export function ensureVersionStoreBootstrapped(
  queryClient: QueryClient = appQueryClient
): void {
  if (dispose) return

  // 1. Cascade delete — narrow the subscription to `models` so unrelated
  //    state changes (currentModelId, etc.) don't recompute the keyset.
  let prevModelIds = new Set(
    Object.keys(usePersistenceModelStore.getState().models)
  )
  const unsubscribeModels = usePersistenceModelStore.subscribe(
    (state, prev) => {
      if (state.models === prev.models) return
      const next = new Set(Object.keys(state.models))
      for (const id of prevModelIds) {
        if (!next.has(id)) {
          // A deleted persistence-store model is always a LOCAL diagram, so its
          // versions live in IndexedDB; the remote adapter has no purgeDiagram
          // and would orphan them.
          getVersionRepository("local")
            .purgeDiagram?.(id)
            .catch((err: unknown) =>
              log.warn(
                "purgeDiagram failed",
                err instanceof Error ? err.message : String(err)
              )
            )
        }
      }
      prevModelIds = next
    }
  )

  // 2. Cross-tab invalidations. After the refetch settles, if the previewed
  //    version was deleted by the other tab, exit preview defensively so the
  //    canvas doesn't show a row that no longer exists.
  const unsubscribeBroadcast = subscribeToLocalVersionEvents((msg) => {
    void queryClient
      .invalidateQueries({
        queryKey: versionKeys.list("local", msg.diagramId),
        // Also refetch a currently-unobserved list: the preview-alive check
        // below must see the reconciled list even when no drawer is mounted.
        refetchType: "all",
      })
      .then(() => {
        const store = useVersionStore.getState()
        const previewing = store.preview
        if (!previewing || previewing.diagramId !== msg.diagramId) return
        const versions = getCachedVersions(queryClient, "local", msg.diagramId)
        // Only act on a loaded list — an empty cache proves nothing.
        if (versions && !versions.some((v) => v.id === previewing.versionId)) {
          store.exitPreview()
        }
      })
      .catch((err: unknown) =>
        log.warn(
          "Cross-tab refetch failed",
          err instanceof Error ? err.message : String(err)
        )
      )
  })

  dispose = () => {
    unsubscribeModels()
    unsubscribeBroadcast()
  }
}

/** Test-only teardown so each test starts with a fresh subscription set. */
export function __teardownVersionStoreBootstrapForTests(): void {
  dispose?.()
  dispose = null
}
