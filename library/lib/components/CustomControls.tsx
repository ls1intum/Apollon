import { Controls, useReactFlow, useStore } from "@xyflow/react"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { UndoIcon } from "./Icon/UndoIcon"
import { RedoIcon } from "./Icon/RedoIcon"
import { Tooltip } from "@mui/material"

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
                    ? "var(--apollon-primary-contrast)"
                    : "var(--apollon-secondary)"
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
                    ? "var(--apollon-primary-contrast)"
                    : "var(--apollon-secondary)"
                }
              />
            </button>
          </span>
        </Tooltip>
      )}
      <div
        style={{
          userSelect: "none",
          border: "1px solid var(--apollon-primary-contrast)",
          borderRadius: 8,
          paddingLeft: 4,
          paddingRight: 4,
          cursor: "pointer",
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--apollon-primary-contrast)",
        }}
        onClick={() => zoomTo(1)}
      >
        {zoomLevelPercent}%
      </div>
    </Controls>
  )
}
