import { useDiagramStore } from "@/store"
import { CommunicationObjectNodeProps } from "@/types"
import { useShallow } from "zustand/shallow"
import { EditableAttributeList } from "../classDiagram/EditableAttributesList"
import { EditableMethodsList } from "../classDiagram/EditableMethodsList"
import { PopoverProps } from "../types"
import { NodeStyleEditor } from "@/components/styleEditor"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const CommunicationObjectNameEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
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

  const nodeData = node.data as CommunicationObjectNodeProps

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
    <PopoverLayout title={t.object}>
      <NodeStyleEditor
        nodeData={nodeData}
        colorEditorLabel={t.communicationObjectWord}
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
