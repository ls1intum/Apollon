import { StereotypeButtonGroup, NodeStyleEditor } from "@/components"
import { useDiagramStore } from "@/store"
import { ClassNodeProps } from "@/types"
import { useShallow } from "zustand/shallow"
import { EditableAttributeList } from "./EditableAttributesList"
import { EditableMethodsList } from "./EditableMethodsList"
import { PopoverProps } from "../types"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const ClassEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const t = useLabels()
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
    <PopoverLayout title={t.class}>
      <NodeStyleEditor
        nodeData={nodeData}
        colorEditorLabel="class"
        handleDataFieldUpdate={handleDataFieldUpdate}
      />
      <PopoverSection title={t.stereotype} divider>
        <StereotypeButtonGroup
          nodeId={elementId}
          selectedStereotype={nodeData.stereotype}
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
