import { LAYOUT } from "@/constants"
import React from "react"

export const StyledRect: React.FC<React.SVGProps<SVGRectElement>> = ({
  stroke = "var(--apollon-primary-contrast)",
  fill = "var(--apollon-background)",
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
