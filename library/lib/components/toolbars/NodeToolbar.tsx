import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useHandleDelete } from "@/hooks/useHandleDelete"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import { usePopoverStore } from "@/store"
import { ButtonGroup, IconButton } from "@/components/ui"
import { useLabels } from "@/i18n/useLabels"
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
  const t = useLabels()

  return (
    <ReactFlowNodeToolbar
      isVisible={isDiagramModifiable && !!selected}
      position={Position.Top}
      align="end"
      offset={10}
      className="apollon-element-toolbar-host"
      style={{ pointerEvents: "none" }}
    >
      <ButtonGroup
        aria-label={t.selectionActions}
        orientation="vertical"
        className="apollon-element-toolbar nodrag nopan"
        onPointerDownCapture={(event) => event.stopPropagation()}
        onMouseDownCapture={(event) => event.stopPropagation()}
        onTouchStartCapture={(event) => event.stopPropagation()}
      >
        <IconButton
          ariaLabel={t.deleteElement}
          tooltip={t.deleteElement}
          onClick={handleDelete}
        >
          <Trash2 width={16} height={16} aria-hidden="true" />
        </IconButton>

        {showEdit && (
          <IconButton
            ariaLabel={t.editElement}
            tooltip={t.editElement}
            onClick={() => {
              setPopOverElementId(elementId)
            }}
          >
            <Pencil width={16} height={16} aria-hidden="true" />
          </IconButton>
        )}
      </ButtonGroup>
    </ReactFlowNodeToolbar>
  )
}
