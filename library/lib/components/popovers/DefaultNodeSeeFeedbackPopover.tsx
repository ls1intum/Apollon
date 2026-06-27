import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { DefaultNodeProps } from "@/types"
import { PopoverProps } from "./types"
import { SeeFeedbackAssessmentBox } from "./SeeFeedbackAssessmentBox"
import { useGoToNextAssessment } from "@/hooks"
import { nodeTypeLabel } from "@/utils/nodeUtils"
import { Button } from "@tumaet/ui/components/button"
import { PopoverLayout } from "./PopoverLayout"

export const DefaultNodeSeeFeedbackPopover = ({ elementId }: PopoverProps) => {
  const nodes = useDiagramStore(useShallow((state) => state.nodes))
  const handleGoToNextAssessment = useGoToNextAssessment(elementId)

  const node = nodes.find((node) => node.id === elementId)
  if (!node) return null

  const nodeData = node.data as DefaultNodeProps

  return (
    <PopoverLayout>
      <SeeFeedbackAssessmentBox
        elementId={elementId}
        name={nodeData.name}
        type={node.type || "Node"}
        typeLabel={nodeTypeLabel(node.type)}
      />
      <Button variant="outline" onClick={handleGoToNextAssessment}>
        Next Assessment
      </Button>
    </PopoverLayout>
  )
}
