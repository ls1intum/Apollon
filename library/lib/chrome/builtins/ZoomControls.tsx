import { useReactFlow, useStore } from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import { Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react"
import { useDiagramStore, useOverlayStore } from "@/store/context"
import { insetAwareFitView } from "@/overlay/fitView"
import { Tooltip } from "@/components/ui"
import { useRovingToolbar } from "../useRovingToolbar"
import type { ZoomProps } from "../config"

/**
 * The bottom-left zoom / history cluster, rendered as a slotted overlay control
 * (not a self-positioning React Flow `<Controls>` panel) so it shares the one
 * inset-aware layout with every other control. Every button uses the borderless
 * `apollon-chrome-iconbtn` idiom; it reads left→right as view (zoom out/in, fit,
 * a clickable %-reset) then, past a hairline, history (undo / redo). The fit
 * button reserves the current overlay insets so it frames content clear of the
 * chrome, exactly like the imperative `ApollonEditor.fitView`.
 *
 * `showZoom` / `showHistory` (from the public `controls.zoom.props`) drop either
 * family; hiding both leaves an empty cluster the caller almost certainly meant
 * to hide via `controls.zoom: false` instead.
 */
export function ZoomControls({
  showZoom = true,
  showHistory = true,
}: ZoomProps) {
  const rf = useReactFlow()
  const zoomLevel = useStore((state) => state.transform[2])
  const zoomLevelPercent = Math.round(zoomLevel * 100)
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
      className="apollon-chrome-cluster"
      role="toolbar"
      aria-label="Zoom and history controls"
      aria-orientation="horizontal"
      style={{ display: "flex", gap: 2, alignItems: "center" }}
    >
      {showZoom && (
        <>
          <Tooltip title="Zoom out">
            <button
              type="button"
              className="apollon-chrome-iconbtn"
              onClick={() => rf.zoomOut()}
              aria-label="Zoom out"
            >
              <ZoomOut width={18} height={18} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip title="Zoom in">
            <button
              type="button"
              className="apollon-chrome-iconbtn"
              onClick={() => rf.zoomIn()}
              aria-label="Zoom in"
            >
              <ZoomIn width={18} height={18} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip title="Fit view">
            <button
              type="button"
              className="apollon-chrome-iconbtn"
              onClick={() => insetAwareFitView(rf, insets)}
              aria-label="Fit view"
            >
              <Maximize width={18} height={18} aria-hidden="true" />
            </button>
          </Tooltip>

          {/* Clickable zoom readout — resets to 100% (Figma/Excalidraw). */}
          <Tooltip title="Reset zoom to 100%">
            <button
              type="button"
              className="apollon-chrome-iconbtn apollon-chrome-iconbtn--readout"
              onClick={() => rf.zoomTo(1)}
              aria-label={`Zoom is ${zoomLevelPercent}%, reset to 100%`}
            >
              {zoomLevelPercent}%
            </button>
          </Tooltip>
        </>
      )}

      {showHistory && undoManagerExist && (
        <>
          {showZoom && (
            <div className="apollon-chrome-cluster-divider" aria-hidden />
          )}
          <Tooltip title="Undo (Ctrl+Z)">
            <span>
              <button
                type="button"
                className="apollon-chrome-iconbtn"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
              >
                <Undo2 width={18} height={18} aria-hidden="true" />
              </button>
            </span>
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y or Ctrl+Shift+Z)">
            <span>
              <button
                type="button"
                className="apollon-chrome-iconbtn"
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
              >
                <Redo2 width={18} height={18} aria-hidden="true" />
              </button>
            </span>
          </Tooltip>
        </>
      )}
    </div>
  )
}
