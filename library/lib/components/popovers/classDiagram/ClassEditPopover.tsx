import { StereotypeButtonGroup, NodeStyleEditor } from "@/components"
import { useDiagramStore } from "@/store"
import { ClassNodeProps } from "@/types"
import { useShallow } from "zustand/shallow"
import { EditableAttributeList } from "./EditableAttributesList"
import { EditableMethodsList } from "./EditableMethodsList"
import { PopoverProps } from "../types"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const ClassEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
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

  const nodeData = node.data as ClassNodeProps

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
    <PopoverLayout title="Class">
      <NodeStyleEditor
        nodeData={nodeData}
        colorEditorLabel="class"
        handleDataFieldUpdate={handleDataFieldUpdate}
      />
      <PopoverSection title="Stereotype" divider>
        <StereotypeButtonGroup
          nodeId={elementId}
          selectedStereotype={nodeData.stereotype}
          isAbstract={nodeData.isAbstract}
        />
      </PopoverSection>
      <PopoverSection divider>
        <EditableAttributeList nodeId={elementId} />
      </PopoverSection>
      <PopoverSection divider>
        <EditableMethodsList nodeId={elementId} />
      </PopoverSection>
    </PopoverLayout>
  )
}
