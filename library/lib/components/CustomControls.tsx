import { Controls, useReactFlow, useStore } from "@xyflow/react"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { Redo2, Undo2 } from "lucide-react"
import { Tooltip } from "@/components/ui"

/**
 * Bottom-left control cluster. Every button shares one idiom
 * (`apollon-chrome-iconbtn`): borderless on the glass pane, state shown as a
 * surface-layer fill. Reads left→right as view (zoom-out/in, fit, a clickable
 * %-reset) then, past a hairline, history (undo/redo). React Flow renders its
 * built-in zoom/fit buttons first; our children follow.
 */
export const CustomControls = () => {
  const { zoomTo } = useReactFlow()
  const zoomLevel = useStore((state) => state.transform[2])
  const zoomLevelPercent = Math.round(zoomLevel * 100)

  const { canUndo, canRedo, undo, redo, undoManagerExist } = useDiagramStore(
    useShallow((state) => ({
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      undo: state.undo,
      redo: state.redo,
      undoManagerExist: state.undoManager !== null,
    }))
  )

  return (
    <Controls
      orientation="horizontal"
      showInteractive={false}
      style={{ display: "flex", gap: 2, alignItems: "center" }}
    >
      {/* Clickable zoom readout — resets to 100% (Figma/Excalidraw pattern). */}
      <Tooltip title="Reset zoom to 100%">
        <button
          type="button"
          className="apollon-chrome-iconbtn apollon-chrome-iconbtn--readout"
          onClick={() => zoomTo(1)}
        >
          {zoomLevelPercent}%
        </button>
      </Tooltip>

      {undoManagerExist && (
        <div className="apollon-chrome-cluster-divider" aria-hidden />
      )}

      {undoManagerExist && (
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
      )}
      {undoManagerExist && (
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
      )}
    </Controls>
  )
}
