import React from "react"
import {
  ListItemText as MUIListItemText,
  ListItemTextProps,
} from "@mui/material"

export const ListItemText: React.FC<ListItemTextProps> = ({ sx, ...props }) => {
  return (
    <MUIListItemText
      sx={{ ...sx, color: "var(--apollon-primary-contrast)" }}
      {...props}
    />
  )
}
