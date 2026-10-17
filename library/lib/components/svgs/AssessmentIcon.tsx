import React from "react"
import { Check, X } from "lucide-react"

interface AssessmentIconProps {
  score?: number
  x: number
  y: number
}

interface GlyphProps {
  width: number
  height: number
  x: number
  y: number
  color: string
  strokeWidth: number
}

// The "i" of lucide's Info icon without its circle: the badge's disc already
// draws one, and a second ring inside it would crowd the glyph.
const InfoGlyph: React.FC<GlyphProps> = ({
  width,
  height,
  x,
  y,
  color,
  strokeWidth,
}) => (
  <svg
    width={width}
    height={height}
    x={x}
    y={y}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 16v-5" />
    <path d="M12 7h.01" />
  </svg>
)

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

  const tone = score > 0 ? "positive" : score < 0 ? "negative" : "zero"
  const Icon = score > 0 ? Check : score < 0 ? X : InfoGlyph
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
