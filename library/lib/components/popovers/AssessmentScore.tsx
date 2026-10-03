import React from "react"
import { useLabels } from "@/i18n/useLabels"

/**
 * The assessment score as a tone-coded pill: the signed points, or the word
 * "Not graded" when the element has no assessment. No leading icon — the
 * tone (background/text color) alone carries the sign, matching the host's
 * unified feedback points pill (also icon-less).
 *
 * Tone (and thus colour) is derived from the score's sign and routed through the
 * [data-slot="assessment-score"][data-tone] rules in app.css — the SAME
 * --apollon-assessment-* ramp the canvas badge (AssessmentIcon) reads, so a
 * graded element reads identically on the canvas and in the popover.
 * No inline visual styles here; the data attributes carry all the styling.
 */

type AssessmentTone = "positive" | "negative" | "zero" | "ungraded"

const toneFor = (score?: number): AssessmentTone => {
  if (score === undefined) return "ungraded"
  if (score > 0) return "positive"
  if (score < 0) return "negative"
  return "zero"
}

export const AssessmentScore: React.FC<{ score?: number }> = ({ score }) => {
  const t = useLabels()
  const tone = toneFor(score)
  const label =
    score === undefined ? t.notGraded : score > 0 ? `+${score}` : `${score}`

  return (
    <span data-slot="assessment-score" data-tone={tone}>
      {label}
    </span>
  )
}
