import React from "react"
import { useLabels } from "@/i18n/useLabels"
import { assessmentTone } from "@/utils/assessmentTitle"

/**
 * The assessment score as a tone-coded pill: the signed points, or the word
 * "Not graded" when the element has no assessment.
 *
 * Tone (and thus colour) is derived from the score's sign and routed through the
 * [data-slot="assessment-score"][data-tone] rules in app.css — the SAME
 * --apollon-assessment-* ramp the canvas badge (AssessmentIcon) reads, so a
 * graded element looks identical in the popover and on the diagram, in both
 * light and dark themes.
 */
export const AssessmentScore: React.FC<{ score?: number }> = ({ score }) => {
  const t = useLabels()
  const tone = score === undefined ? "ungraded" : assessmentTone(score)
  const label =
    score === undefined ? t.notGraded : score > 0 ? `+${score}` : `${score}`

  return (
    <span data-slot="assessment-score" data-tone={tone}>
      {label}
    </span>
  )
}
