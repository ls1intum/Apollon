import { Check, X } from "lucide-react"
import type { AssessmentTone } from "./AssessmentScoreInput"

/**
 * The round, tone-tinted icon in front of an assessment's title, like the icon badge of the host's unified feedback card:
 * a check for positive points, an X for negative ones and an "i" for feedback without points. The "i" is drawn without
 * lucide's circle, as the badge already is one (see also AssessmentIcon's InfoGlyph).
 */
export const AssessmentTitleBadge = ({ tone }: { tone: AssessmentTone }) => (
  <span data-slot="assessment-title-badge" data-tone={tone}>
    {tone === "positive" ? (
      <Check width={14} height={14} aria-hidden="true" />
    ) : tone === "negative" ? (
      <X width={14} height={14} aria-hidden="true" />
    ) : (
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 16v-5" />
        <path d="M12 7h.01" />
      </svg>
    )}
  </span>
)
