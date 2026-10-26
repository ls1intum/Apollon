import React from "react"
import { Check, createLucideIcon, X } from "lucide-react"
import {
  assessmentTone,
  type AssessmentTone,
} from "@/components/popovers/assessmentTitle"

interface AssessmentIconProps {
  score?: number
  x: number
  y: number
}

// The "i" of lucide's Info icon without its circle: the badges draw their own.
const InfoGlyph = createLucideIcon("info-glyph", [
  ["path", { d: "M12 16v-5", key: "stem" }],
  ["path", { d: "M12 7h.01", key: "dot" }],
])

export const ASSESSMENT_TONE_ICONS: Record<AssessmentTone, typeof Check> = {
  positive: Check,
  negative: X,
  zero: InfoGlyph,
}

// The on-canvas feedback badge. A soft tone-tinted disc with the matching status
// glyph — the SAME --apollon-assessment-* tones as the popover score pill, so the
// canvas and the popover read as one system. Positive = check, negative = cross,
// zero = info, since feedback without points informs rather than warns; an
// ungraded element renders no badge.
const AssessmentIcon: React.FC<AssessmentIconProps> = ({ score, x, y }) => {
  if (score === undefined) return null

  const RADIUS = 14
  const ICON_SIZE = 17
  const centerX = x + RADIUS
  const centerY = y + RADIUS

  const tone = assessmentTone(score)
  const Icon = ASSESSMENT_TONE_ICONS[tone]
  const fg = `var(--apollon-assessment-${tone}-text)`

  return (
    <g className="apollon-assessment-icon">
      <circle
        cx={centerX}
        cy={centerY}
        r={RADIUS}
        fill={`var(--apollon-assessment-${tone}-bg)`}
        stroke={fg}
        strokeWidth={1.5}
      />
      <Icon
        width={ICON_SIZE}
        height={ICON_SIZE}
        x={centerX - ICON_SIZE / 2}
        y={centerY - ICON_SIZE / 2}
        color={fg}
        strokeWidth={2.5}
      />
    </g>
  )
}

export default AssessmentIcon
