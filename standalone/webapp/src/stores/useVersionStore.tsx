import { create } from "zustand"
import { devtools, persist, createJSONStorage } from "zustand/middleware"
import type { UMLModel } from "@tumaet/apollon"
import { ApiError, VersionApiClient } from "@/services/DiagramApiClient"
import { log } from "@/logger"
import type { ApiErrorCode, ControlEvent, VersionSummary } from "@/types"

type DiagramId = string
type VersionId = string

interface CompareState {
  baseline: VersionId | "current"
  comparand: VersionId | "current"
}

export interface PendingVersion extends VersionSummary {
  pending?: true
  failed?: boolean
}

export interface PreviewState {
  versionId: VersionId
  body: UMLModel
  /** The diagram body we observed BEFORE entering preview, for clean exit. */
  headSnapshot: UMLModel
}

export interface UndoRestoreState {
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
  preview: PreviewState | null
  /** When set, surfaces an "undo restore" snackbar in the UI. */
  undoRestore: UndoRestoreState | null
  /** When non-null, comparison banner is active. */
  compare: CompareState | null
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
   * Optimistic create. Adds a pending row with a client-generated temp id,
   * then reconciles with the server response (matched by name+timestamp).
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
  enterPreview: (
    diagramId: DiagramId,
    versionId: VersionId,
    headSnapshot: UMLModel
  ) => Promise<void>
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

  // ---- Compare ----------------------------------------------------------
  startCompare: (
    diagramId: DiagramId,
    baseline: VersionId | "current",
    comparand?: VersionId | "current"
  ) => void
  swapCompare: () => void
  closeCompare: () => void

  // ---- Realtime ---------------------------------------------------------
  applyControlEvent: (diagramId: DiagramId, event: ControlEvent) => void
}

export type VersionStore = State & Actions

const UNDO_WINDOW_MS = 10_000

export const useVersionStore = create<VersionStore>()(
  devtools(
    persist(
      (set, get) => ({
        drawerOpenByDiagram: {},
        versions: {},
        nextCursor: {},
        preview: null,
        undoRestore: null,
        compare: null,
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
            const { versions, nextCursor } = await VersionApiClient.list(
              diagramId,
              { limit: 25 }
            )
            set((s) => ({
              versions: { ...s.versions, [diagramId]: versions },
              nextCursor: { ...s.nextCursor, [diagramId]: nextCursor },
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
          const { versions, nextCursor } = await VersionApiClient.list(
            diagramId,
            { limit: 25, before: cursor }
          )
          set((s) => ({
            versions: {
              ...s.versions,
              [diagramId]: [...(s.versions[diagramId] ?? []), ...versions],
            },
            nextCursor: { ...s.nextCursor, [diagramId]: nextCursor },
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
            const summary = await VersionApiClient.create(diagramId, body, opts)
            set((s) => ({
              versions: {
                ...s.versions,
                [diagramId]: (s.versions[diagramId] ?? []).map((v) =>
                  v.id === tempId ? summary : v
                ),
              },
            }))
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
        enterPreview: async (diagramId, versionId, headSnapshot) => {
          const body = await VersionApiClient.getBody(diagramId, versionId)
          set({ preview: { versionId, body, headSnapshot } })
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

        // ---- Compare --------------------------------------------------------
        startCompare: (_diagramId, baseline, comparand = "current") =>
          set({ compare: { baseline, comparand } }),
        swapCompare: () =>
          set((s) =>
            s.compare
              ? {
                  compare: {
                    baseline: s.compare.comparand,
                    comparand: s.compare.baseline,
                  },
                }
              : s
          ),
        closeCompare: () => set({ compare: null }),

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
            default:
              // Forward-compat: a future server may add new event types. Log
              // and ignore so the build doesn't break older clients during a
              // staggered rollout.
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
    { name: "Apollon Version Store DevTools" }
  )
)
