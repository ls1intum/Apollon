import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useHandleDelete } from "@/hooks/useHandleDelete"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import { usePopoverStore } from "@/store"
import { Position, NodeToolbar as ReactFlowNodeToolbar } from "@xyflow/react"
import { Pencil, Trash2 } from "lucide-react"
import { FC } from "react"
import { useShallow } from "zustand/shallow"

interface Props {
  elementId: string
  showEdit?: boolean
}
export const NodeToolbar: FC<Props> = ({ elementId, showEdit = true }) => {
  const setPopOverElementId = usePopoverStore(
    useShallow((state) => state.setPopOverElementId)
  )
  const handleDelete = useHandleDelete(elementId)

  const isDiagramModifiable = useDiagramModifiable()
  const selected = useIsOnlyThisElementSelected(elementId)

  return (
    <ReactFlowNodeToolbar
      isVisible={isDiagramModifiable && !!selected}
      position={Position.Top}
      align="end"
      offset={10}
    >
      <div
        className="nodrag nopan"
        onPointerDownCapture={(event) => event.stopPropagation()}
        onMouseDownCapture={(event) => event.stopPropagation()}
        onTouchStartCapture={(event) => event.stopPropagation()}
        style={{ display: "flex", gap: 8, flexDirection: "column" }}
      >
        <Trash2
          onClick={handleDelete}
          style={{
            cursor: "pointer",
            width: 16,
            height: 16,
            color: "var(--apollon-primary-contrast, #000000)",
          }}
        />

        {showEdit && (
          <Pencil
            onClick={() => {
              setPopOverElementId(elementId)
            }}
            style={{
              cursor: "pointer",
              width: 16,
              height: 16,
              color: "var(--apollon-primary-contrast, #000000)",
            }}
          />
        )}
      </div>
    </ReactFlowNodeToolbar>
  )
}
