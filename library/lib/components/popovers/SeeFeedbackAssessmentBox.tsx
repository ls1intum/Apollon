import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { AssessmentScore } from "./AssessmentScore"
import { AssessmentHeader, PopoverSection } from "./PopoverLayout"
import { useLabels } from "@/i18n/useLabels"

export const SeeFeedbackAssessmentBox = ({
  type,
  typeLabel,
  name,
  elementId,
  divider = false,
}: {
  type: string
  /** Display-only label for the header (e.g. "Edge"). Defaults to `type`. */
  typeLabel?: string
  name: string
  elementId: string
  /** Draw a separator above this box. Off for the first box in a popover. */
  divider?: boolean
}) => {
  const t = useLabels()
  const getAssessment = useDiagramStore(
    useShallow((state) => state.getAssessment)
  )
  const assessment = getAssessment(elementId)

  // Three states the reader must be able to tell apart, each visually distinct:
  //   no assessment   -> "Not graded" badge, no feedback line
  //   graded, no note -> tone badge + muted "No comment"
  //   graded, note    -> tone badge + the feedback text
  return (
    <PopoverSection divider={divider}>
      <AssessmentHeader type={typeLabel ?? type} name={name} />
      <AssessmentScore score={assessment?.score} />
      {assessment &&
        (assessment.feedback ? (
          <p data-slot="assessment-feedback">{assessment.feedback}</p>
        ) : (
          <p data-slot="assessment-feedback" data-empty="">
            {t.noComment}
          </p>
        ))}
    </PopoverSection>
  )
}
