import { create } from "zustand"
import { devtools, persist, createJSONStorage } from "zustand/middleware"
import { toast } from "react-toastify"
import type { UMLModel } from "@tumaet/apollon"
import { ApiError } from "@/services/DiagramApiClient"
import { getVersionRepository } from "@/services/versionRepository"
import { MAX_VERSIONS_PER_DIAGRAM } from "@/constants"
import { log } from "@/logger"
import type { ApiErrorCode, ControlEvent, VersionSummary } from "@/types"

type DiagramId = string
type VersionId = string

export interface PendingVersion extends VersionSummary {
  pending?: true
  failed?: boolean
}

interface PreviewState {
  diagramId: DiagramId
  versionId: VersionId
  body: UMLModel
}

interface UndoRestoreState {
  diagramId: DiagramId
  autoSnapshotVersionId: VersionId
  restoredFromVersionId: VersionId
  restoredVersionName: string
  expiresAt: number
}

interface State {
  // Per-diagram persisted UI state.
  drawerOpenByDiagram: Record<DiagramId, boolean>
  /**
   * A per-diagram nonce the "save a version" shortcut bumps. The mounted
   * version panel watches it and runs its own save path once, reusing every
   * guard (dirty-check, empty/preview blocks) — the shortcut owns no editor.
   */
  saveRequestByDiagram: Record<DiagramId, number>
  // Per-diagram in-memory state (refetched on reload).
  versions: Record<DiagramId, PendingVersion[]>
  nextCursor: Record<DiagramId, string | undefined>
  /** Server-reported total count, independent of how many pages are loaded. */
  totals: Record<DiagramId, number>
  preview: PreviewState | null
  /** When set, surfaces an "undo restore" snackbar in the UI. */
  undoRestore: UndoRestoreState | null
  /**
   * Set before the restore API call so the control-event handler can
   * detect self-triggered VERSION_RESTORED events. The WebSocket event
   * typically arrives before the HTTP response, so checking `undoRestore`
   * alone would miss the window.
   */
  pendingRestoreFromId: VersionId | null
  /** Per-diagram loading flag — scoped so concurrent diagram fetches don't clobber. */
  loading: Record<DiagramId, boolean>
  error: Record<DiagramId, ApiErrorCode | null>
}

interface Actions {
  // ---- Drawer -----------------------------------------------------------
  openDrawer: (diagramId: DiagramId) => void
  closeDrawer: (diagramId: DiagramId) => void
  /** Open the panel and ask it to save a version now. */
  requestSave: (diagramId: DiagramId) => void
  /** Mark the pending save request handled. */
  clearSaveRequest: (diagramId: DiagramId) => void

  // ---- Versions ---------------------------------------------------------
  fetchVersions: (diagramId: DiagramId) => Promise<void>
  loadMoreVersions: (diagramId: DiagramId) => Promise<void>
  /**
   * Optimistic create. Adds a pending row with a client-generated temp id;
   * the server response carries the same id back and the row is reconciled
   * by `id === tempId` (see line ~207).
   */
  createVersion: (
    diagramId: DiagramId,
    body: UMLModel,
    opts: { name?: string; description?: string }
  ) => Promise<VersionSummary & { headRev?: number }>
  editVersionInfo: (
    diagramId: DiagramId,
    versionId: VersionId,
    patch: { name?: string; description?: string }
  ) => Promise<void>
  deleteVersion: (diagramId: DiagramId, versionId: VersionId) => Promise<void>

  // ---- Preview / Restore ------------------------------------------------
  enterPreview: (diagramId: DiagramId, versionId: VersionId) => Promise<void>
  exitPreview: () => void
  restoreVersion: (
    diagramId: DiagramId,
    versionId: VersionId,
    currentBody: UMLModel
  ) => Promise<{ autoSnapshotVersionId: VersionId; headRev?: number }>
  triggerUndoRestore: (
    diagramId: DiagramId,
    currentBody: UMLModel
  ) => Promise<void>
  dismissUndoRestore: () => void

  // ---- Realtime ---------------------------------------------------------
  applyControlEvent: (diagramId: DiagramId, event: ControlEvent) => void
}

export type VersionStore = State & Actions

const UNDO_WINDOW_MS = 10_000

/**
 * Stable empty-array reference for selectors that fall back when a key is
 * absent. Returning a fresh `[]` literal each call would defeat Zustand's
 * default referential-equality check and trigger the infinite-loop warning
 * "The result of getSnapshot should be cached" in `useSyncExternalStore`.
 */
const EMPTY_VERSIONS: readonly PendingVersion[] = Object.freeze([])

/** Selector helper — referentially stable when the diagram has no entry. */
export function selectVersions(
  state: State,
  diagramId: string
): readonly PendingVersion[] {
  return state.versions[diagramId] ?? EMPTY_VERSIONS
}

/** Ignore a preview left behind by another diagram (the slot is global). */
export function selectScopedPreview(
  state: State,
  diagramId: string
): PreviewState | null {
  return state.preview?.diagramId === diagramId ? state.preview : null
}

export const useVersionStore = create<VersionStore>()(
  devtools(
    persist(
      (set, get) => ({
        drawerOpenByDiagram: {},
        saveRequestByDiagram: {},
        versions: {},
        nextCursor: {},
        totals: {},
        preview: null,
        undoRestore: null,
        pendingRestoreFromId: null,
        loading: {},
        error: {},

        // ---- Drawer ----------------------------------------------------------
        openDrawer: (diagramId) =>
          set((s) => ({
            drawerOpenByDiagram: {
              ...s.drawerOpenByDiagram,
              [diagramId]: true,
            },
          })),
        closeDrawer: (diagramId) =>
          set((s) => ({
            drawerOpenByDiagram: {
              ...s.drawerOpenByDiagram,
              [diagramId]: false,
            },
          })),
        requestSave: (diagramId) =>
          set((s) => ({
            drawerOpenByDiagram: {
              ...s.drawerOpenByDiagram,
              [diagramId]: true,
            },
            saveRequestByDiagram: {
              ...s.saveRequestByDiagram,
              [diagramId]: (s.saveRequestByDiagram[diagramId] ?? 0) + 1,
            },
          })),
        clearSaveRequest: (diagramId) =>
          set((s) => ({
            saveRequestByDiagram: {
              ...s.saveRequestByDiagram,
              [diagramId]: 0,
            },
          })),
        // ---- Versions --------------------------------------------------------
        fetchVersions: async (diagramId) => {
          set((s) => ({
            loading: { ...s.loading, [diagramId]: true },
            error: { ...s.error, [diagramId]: null },
          }))
          try {
            const { versions, nextCursor, total } =
              await getVersionRepository().list(diagramId, { limit: 25 })
            set((s) => ({
              versions: { ...s.versions, [diagramId]: versions },
              nextCursor: { ...s.nextCursor, [diagramId]: nextCursor },
              totals: { ...s.totals, [diagramId]: total },
              loading: { ...s.loading, [diagramId]: false },
            }))
          } catch (err) {
            set((s) => ({
              loading: { ...s.loading, [diagramId]: false },
              error: {
                ...s.error,
                [diagramId]: err instanceof ApiError ? err.code : "INTERNAL",
              },
            }))
          }
        },

        loadMoreVersions: async (diagramId) => {
          const cursor = get().nextCursor[diagramId]
          if (!cursor) return
          if (get().loading[diagramId]) return
          set((s) => ({
            loading: { ...s.loading, [diagramId]: true },
            error: { ...s.error, [diagramId]: null },
          }))
          try {
            const { versions, nextCursor, total } =
              await getVersionRepository().list(diagramId, {
                limit: 25,
                before: cursor,
              })
            set((s) => ({
              versions: {
                ...s.versions,
                [diagramId]: [...(s.versions[diagramId] ?? []), ...versions],
              },
              nextCursor: { ...s.nextCursor, [diagramId]: nextCursor },
              totals: { ...s.totals, [diagramId]: total },
              loading: { ...s.loading, [diagramId]: false },
            }))
          } catch (err) {
            set((s) => ({
              loading: { ...s.loading, [diagramId]: false },
              error: {
                ...s.error,
                [diagramId]: err instanceof ApiError ? err.code : "INTERNAL",
              },
            }))
            toast.error("Failed to load more versions.")
          }
        },

        createVersion: async (diagramId, body, opts) => {
          const tempId = `pending-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`
          const optimistic: PendingVersion = {
            id: tempId,
            diagramId,
            name: opts.name ?? "",
            description: opts.description ?? "",
            createdAt: new Date().toISOString(),
            kind: "user",
            librarySchemaVersion: body.version,
            pending: true,
          }
          set((s) => ({
            versions: {
              ...s.versions,
              [diagramId]: [optimistic, ...(s.versions[diagramId] ?? [])],
            },
          }))
          try {
            const actor =
              sessionStorage.getItem("apollon-collab-name") || undefined
            const result = await getVersionRepository().create(
              diagramId,
              body,
              {
                ...opts,
                actor,
              }
            )
            const {
              evictedVersionIds,
              evictedKinds,
              total: serverTotal,
              headRev: serverHeadRev,
              cap: backendCap,
              ...summary
            } = result
            set((s) => {
              const currentList = s.versions[diagramId] ?? []
              // Strip both the optimistic placeholder and any rows the
              // server just evicted to fit the cap. Without this, the
              // evicted rows linger in the local list — a stale view of
              // server truth — until the next fetch.
              const evictedSet = new Set(evictedVersionIds ?? [])
              const reconciled = currentList
                .map((v) => (v.id === tempId ? (summary as PendingVersion) : v))
                .filter((v) => !evictedSet.has(v.id))
              return {
                versions: { ...s.versions, [diagramId]: reconciled },
                totals: {
                  ...s.totals,
                  [diagramId]:
                    serverTotal ?? reconciled.filter((v) => !v.pending).length,
                },
              }
            })
            // Surface eviction with a kind-accurate message. Two
            // distinct cases:
            //   - "unnamed" only: a recovery-infra autosave was dropped
            //     to make room. Low-stakes, informational.
            //   - any "named":   a user-saved milestone was dropped
            //     because the cap was hit by named rows alone. That's
            //     real data loss and warrants a stronger warning.
            if (evictedVersionIds && evictedVersionIds.length > 0) {
              const namedCount = (evictedKinds ?? []).filter(
                (k) => k === "named"
              ).length
              // Backends may differ on cap (server 50, local 30) — echo the
              // value the backend actually enforced, falling through to the
              // server default for legacy responses without `cap`.
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
            return { ...summary, headRev: serverHeadRev }
          } catch (err) {
            set((s) => ({
              versions: {
                ...s.versions,
                [diagramId]: (s.versions[diagramId] ?? []).map((v) =>
                  v.id === tempId
                    ? { ...v, pending: undefined, failed: true }
                    : v
                ),
              },
              error: {
                ...s.error,
                [diagramId]: err instanceof ApiError ? err.code : "INTERNAL",
              },
            }))
            throw err
          }
        },

        editVersionInfo: async (diagramId, versionId, patch) => {
          const prev = get().versions[diagramId]?.find(
            (v) => v.id === versionId
          )
          if (prev) {
            set((s) => ({
              versions: {
                ...s.versions,
                [diagramId]: (s.versions[diagramId] ?? []).map((v) =>
                  v.id === versionId ? { ...v, ...patch } : v
                ),
              },
            }))
          }
          try {
            const updated = await getVersionRepository().editInfo(
              diagramId,
              versionId,
              patch
            )
            set((s) => ({
              versions: {
                ...s.versions,
                [diagramId]: (s.versions[diagramId] ?? []).map((v) =>
                  v.id === versionId ? updated : v
                ),
              },
            }))
          } catch (err) {
            if (prev) {
              set((s) => ({
                versions: {
                  ...s.versions,
                  [diagramId]: (s.versions[diagramId] ?? []).map((v) =>
                    v.id === versionId ? prev : v
                  ),
                },
              }))
            }
            throw err
          }
        },

        deleteVersion: async (diagramId, versionId) => {
          const list = get().versions[diagramId] ?? []
          const idx = list.findIndex((v) => v.id === versionId)
          const prev = idx >= 0 ? list[idx] : undefined
          set((s) => ({
            versions: {
              ...s.versions,
              [diagramId]: (s.versions[diagramId] ?? []).filter(
                (v) => v.id !== versionId
              ),
            },
          }))
          try {
            await getVersionRepository().delete(diagramId, versionId)
          } catch (err) {
            if (prev) {
              set((s) => {
                const current = s.versions[diagramId] ?? []
                const restored = [...current]
                restored.splice(Math.min(idx, restored.length), 0, prev)
                return {
                  versions: { ...s.versions, [diagramId]: restored },
                }
              })
            }
            throw err
          }
        },

        // ---- Preview / Restore ----------------------------------------------
        enterPreview: async (diagramId, versionId) => {
          const body = await getVersionRepository().getBody(
            diagramId,
            versionId
          )
          set({ preview: { diagramId, versionId, body } })
          // On deep-link the version list may be empty (fetchVersions and
          // enterPreview both start concurrently in the init effect but
          // enterPreview can resolve first). Trigger a list fetch so the
          // preview banner can show the version's metadata (label, timestamp).
          if (!get().versions[diagramId]?.length) {
            void get().fetchVersions(diagramId)
          }
        },

        exitPreview: () => set({ preview: null }),

        restoreVersion: async (diagramId, versionId, currentBody) => {
          const restoredVersion = get().versions[diagramId]?.find(
            (v) => v.id === versionId
          )
          set({ pendingRestoreFromId: versionId })
          try {
            const actor =
              sessionStorage.getItem("apollon-collab-name") || undefined
            const { autoSnapshotVersionId, headRev } =
              await getVersionRepository().restore(diagramId, versionId, {
                currentBody,
                actor,
              })
            set({
              preview: null,
              pendingRestoreFromId: null,
              undoRestore: {
                diagramId,
                autoSnapshotVersionId,
                restoredFromVersionId: versionId,
                restoredVersionName:
                  restoredVersion?.description?.trim() ||
                  restoredVersion?.name?.trim() ||
                  (restoredVersion?.seq !== undefined
                    ? `#${restoredVersion.seq}`
                    : versionId.slice(0, 8)),
                expiresAt: Date.now() + UNDO_WINDOW_MS,
              },
            })
            void get().fetchVersions(diagramId)
            return { autoSnapshotVersionId, headRev }
          } catch (err) {
            set({ pendingRestoreFromId: null })
            throw err
          }
        },

        triggerUndoRestore: async (diagramId, currentBody) => {
          const undo = get().undoRestore
          if (!undo || undo.diagramId !== diagramId) return
          // Refuse to trigger if the undo window has expired. The snackbar
          // should auto-dismiss before this point, but guard defensively so
          // a stale snackbar re-render can't restore to a 10+ second old snapshot.
          if (Date.now() > undo.expiresAt) {
            set({ undoRestore: null })
            return
          }
          // Exit any active preview before restoring — restoring while
          // previewing would leave the store in an inconsistent state where
          // preview !== null but the canvas shows the restored HEAD.
          if (get().preview !== null) {
            get().exitPreview()
          }
          // Restore the auto-snapshot, passing the user's current canvas so the
          // undo's own pre-restore auto-snapshot captures whatever they're
          // looking at right now (e.g. small edits made after the original
          // restore). Without this, those edits would be silently discarded.
          set({ pendingRestoreFromId: undo.autoSnapshotVersionId })
          try {
            const actor =
              sessionStorage.getItem("apollon-collab-name") || undefined
            await getVersionRepository().restore(
              diagramId,
              undo.autoSnapshotVersionId,
              { currentBody, actor }
            )
            set({ undoRestore: null, pendingRestoreFromId: null })
            void get().fetchVersions(diagramId)
          } catch (err) {
            set({ pendingRestoreFromId: null })
            throw err
          }
        },

        dismissUndoRestore: () => set({ undoRestore: null }),

        // ---- Realtime -------------------------------------------------------
        applyControlEvent: (diagramId, event) => {
          const list = get().versions[diagramId] ?? []
          switch (event.type) {
            case "VERSION_CREATED": {
              // Sender already inserted optimistically; receivers refetch to
              // pick up complete metadata (description, librarySchemaVersion,
              // and any subsequent edits to the meta hash).
              if (list.some((v) => v.id === event.versionId)) return
              void get().fetchVersions(diagramId)
              return
            }
            case "VERSION_DELETED":
              set((s) => ({
                versions: {
                  ...s.versions,
                  [diagramId]: (s.versions[diagramId] ?? []).filter(
                    (v) => v.id !== event.versionId
                  ),
                },
              }))
              return
            case "VERSION_RENAMED":
              set((s) => ({
                versions: {
                  ...s.versions,
                  [diagramId]: (s.versions[diagramId] ?? []).map((v) =>
                    v.id === event.versionId
                      ? {
                          ...v,
                          name: event.name,
                          description: event.description,
                        }
                      : v
                  ),
                },
              }))
              return
            case "VERSION_RESTORED":
              // The receiving client refetches HEAD via the page. Just refresh
              // the version list so the new auto-snapshot row appears.
              void get().fetchVersions(diagramId)
              return
            case "DIAGRAM_DELETED":
              // The page-level effect handles routing on diagram delete; the
              // version store has nothing local to clean up (the diagram's
              // map entries are dropped on the next fetch / page transition).
              return
            default:
              // Unknown event from a newer server during staggered rollout —
              // log and ignore rather than crash older clients.
              log.warn(
                "Unknown control event type",
                (event as { type: string }).type
              )
              return
          }
        },
      }),
      {
        name: "apollon-version-store",
        storage: createJSONStorage(() => localStorage),
        // Persist ONLY drawer-open state; everything else refetches on reload.
        partialize: (state) => ({
          drawerOpenByDiagram: state.drawerOpenByDiagram,
        }),
      }
    ),
    { name: "apollon-version-store" }
  )
)
