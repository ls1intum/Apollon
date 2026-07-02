import { useReactFlow, useStore } from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import { Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react"
import { useDiagramStore, useOverlayStore } from "@/store/context"
import { insetAwareFitView } from "@/overlay/fitView"
import { Tooltip } from "@/components/ui"
import { useLabels } from "@/i18n/useLabels"
import { useRovingToolbar } from "../useRovingToolbar"

export interface ZoomControlsProps {
  /** Show the undo / redo island (when an undo manager exists). Default `true`. */
  history?: boolean
}

/**
 * The bottom-left zoom / history cluster: two glass islands in one roving toolbar.
 * View reads [zoom-out][%-reset][zoom-in][fit] (Excalidraw muscle memory); history
 * ([undo][redo]) is a SEPARATE island a gap away, not crammed behind a hairline.
 * Rendered as a slotted overlay control so it shares the one inset-aware layout;
 * the fit button reserves the current insets so content frames clear of the chrome.
 *
 * `history: false` drops the history island. One `role="toolbar"` spans both
 * islands (≥3 controls, APG-valid) so a single Tab stop + arrows rove every button.
 */
export function ZoomControls({ history = true }: ZoomControlsProps) {
  const rf = useReactFlow()
  const t = useLabels()
  const zoomLevelPercent = Math.round(useStore((s) => s.transform[2]) * 100)
  const insets = useOverlayStore((s) => s.insets)

  const { canUndo, canRedo, undo, redo, undoManagerExist } = useDiagramStore(
    useShallow((state) => ({
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      undo: state.undo,
      redo: state.redo,
      undoManagerExist: state.undoManager !== null,
    }))
  )

  const { ref: toolbarRef, onKeyDown: onToolbarKeyDown } =
    useRovingToolbar<HTMLDivElement>()

  return (
    <div
      ref={toolbarRef}
      onKeyDown={onToolbarKeyDown}
      className="apollon-chrome-toolbar"
      role="toolbar"
      aria-label={t.zoomToolbar}
      aria-orientation="horizontal"
    >
      <div className="apollon-chrome-cluster">
        <Tooltip title={t.zoomOut}>
          <button
            type="button"
            className="apollon-chrome-iconbtn"
            onClick={() => rf.zoomOut()}
            aria-label={t.zoomOut}
          >
            <ZoomOut width={18} height={18} aria-hidden="true" />
          </button>
        </Tooltip>
        {/* Clickable zoom readout — resets to 100% (Figma/Excalidraw). */}
        <Tooltip title={t.resetZoom}>
          <button
            type="button"
            className="apollon-chrome-iconbtn apollon-chrome-iconbtn--readout"
            onClick={() => rf.zoomTo(1)}
            aria-label={t.zoomReadout(zoomLevelPercent)}
          >
            {zoomLevelPercent}%
          </button>
        </Tooltip>
        <Tooltip title={t.zoomIn}>
          <button
            type="button"
            className="apollon-chrome-iconbtn"
            onClick={() => rf.zoomIn()}
            aria-label={t.zoomIn}
          >
            <ZoomIn width={18} height={18} aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip title={t.fitView}>
          <button
            type="button"
            className="apollon-chrome-iconbtn"
            onClick={() => insetAwareFitView(rf, insets)}
            aria-label={t.fitView}
          >
            <Maximize width={18} height={18} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>

      {history && undoManagerExist && (
        <div className="apollon-chrome-cluster">
          <Tooltip title={t.undoHint}>
            <span>
              <button
                type="button"
                className="apollon-chrome-iconbtn"
                onClick={undo}
                disabled={!canUndo}
                aria-label={t.undo}
              >
                <Undo2 width={18} height={18} aria-hidden="true" />
              </button>
            </span>
          </Tooltip>
          <Tooltip title={t.redoHint}>
            <span>
              <button
                type="button"
                className="apollon-chrome-iconbtn"
                onClick={redo}
                disabled={!canRedo}
                aria-label={t.redo}
              >
                <Redo2 width={18} height={18} aria-hidden="true" />
              </button>
            </span>
          </Tooltip>
        </div>
      )}
    </div>
  )
}
