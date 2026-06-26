import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { DefaultNodeProps } from "@/types"
import { PopoverProps } from "./types"
import { GiveFeedbackAssessmentBox } from "./GiveFeedbackAssessmentBox"
import { Button } from "@tumaet/ui/components/button"
import { useGoToNextAssessment } from "@/hooks"
import { PopoverLayout } from "./PopoverLayout"

export const DefaultNodeGiveFeedbackPopover = ({ elementId }: PopoverProps) => {
  const { nodes } = useDiagramStore(
    useShallow((state) => ({ nodes: state.nodes }))
  )
  const handleGoToNextAssessment = useGoToNextAssessment(elementId)

  const node = nodes.find((node) => node.id === elementId)
  if (!node) return null

  const nodeData = node.data as DefaultNodeProps

  return (
    <PopoverLayout>
      <GiveFeedbackAssessmentBox
        elementId={elementId}
        name={nodeData.name}
        type={node.type || "Node"} //fallback to node is never expected since all nodes should have a type
      />
      <Button variant="outline" onClick={handleGoToNextAssessment}>
        Next Assessment
      </Button>
    </PopoverLayout>
  )
}
