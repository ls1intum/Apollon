import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { AssessmentScore } from "./AssessmentScore"
import { AssessmentReference, PopoverSection } from "./PopoverLayout"
import { useLabels } from "@/i18n/useLabels"
import { Typography } from "../ui"
import { AssessmentTitleBadge } from "./AssessmentTitleBadge"
import { assessmentTone, defaultAssessmentTitle } from "@/utils/assessmentTitle"
import { gradingInstructionOf } from "@/utils/gradingInstruction"

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
  const tone = assessmentTone(assessment?.score ?? 0)
  const feedbackText =
    assessment?.feedback || gradingInstructionOf(assessment)?.feedback

  // Three states the reader must be able to tell apart, each visually distinct:
  //   no assessment   -> "Not graded" badge, no feedback line
  //   graded, no note -> title + tone badge + muted "No comment"
  //   graded, note    -> title + tone badge + the feedback text
  return (
    <PopoverSection divider={divider}>
      <AssessmentReference type={typeLabel ?? type} name={name} />
      <div
        data-slot="assessment-title-row"
        data-tone={assessment ? tone : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {assessment && (
          <>
            <AssessmentTitleBadge tone={tone} />
            <Typography
              variant="subtitle2"
              style={{
                fontWeight: 600,
                flex: 1,
                minWidth: 0,
                overflowWrap: "anywhere",
              }}
            >
              {assessment.title?.trim() || defaultAssessmentTitle(tone, t)}
            </Typography>
          </>
        )}
        <AssessmentScore score={assessment?.score} />
      </div>
      {assessment &&
        (feedbackText ? (
          <p data-slot="assessment-feedback">{feedbackText}</p>
        ) : (
          <p data-slot="assessment-feedback" data-empty="">
            {t.noComment}
          </p>
        ))}
    </PopoverSection>
  )
}
