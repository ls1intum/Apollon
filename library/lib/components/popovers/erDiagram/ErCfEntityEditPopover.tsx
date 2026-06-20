import { NodeStyleEditor } from "@/components"
import { useDiagramStore } from "@/store"
import { ErCfEntityProps } from "@/types"
import { useShallow } from "zustand/shallow"
import { PopoverProps } from "../types"
import { EditableAttributeList } from "../classDiagram/EditableAttributesList"

// Crow's-foot entity: a table with editable attribute (column) rows. Reuses the
// class diagram's attribute list since both store `data.attributes`.
export const ErCfEntityEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({ nodes: state.nodes, setNodes: state.setNodes }))
  )

  const node = nodes.find((n) => n.id === elementId)
  if (!node) {
    return null
  }
  const nodeData = node.data as ErCfEntityProps

  const handleDataFieldUpdate = (key: string, value: string) =>
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === elementId ? { ...n, data: { ...n.data, [key]: value } } : n
      )
    )

  return (
    <>
      <NodeStyleEditor
        nodeData={nodeData}
        handleDataFieldUpdate={handleDataFieldUpdate}
      />
      <EditableAttributeList nodeId={elementId} />
    </>
  )
}
