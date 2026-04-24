import React from "react"
import { TextField as MUITextField, TextFieldProps } from "@mui/material"

export const TextField: React.FC<TextFieldProps> = ({ sx, ...props }) => {
  return (
    <MUITextField
      sx={{
        ...sx,
        bgcolor: "var(--apollon-background, white)",
        // Target BOTH <input> (single-line) and <textarea> (multiline).
        // MUI wraps either in `.MuiInputBase-input`, so this one selector
        // covers dark-mode text colors regardless of variant.
        "& .MuiInputBase-input": {
          color: "var(--apollon-primary-contrast, #000000)",
          caretColor: "var(--apollon-primary-contrast, #000000)",
          border: "none",
        },
        "& .MuiInputBase-input::placeholder": {
          color: "var(--apollon-gray-variant, #495057)",
          opacity: 0.7,
        },
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: "var(--apollon-gray-variant, #495057)",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "var(--apollon-primary-contrast, #000000)",
        },
        "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: "var(--apollon-primary-contrast, #000000)",
        },
      }}
      {...props}
    />
  )
}
