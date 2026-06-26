import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { PopoverProps } from "../types"
import { GiveFeedbackAssessmentBox } from "../GiveFeedbackAssessmentBox"
import { Button } from "@tumaet/ui/components/button"
import { useGoToNextAssessment } from "@/hooks"
import { PopoverLayout } from "../PopoverLayout"

export const EdgeGiveFeedbackPopover = ({ elementId }: PopoverProps) => {
  const edges = useDiagramStore(useShallow((state) => state.edges))
  const handleGoToNextAssessment = useGoToNextAssessment(elementId)

  const edge = edges.find((edge) => edge.id === elementId)
  if (!edge) return null

  const edgeType = edge.type
  return (
    <PopoverLayout>
      <GiveFeedbackAssessmentBox
        elementId={elementId}
        name={edgeType ?? ""}
        type={edgeType ?? ""}
        typeLabel="Edge"
      />

      <Button variant="outline" onClick={handleGoToNextAssessment}>
        Next Assessment
      </Button>
    </PopoverLayout>
  )
}
