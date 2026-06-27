import React from "react"
import { Check, TriangleAlert, X } from "lucide-react"

/**
 * The assessment score as a tone-coded pill: a leading status icon plus the
 * signed points, or the word "Not graded" when the element has no assessment.
 *
 * Tone (and thus colour) is derived from the score's sign and routed through the
 * [data-slot="assessment-score"][data-tone] rules in app.css — the SAME
 * --apollon-assessment-* ramp the canvas badge (AssessmentIcon) reads, so a
 * graded element reads identically on the canvas and in the popover.
 * No inline visual styles here; the data attributes carry all the styling.
 */

type AssessmentTone = "positive" | "negative" | "zero" | "ungraded"

const ICON_SIZE = 14

const toneFor = (score?: number): AssessmentTone => {
  if (score === undefined) return "ungraded"
  if (score > 0) return "positive"
  if (score < 0) return "negative"
  return "zero"
}

// Mirrors AssessmentIcon's canvas mapping (Check / X / TriangleAlert).
const iconFor: Record<AssessmentTone, typeof Check> = {
  positive: Check,
  negative: X,
  zero: TriangleAlert,
  ungraded: TriangleAlert,
}

export const AssessmentScore: React.FC<{ score?: number }> = ({ score }) => {
  const tone = toneFor(score)
  const Icon = iconFor[tone]
  const label =
    score === undefined ? "Not graded" : score > 0 ? `+${score}` : `${score}`

  return (
    <span data-slot="assessment-score" data-tone={tone}>
      <Icon width={ICON_SIZE} height={ICON_SIZE} aria-hidden="true" />
      {label}
    </span>
  )
}
