import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { PopoverProps } from "../types"
import { GiveFeedbackAssessmentBox } from "../GiveFeedbackAssessmentBox"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout } from "../PopoverLayout"

export const EdgeGiveFeedbackPopover = ({ elementId }: PopoverProps) => {
  const edges = useDiagramStore(useShallow((state) => state.edges))
  const t = useLabels()

  const edge = edges.find((edge) => edge.id === elementId)
  if (!edge) return null

  const edgeType = edge.type
  return (
    <PopoverLayout>
      <GiveFeedbackAssessmentBox
        elementId={elementId}
        name={edgeType ?? ""}
        elementType="edge"
        typeLabel={t.edge}
      />
    </PopoverLayout>
  )
}
