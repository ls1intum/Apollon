import { create } from "zustand"
import { devtools, persist, createJSONStorage } from "zustand/middleware"
import type { UMLModel } from "@tumaet/apollon"

type DiagramId = string
type VersionId = string

/**
 * CLIENT-ONLY state for the versioning feature. Server state (the version
 * list, bodies, totals, loading/error) lives in the TanStack Query cache —
 * see `src/queries/`. Anything that comes from the network does NOT belong in
 * this store; add it as a query or mutation instead.
 *
 * What remains here is user intent that must be readable synchronously and
 * outside React (the autosaver's pause check and the WS control handler both
 * read via `getState()`):
 *   - which drawers are open (persisted),
 *   - the active read-only preview overlay,
 *   - the post-restore undo window,
 *   - the in-flight-restore marker used to classify WS events as self-caused.
 */

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
  preview: PreviewState | null
  /** When set, surfaces an "undo restore" snackbar in the UI. */
  undoRestore: UndoRestoreState | null
  /**
   * Set by the restore mutations' `onMutate` — i.e. before the request
   * leaves — so the control-event handler can detect self-triggered
   * VERSION_RESTORED events. The WebSocket event typically arrives before
   * the HTTP response, so checking `undoRestore` alone would miss the window.
   */
  pendingRestoreFromId: VersionId | null
}

interface Actions {
  // ---- Drawer -----------------------------------------------------------
  openDrawer: (diagramId: DiagramId) => void
  closeDrawer: (diagramId: DiagramId) => void
  /** Open the panel and ask it to save a version now. */
  requestSave: (diagramId: DiagramId) => void
  /** Mark the pending save request handled. */
  clearSaveRequest: (diagramId: DiagramId) => void

  // ---- Preview ----------------------------------------------------------
  /**
   * Synchronous setter — the caller fetches the body through the query cache
   * first (`fetchVersionBody`), so preview entry shares one cached body with
   * thumbnails and dirty-check baselines.
   */
  enterPreview: (
    diagramId: DiagramId,
    versionId: VersionId,
    body: UMLModel
  ) => void
  exitPreview: () => void

  // ---- Restore bookkeeping (driven by the restore mutations) ------------
  beginRestore: (versionId: VersionId) => void
  completeRestore: (undo: Omit<UndoRestoreState, "expiresAt">) => void
  cancelRestore: () => void
  dismissUndoRestore: () => void
}

export type VersionStore = State & Actions

export const UNDO_WINDOW_MS = 10_000

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
      (set) => ({
        drawerOpenByDiagram: {},
        saveRequestByDiagram: {},
        preview: null,
        undoRestore: null,
        pendingRestoreFromId: null,

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

        // ---- Preview ---------------------------------------------------------
        enterPreview: (diagramId, versionId, body) =>
          set({ preview: { diagramId, versionId, body } }),
        exitPreview: () => set({ preview: null }),

        // ---- Restore bookkeeping --------------------------------------------
        beginRestore: (versionId) => set({ pendingRestoreFromId: versionId }),
        completeRestore: (undo) =>
          set({
            preview: null,
            pendingRestoreFromId: null,
            undoRestore: { ...undo, expiresAt: Date.now() + UNDO_WINDOW_MS },
          }),
        cancelRestore: () => set({ pendingRestoreFromId: null }),
        dismissUndoRestore: () => set({ undoRestore: null }),
      }),
      {
        name: "apollon-version-store",
        storage: createJSONStorage(() => localStorage),
        // Persist ONLY drawer-open state; everything else is per-session.
        partialize: (state) => ({
          drawerOpenByDiagram: state.drawerOpenByDiagram,
        }),
      }
    ),
    { name: "apollon-version-store" }
  )
)
