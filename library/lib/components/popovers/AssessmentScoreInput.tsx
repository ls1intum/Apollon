import { NumberField } from "@base-ui/react/number-field"
import { Minus, Plus } from "lucide-react"
import { useLabels } from "@/i18n/useLabels"
import { assessmentTone } from "@/utils/assessmentTitle"

// The host's limits for the points of a single assessment.
const SCORE_MIN = -100
const SCORE_MAX = 100
const SCORE_STEP = 0.5

/** The editable counterpart of AssessmentScore, toned by the same sign. */
export const AssessmentScoreInput = ({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
}) => {
  const t = useLabels()
  return (
    <NumberField.Root
      value={value}
      onValueChange={onChange}
      min={SCORE_MIN}
      max={SCORE_MAX}
      step={SCORE_STEP}
      snapOnStep
      disabled={disabled}
    >
      <NumberField.Group
        data-slot="assessment-score-input"
        data-tone={assessmentTone(value ?? 0)}
      >
        <NumberField.Decrement
          data-slot="assessment-score-step"
          aria-label={t.decreasePoints}
        >
          <Minus width={12} height={12} aria-hidden="true" />
        </NumberField.Decrement>
        <NumberField.Input aria-label={t.points} placeholder="0" />
        <NumberField.Increment
          data-slot="assessment-score-step"
          aria-label={t.increasePoints}
        >
          <Plus width={12} height={12} aria-hidden="true" />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  )
}
