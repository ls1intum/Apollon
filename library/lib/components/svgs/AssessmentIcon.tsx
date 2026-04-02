import React from "react"
import { CheckIcon, ExclamationIcon, CrossIcon } from "../Icon"

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
      return { Icon: CheckIcon, fill: "green" }
    } else if (score < 0) {
      return { Icon: CrossIcon, fill: "red" }
    } else {
      return { Icon: ExclamationIcon, fill: "blue" }
    }
  }

  const { Icon, fill } = getIconConfig()

  return (
    <g className="apollon-assessment-icon">
      <circle
        cx={centerX}
        cy={centerY}
        r={RADIUS}
        fill="#f0f0f0"
        stroke="#ccc"
        opacity={0.7}
      />
      <Icon {...iconProps} fill={fill} />
    </g>
  )
}

export default AssessmentIcon
