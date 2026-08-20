import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { PopoverProps } from "../types"
import { SeeFeedbackAssessmentBox } from "../SeeFeedbackAssessmentBox"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout } from "../PopoverLayout"

export const EdgeSeeFeedbackPopover = ({ elementId }: PopoverProps) => {
  const edges = useDiagramStore(useShallow((state) => state.edges))
  const t = useLabels()

  const edge = edges.find((edge) => edge.id === elementId)
  if (!edge) return null

  return (
    <PopoverLayout>
      <SeeFeedbackAssessmentBox
        elementId={elementId}
        name={edge.type ?? ""}
        type={edge.type ?? ""}
        typeLabel={t.edge}
      />
    </PopoverLayout>
  )
}
