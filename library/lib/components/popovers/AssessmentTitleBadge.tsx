import { ASSESSMENT_TONE_ICONS } from "@/components/svgs/AssessmentIcon"
import type { AssessmentTone } from "./assessmentTitle"

export const AssessmentTitleBadge = ({ tone }: { tone: AssessmentTone }) => {
  const Icon = ASSESSMENT_TONE_ICONS[tone]
  // The bare "i" needs more room than a check or a cross to read as large.
  const size = tone === "zero" ? 20 : 14
  return (
    <span data-slot="assessment-title-badge" data-tone={tone}>
      <Icon
        width={size}
        height={size}
        color="currentColor"
        strokeWidth={3}
        aria-hidden="true"
      />
    </span>
  )
}
