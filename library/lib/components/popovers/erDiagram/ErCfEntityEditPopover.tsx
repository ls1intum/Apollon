import { NodeStyleEditor } from "@/components"
import { useDiagramStore } from "@/store"
import { ErCfEntityProps } from "@/types"
import { useShallow } from "zustand/shallow"
import { PopoverProps } from "../types"
import { ErCfColumnList } from "./ErCfColumnList"

// Crow's-foot entity: a table whose columns carry a name, data type and key
// role(s) — edited through the structured column list.
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
      <ErCfColumnList nodeId={elementId} />
    </>
  )
}
