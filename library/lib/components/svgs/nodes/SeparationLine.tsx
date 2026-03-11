import { LAYOUT } from "@/constants"
import { FC } from "react"

interface SeparationLineProps {
  y: number
  width: number
  strokeColor?: string
}

export const SeparationLine: FC<SeparationLineProps> = ({
  y,
  width,
  strokeColor = "var(--apollon2-primary-contrast)",
}) => (
  <line
    x1="0"
    x2={width}
    y1={y}
    y2={y}
    stroke={strokeColor}
    strokeWidth={LAYOUT.LINE_WIDTH}
  />
)
