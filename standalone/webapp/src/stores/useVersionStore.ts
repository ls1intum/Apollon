import { create } from "zustand"
import { devtools, persist, createJSONStorage } from "zustand/middleware"
import { toast } from "react-toastify"
import type { UMLModel } from "@tumaet/apollon"
import { ApiError, VersionApiClient } from "@/services/DiagramApiClient"
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
  versionId: VersionId
  body: UMLModel
}

interface UndoRestoreState {
  diagramId: DiagramId
  autoSnapshotVersionId: VersionId
  expiresAt: number
}

interface State {
  // Per-diagram persisted UI state.
  drawerOpenByDiagram: Record<DiagramId, boolean>
  // Per-diagram in-memory state (refetched on reload).
  versions: Record<DiagramId, PendingVersion[]>
  nextCursor: Record<DiagramId, string | undefined>
  /** Server-reported total count, independent of how many pages are loaded. */
  totals: Record<DiagramId, number>
  preview: PreviewState | null
  /** When set, surfaces an "undo restore" snackbar in the UI. */
  undoRestore: UndoRestoreState | null
  loading: boolean
  error: ApiErrorCode | null
}

interface Actions {
  // ---- Drawer -----------------------------------------------------------
  openDrawer: (diagramId: DiagramId) => void
  closeDrawer: (diagramId: DiagramId) => void
  isDrawerOpen: (diagramId: DiagramId) => boolean

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
  ) => Promise<VersionSummary>
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
  ) => Promise<{ autoSnapshotVersionId: VersionId }>
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

export const useVersionStore = create<VersionStore>()(
  devtools(
    persist(
      (set, get) => ({
        drawerOpenByDiagram: {},
        versions: {},
        nextCursor: {},
        totals: {},
        preview: null,
        undoRestore: null,
        loading: false,
        error: null,

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
        isDrawerOpen: (diagramId) =>
          Boolean(get().drawerOpenByDiagram[diagramId]),

        // ---- Versions --------------------------------------------------------
        fetchVersions: async (diagramId) => {
          set({ loading: true, error: null })
          try {
            const { versions, nextCursor, total } = await VersionApiClient.list(
              diagramId,
              { limit: 25 }
            )
            set((s) => ({
              versions: { ...s.versions, [diagramId]: versions },
              nextCursor: { ...s.nextCursor, [diagramId]: nextCursor },
              totals: { ...s.totals, [diagramId]: total },
              loading: false,
            }))
          } catch (err) {
            set({
              loading: false,
              error: err instanceof ApiError ? err.code : "INTERNAL",
            })
          }
        },

        loadMoreVersions: async (diagramId) => {
          const cursor = get().nextCursor[diagramId]
          if (!cursor) return
          const { versions, nextCursor, total } = await VersionApiClient.list(
            diagramId,
            { limit: 25, before: cursor }
          )
          set((s) => ({
            versions: {
              ...s.versions,
              [diagramId]: [...(s.versions[diagramId] ?? []), ...versions],
            },
            nextCursor: { ...s.nextCursor, [diagramId]: nextCursor },
            totals: { ...s.totals, [diagramId]: total },
          }))
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
            const result = await VersionApiClient.create(diagramId, body, opts)
            const { evictedVersionIds, evictedKinds, ...summary } = result
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
              const prevTotal = s.totals[diagramId]
              return {
                versions: { ...s.versions, [diagramId]: reconciled },
                totals: {
                  ...s.totals,
                  // Server returns `total = ZCARD` on list; we don't have a
                  // fresh value from POST, so derive: prev + 1 - evicted.
                  // Caps at MAX naturally because eviction count makes the
                  // delta zero once we're saturated.
                  [diagramId]:
                    typeof prevTotal === "number"
                      ? prevTotal + 1 - (evictedVersionIds?.length ?? 0)
                      : reconciled.filter((v) => !v.pending).length,
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
              if (namedCount > 0) {
                toast.warning(
                  namedCount === 1
                    ? `Saved. Your oldest named version was removed — the ${MAX_VERSIONS_PER_DIAGRAM}-version cap is full.`
                    : `Saved. ${namedCount} oldest named versions were removed — the ${MAX_VERSIONS_PER_DIAGRAM}-version cap is full.`,
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
            return summary
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
              error: err instanceof ApiError ? err.code : "INTERNAL",
            }))
            throw err
          }
        },

        editVersionInfo: async (diagramId, versionId, patch) => {
          const updated = await VersionApiClient.editInfo(
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
        },

        deleteVersion: async (diagramId, versionId) => {
          await VersionApiClient.delete(diagramId, versionId)
          set((s) => ({
            versions: {
              ...s.versions,
              [diagramId]: (s.versions[diagramId] ?? []).filter(
                (v) => v.id !== versionId
              ),
            },
          }))
        },

        // ---- Preview / Restore ----------------------------------------------
        enterPreview: async (diagramId, versionId) => {
          const body = await VersionApiClient.getBody(diagramId, versionId)
          set({ preview: { versionId, body } })
        },

        exitPreview: () => set({ preview: null }),

        restoreVersion: async (diagramId, versionId, currentBody) => {
          const { autoSnapshotVersionId } = await VersionApiClient.restore(
            diagramId,
            versionId,
            { currentBody }
          )
          set({
            preview: null,
            undoRestore: {
              diagramId,
              autoSnapshotVersionId,
              expiresAt: Date.now() + UNDO_WINDOW_MS,
            },
          })
          // Refresh to pick up the new auto-snapshot row.
          void get().fetchVersions(diagramId)
          return { autoSnapshotVersionId }
        },

        triggerUndoRestore: async (diagramId, currentBody) => {
          const undo = get().undoRestore
          if (!undo || undo.diagramId !== diagramId) return
          // Restore the auto-snapshot, passing the user's current canvas so the
          // undo's own pre-restore auto-snapshot captures whatever they're
          // looking at right now (e.g. small edits made after the original
          // restore). Without this, those edits would be silently discarded.
          await VersionApiClient.restore(
            diagramId,
            undo.autoSnapshotVersionId,
            { currentBody }
          )
          set({ undoRestore: null })
          void get().fetchVersions(diagramId)
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
