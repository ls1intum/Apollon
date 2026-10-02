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

/**
 * Bounds for a single assessment's points, matching the host's CREDITS_MIN /
 * CREDITS_MAX (the host server rejects anything outside them), so a mistyped
 * large number cannot distort the total score.
 */
const SCORE_MIN = -100
const SCORE_MAX = 100

const clampScore = (value: number): number =>
  Math.min(SCORE_MAX, Math.max(SCORE_MIN, value))

/**
 * Pulls a typed value back into [SCORE_MIN, SCORE_MAX] as soon as it leaves
 * it; anything still in range (or not yet a number, like "-" or "") passes
 * through untouched so typing is not interrupted.
 */
export const clampedScoreInput = (raw: string): string => {
  const parsed = parseFloat(raw)
  if (Number.isNaN(parsed) || clampScore(parsed) === parsed) return raw
  return clampScore(parsed).toString()
}

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
  return clampScore(snapped + delta)
}

export const AssessmentScoreInput: React.FC<{
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
  /** Locks the points, e.g. while a grading instruction sets them (as the host's unified feedback card does). */
  disabled?: boolean
}> = ({ value, onChange, ariaLabel, placeholder, disabled = false }) => {
  const t = useLabels()
  const tone = toneFor(value)

  const current = parseFloat(value) || 0

  const step = (delta: number) => {
    onChange(steppedValue(current, delta).toString())
  }

  return (
    <span data-slot="assessment-score-input" data-tone={tone}>
      <button
        type="button"
        data-slot="assessment-score-step"
        aria-label={t.decreasePoints}
        disabled={disabled || current <= SCORE_MIN}
        onClick={() => step(-STEP)}
      >
        <Minus width={12} height={12} aria-hidden="true" />
      </button>
      <input
        type="number"
        step={STEP}
        min={SCORE_MIN}
        max={SCORE_MAX}
        value={value}
        onChange={(e) => onChange(clampedScoreInput(e.target.value))}
        aria-label={ariaLabel}
        placeholder={placeholder}
        disabled={disabled}
      />
      <button
        type="button"
        data-slot="assessment-score-step"
        aria-label={t.increasePoints}
        disabled={disabled || current >= SCORE_MAX}
        onClick={() => step(STEP)}
      >
        <Plus width={12} height={12} aria-hidden="true" />
      </button>
    </span>
  )
}
