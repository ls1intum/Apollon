import React from "react"
import { Check, TriangleAlert, X } from "lucide-react"

interface AssessmentIconProps {
  score?: number
  x: number
  y: number
}

const AssessmentIcon: React.FC<AssessmentIconProps> = ({ score, x, y }) => {
  if (score === undefined) return null

  const RADIUS = 15
  const ICON_SIZE = 20
  const centerX = x + RADIUS
  const centerY = y + RADIUS

  const iconProps = {
    width: ICON_SIZE,
    height: ICON_SIZE,
    x: centerX - ICON_SIZE / 2,
    y: centerY - ICON_SIZE / 2,
  }

  const getIconConfig = () => {
    if (score > 0) {
      return { Icon: Check, color: "green" }
    } else if (score < 0) {
      return { Icon: X, color: "red" }
    } else {
      return { Icon: TriangleAlert, color: "blue" }
    }
  }

  const { Icon, color } = getIconConfig()

  return (
    <g className="apollon-assessment-icon">
      <circle
        cx={centerX}
        cy={centerY}
        r={RADIUS}
        fill="var(--apollon-assessment-icon-surface, #f0f0f0)"
        stroke="var(--apollon-assessment-icon-border, #ccc)"
        opacity={0.7}
      />
      <Icon {...iconProps} color={color} />
    </g>
  )
}

export default AssessmentIcon
