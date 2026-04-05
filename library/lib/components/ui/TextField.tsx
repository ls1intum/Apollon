import React from "react"
import { TextField as MUITextField, TextFieldProps } from "@mui/material"

export const TextField: React.FC<TextFieldProps> = ({ sx, ...props }) => {
  return (
    <MUITextField
      sx={{
        ...sx,
        bgcolor: "var(--apollon-background, white)",
        input: {
          color: "var(--apollon-primary-contrast, #000000)",
          border: "none",
        },
      }}
      {...props}
    />
  )
}
