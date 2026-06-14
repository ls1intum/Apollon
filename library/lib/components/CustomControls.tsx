import { Controls, useReactFlow, useStore } from "@xyflow/react"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { Minus, Plus, Maximize } from "lucide-react"
import { UndoIcon } from "./Icon/UndoIcon"
import { RedoIcon } from "./Icon/RedoIcon"
import { Tooltip } from "@/components/ui"

export const CustomControls = () => {
  const { zoomTo, zoomIn, zoomOut, fitView } = useReactFlow()
  const zoomLevel = useStore((state) => state.transform[2])
  const minZoom = useStore((state) => state.minZoom)
  const maxZoom = useStore((state) => state.maxZoom)
  const zoomLevelPercent = Math.round(zoomLevel * 100)
  const canZoomOut = zoomLevel > minZoom
  const canZoomIn = zoomLevel < maxZoom

  const { canUndo, canRedo, undo, redo, undoManagerExist } = useDiagramStore(
    useShallow((state) => ({
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      undo: state.undo,
      redo: state.redo,
      undoManagerExist: state.undoManager !== null,
    }))
  )

  const handleUndo = () => {
    undo()
  }

  const handleRedo = () => {
    redo()
  }

  return (
    <Controls
      orientation="horizontal"
      showInteractive={false}
      showZoom={false}
      showFitView={false}
      style={{ display: "flex", gap: 4, alignItems: "center" }}
    >
      {/* Undo Button */}
      {undoManagerExist && (
        <Tooltip title="Undo (Ctrl+Z)">
          <span>
            <button
              className={`control-button ${!canUndo ? "disabled" : ""}`}
              onClick={handleUndo}
              disabled={!canUndo}
            >
              <UndoIcon
                width={16}
                height={16}
                fill={
                  canUndo
                    ? "var(--apollon-primary-contrast, #000000)"
                    : "var(--apollon-secondary, #6c757d)"
                }
              />
            </button>
          </span>
        </Tooltip>
      )}
      {/* Redo Button */}
      {undoManagerExist && (
        <Tooltip title="Redo (Ctrl+Y or Ctrl+Shift+Z)">
          <span>
            <button
              className={`control-button ${!canRedo ? "disabled" : ""}`}
              onClick={handleRedo}
              disabled={!canRedo}
            >
              <RedoIcon
                width={16}
                height={16}
                fill={
                  canRedo
                    ? "var(--apollon-primary-contrast, #000000)"
                    : "var(--apollon-secondary, #6c757d)"
                }
              />
            </button>
          </span>
        </Tooltip>
      )}
      {/* Zoom controls */}
      <div className="zoom-control-group">
        <Tooltip title="Zoom out">
          <span>
            <button
              className={`zoom-control-button ${!canZoomOut ? "disabled" : ""}`}
              onClick={() => zoomOut()}
              disabled={!canZoomOut}
              aria-label="Zoom out"
            >
              <Minus
                width={16}
                height={16}
                color="var(--apollon-primary-contrast, #000000)"
              />
            </button>
          </span>
        </Tooltip>
        <Tooltip title="Reset zoom to 100%">
          <button
            className="zoom-control-label"
            onClick={() => zoomTo(1)}
            aria-label="Reset zoom to 100%"
          >
            {zoomLevelPercent}%
          </button>
        </Tooltip>
        <Tooltip title="Zoom in">
          <span>
            <button
              className={`zoom-control-button ${!canZoomIn ? "disabled" : ""}`}
              onClick={() => zoomIn()}
              disabled={!canZoomIn}
              aria-label="Zoom in"
            >
              <Plus
                width={16}
                height={16}
                color="var(--apollon-primary-contrast, #000000)"
              />
            </button>
          </span>
        </Tooltip>
      </div>
      {/* Fit view */}
      <Tooltip title="Fit to view">
        <button
          className="control-button"
          onClick={() => fitView({ padding: 0.1, duration: 200 })}
          aria-label="Fit to view"
        >
          <Maximize
            width={16}
            height={16}
            color="var(--apollon-primary-contrast, #000000)"
          />
        </button>
      </Tooltip>
    </Controls>
  )
}
