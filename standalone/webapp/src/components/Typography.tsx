import React from "react"
import { Typography as MUITypography, TypographyProps } from "@mui/material"

export const Typography: React.FC<TypographyProps> = ({ sx, ...props }) => {
  return (
    <MUITypography
      sx={{ color: "var(--apollon-primary-contrast)", ...sx }}
      {...props}
    />
  )
}
