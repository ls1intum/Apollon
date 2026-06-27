import React from "react"
import { Check, TriangleAlert, X } from "lucide-react"

interface AssessmentIconProps {
  score?: number
  x: number
  y: number
}

// The on-canvas feedback badge. A soft tone-tinted disc with the matching status
// glyph — the SAME --apollon-assessment-* tones as the popover score pill, so the
// canvas and the popover read as one system. Positive = check, negative = cross,
// zero = alert; an ungraded element renders no badge.
const AssessmentIcon: React.FC<AssessmentIconProps> = ({ score, x, y }) => {
  if (score === undefined) return null

  const RADIUS = 14
  const ICON_SIZE = 17
  const centerX = x + RADIUS
  const centerY = y + RADIUS

  const tone = score > 0 ? "positive" : score < 0 ? "negative" : "zero"
  const Icon = score > 0 ? Check : score < 0 ? X : TriangleAlert
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
