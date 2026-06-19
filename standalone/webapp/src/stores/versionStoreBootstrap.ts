import { useVersionStore } from "./useVersionStore"
import { usePersistenceModelStore } from "./usePersistenceModelStore"
import {
  LocalVersionRepository,
  subscribeToLocalVersionEvents,
} from "@/services/versionRepository"
import { log } from "@/logger"

/**
 * Single side-effect install for the version store. Wires:
 *
 *   1. Cascade-delete: when `usePersistenceModelStore.deleteModel(id)`
 *      removes a local diagram, purge its IDB version trail too.
 *   2. Cross-tab consistency: BroadcastChannel from any tab triggers a
 *      refetch in every other tab's open drawer.
 *   3. Visibility refetch: returning to the tab after a long pause
 *      reconciles drawers that BroadcastChannel can't reach (sleeping).
 *
 * Idempotent under StrictMode/HMR — the disposers from a prior install
 * are torn down before a new install runs, so listeners never double up.
 */

let dispose: (() => void) | null = null

export function ensureVersionStoreBootstrapped(): void {
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
          LocalVersionRepository.purgeDiagram(id).catch((err: unknown) =>
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

  // 2. Cross-tab invalidations. After refetch, if a previewed version
  //    was deleted by the other tab, exit preview defensively so the
  //    canvas doesn't show a row that no longer exists.
  const unsubscribeBroadcast = subscribeToLocalVersionEvents((msg) => {
    const store = useVersionStore.getState()
    void store
      .fetchVersions(msg.diagramId)
      .then(() => {
        const after = useVersionStore.getState()
        const previewing = after.preview
        if (!previewing || previewing.diagramId !== msg.diagramId) return
        const stillThere = (after.versions[msg.diagramId] ?? []).some(
          (v) => v.id === previewing.versionId
        )
        if (!stillThere) after.exitPreview()
      })
      .catch((err: unknown) =>
        log.warn(
          "Cross-tab refetch failed",
          err instanceof Error ? err.message : String(err)
        )
      )
  })

  // 3. Visibility-aware refetch.
  let unsubscribeVisibility: (() => void) | null = null
  if (typeof document !== "undefined") {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return
      const state = useVersionStore.getState()
      for (const [diagramId, open] of Object.entries(
        state.drawerOpenByDiagram
      )) {
        if (!open) continue
        void state
          .fetchVersions(diagramId)
          .catch((err: unknown) =>
            log.warn(
              "Visibility refetch failed",
              err instanceof Error ? err.message : String(err)
            )
          )
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    unsubscribeVisibility = () =>
      document.removeEventListener("visibilitychange", onVisibility)
  }

  dispose = () => {
    unsubscribeModels()
    unsubscribeBroadcast()
    unsubscribeVisibility?.()
  }
}

/** Test-only teardown so each test starts with a fresh subscription set. */
export function __teardownVersionStoreBootstrapForTests(): void {
  dispose?.()
  dispose = null
}
