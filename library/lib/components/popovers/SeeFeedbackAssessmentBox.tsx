import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { AssessmentScore } from "./AssessmentScore"
import { PopoverSection } from "./PopoverLayout"
import { useLabels } from "@/i18n/useLabels"
import { Typography } from "../ui"
import { defaultTitleFor, toneForScore } from "./assessmentTitle"

/** Gap between controls within the header row (title + score pill). */
const ROW_GAP = 8

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
  const typeText = typeLabel ?? type

  // Same reference-row / title-row split as the give-feedback box, kept read-only:
  // a title, defaulting the same way (by score sign) when the assessor left it
  // blank, sits next to the score pill instead of a plain "Assessment for X" line.
  const title = assessment
    ? assessment.title || defaultTitleFor(toneForScore(assessment.score), t)
    : t.notGraded

  // Three states the reader must be able to tell apart, each visually distinct:
  //   no assessment   -> "Not graded" title + badge, no feedback line
  //   graded, no note -> title + tone badge + muted "No comment"
  //   graded, note    -> title + tone badge + the feedback text
  return (
    <PopoverSection divider={divider}>
      <Typography
        variant="caption"
        style={{ opacity: 0.7, display: "flex", alignItems: "center", gap: 4 }}
      >
        {typeText}
        <span data-slot="assessment-name-chip">{name}</span>
      </Typography>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: ROW_GAP,
        }}
      >
        <Typography variant="subtitle2" style={{ fontWeight: 600, flex: 1 }}>
          {title}
        </Typography>
        <AssessmentScore score={assessment?.score} />
      </div>
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
