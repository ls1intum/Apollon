import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { CommunicationObjectNodeProps } from "@/types"
import { PopoverProps } from "../types"
import { GiveFeedbackAssessmentBox } from "../GiveFeedbackAssessmentBox"
import { Button } from "@tumaet/ui/components/button"
import { useGoToNextAssessment } from "@/hooks"
import { DiagramNodeTypeRecord } from "@/nodes"
import { nodeTypeLabel } from "@/utils/nodeUtils"
import { PopoverLayout } from "../PopoverLayout"

export const CommunicationObjectNameGiveFeedbackPopover = ({
  elementId,
}: PopoverProps) => {
  const nodes = useDiagramStore(useShallow((state) => state.nodes))
  const handleGoToNextAssessment = useGoToNextAssessment(elementId)

  const node = nodes.find((node) => node.id === elementId)
  if (!node) return null

  const nodeData = node.data as CommunicationObjectNodeProps

  return (
    <PopoverLayout>
      <GiveFeedbackAssessmentBox
        elementId={elementId}
        name={nodeData.name}
        type={node.type || DiagramNodeTypeRecord.communicationObjectName}
        typeLabel={nodeTypeLabel(node.type)}
      />
      {nodeData.attributes.map((attr) => (
        <GiveFeedbackAssessmentBox
          key={attr.id}
          elementId={attr.id}
          name={attr.name}
          type="Attribute"
          divider
        />
      ))}
      {nodeData.methods.map((method) => (
        <GiveFeedbackAssessmentBox
          key={method.id}
          elementId={method.id}
          name={method.name}
          type="Method"
          divider
        />
      ))}
      <Button variant="outline" onClick={handleGoToNextAssessment}>
        Next Assessment
      </Button>
    </PopoverLayout>
  )
}
