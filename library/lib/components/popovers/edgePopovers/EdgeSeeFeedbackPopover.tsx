import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { PopoverProps } from "../types"
import { SeeFeedbackAssessmentBox } from "../SeeFeedbackAssessmentBox"
import { useGoToNextAssessment } from "@/hooks"
import { Button } from "@tumaet/ui/components/button"
import { PopoverLayout } from "../PopoverLayout"

export const EdgeSeeFeedbackPopover = ({ elementId }: PopoverProps) => {
  const edges = useDiagramStore(useShallow((state) => state.edges))
  const handleGoToNextAssessment = useGoToNextAssessment(elementId)

  const edge = edges.find((edge) => edge.id === elementId)
  if (!edge) return null

  return (
    <PopoverLayout>
      <SeeFeedbackAssessmentBox
        elementId={elementId}
        name={edge.type ?? ""}
        type={edge.type ?? ""}
        typeLabel="Edge"
      />
      <Button variant="outline" onClick={handleGoToNextAssessment}>
        Next Assessment
      </Button>
    </PopoverLayout>
  )
}
