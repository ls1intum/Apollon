import { LAYOUT } from "@/constants"
import React from "react"

export const StyledRect: React.FC<React.SVGProps<SVGRectElement>> = ({
  stroke = "var(--apollon2-primary-contrast)",
  fill = "var(--apollon2-background)",
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
