import { LAYOUT } from "@/constants"
import React from "react"

export const StyledRect: React.FC<React.SVGProps<SVGRectElement>> = ({
  stroke = "var(--apollon-primary-contrast, #000000)",
  fill = "var(--apollon-background, white)",
  ...props
}) => {
  return (
    <rect
      stroke={stroke}
      fill={fill}
      strokeWidth={LAYOUT.LINE_WIDTH}
      {...props}
    />
  )
}
