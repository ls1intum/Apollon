import React from "react"
import { Typography as MUITypography, TypographyProps } from "@mui/material"

export const Typography: React.FC<TypographyProps> = ({ sx, ...props }) => {
  return (
    <MUITypography
      sx={{ ...sx, color: "var(--apollon-primary-contrast, #000000)" }}
      {...props}
    />
  )
}
