import React from "react"
import { Minus, Plus } from "lucide-react"
import { useLabels } from "@/i18n/useLabels"

/**
 * The editable counterpart to {@link AssessmentScore}: a live-toned pill
 * wrapping a number input plus +/- steppers, instead of a read-only icon +
 * signed number. Tone follows the same sign convention (positive/negative/
 * zero) and reads the same [data-slot="assessment-score-input"][data-tone]
 * rules in app.css, so the assessor sees the identical --apollon-assessment-*
 * ramp the read-only pill and the canvas badge use — the score visibly
 * recolors as they type or step, mirroring how the host's unified feedback
 * card colors its points pill by sign.
 *
 * Step size is fixed at 0.5 (the host's CREDITS_STEP) rather than accepted as
 * a prop: the wire-format `Assessment.score` this box edits has no notion of
 * a configurable grid, and every host embedding Apollon today grades on
 * half-point steps, so hard-coding it here avoids a prop only one call site
 * would ever set to something else.
 */

const STEP = 0.5

export type AssessmentTone = "positive" | "negative" | "zero"

/** Shared by the title field's default placeholder (GiveFeedbackAssessmentBox). */
export const toneFor = (value: string): AssessmentTone => {
  const parsed = parseFloat(value)
  if (Number.isNaN(parsed) || parsed === 0) return "zero"
  return parsed > 0 ? "positive" : "negative"
}

/**
 * Snap `current` onto the half-point grid in the direction of travel, then
 * apply `delta` — stepping up from 1.3 lands on 1.5 (the next grid point)
 * rather than skipping to 2, matching what typing a half-point value does.
 */
const steppedValue = (current: number, delta: number): number => {
  const snapped =
    (delta > 0 ? Math.floor(current / STEP) : Math.ceil(current / STEP)) * STEP
  return snapped + delta
}

export const AssessmentScoreInput: React.FC<{
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
}> = ({ value, onChange, ariaLabel, placeholder }) => {
  const t = useLabels()
  const tone = toneFor(value)

  const step = (delta: number) => {
    const current = parseFloat(value) || 0
    onChange(steppedValue(current, delta).toString())
  }

  return (
    <span data-slot="assessment-score-input" data-tone={tone}>
      <button
        type="button"
        data-slot="assessment-score-step"
        aria-label={t.decreasePoints}
        onClick={() => step(-STEP)}
      >
        <Minus width={12} height={12} aria-hidden="true" />
      </button>
      <input
        type="number"
        step={STEP}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        placeholder={placeholder}
      />
      <button
        type="button"
        data-slot="assessment-score-step"
        aria-label={t.increasePoints}
        onClick={() => step(STEP)}
      >
        <Plus width={12} height={12} aria-hidden="true" />
      </button>
    </span>
  )
}
