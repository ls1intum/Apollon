import { NodeStyleEditor } from "@/components/styleEditor"
import { useDiagramStore } from "@/store"
import { ObjectNodeProps } from "@/types"
import { useShallow } from "zustand/shallow"
import { EditableAttributeList } from "../classDiagram/EditableAttributesList"
import { EditableMethodsList } from "../classDiagram/EditableMethodsList"
import { PopoverProps } from "../types"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const ObjectEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      setNodes: state.setNodes,
    }))
  )

  const node = nodes.find((node) => node.id === elementId)
  if (!node) {
    return null
  }

  const nodeData = node.data as ObjectNodeProps

  const handleDataFieldUpdate = (key: string, value: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              [key]: value,
            },
          }
        }
        return node
      })
    )
  }

  return (
    <PopoverLayout title="Object">
      <NodeStyleEditor
        nodeData={nodeData}
        colorEditorLabel="object"
        handleDataFieldUpdate={handleDataFieldUpdate}
      />
      <PopoverSection divider>
        <EditableAttributeList nodeId={elementId} />
      </PopoverSection>
      <PopoverSection divider>
        <EditableMethodsList nodeId={elementId} />
      </PopoverSection>
    </PopoverLayout>
  )
}
