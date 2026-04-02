import React, { ReactNode } from "react"
import { Popover, PopoverOrigin, Paper } from "@mui/material"

interface GenericPopoverProps {
  id: string
  anchorEl: HTMLElement | SVGSVGElement | null | SVGPathElement
  open: boolean
  onClose: () => void
  children: ReactNode
  anchorOrigin?: PopoverOrigin
  transformOrigin?: PopoverOrigin
  maxHeight?: number
  maxWidth?: number
  minWidth?: number
  style?: React.CSSProperties
}

export const GenericPopover: React.FC<GenericPopoverProps> = ({
  id,
  anchorEl,
  open,
  onClose,
  children,
  anchorOrigin = { vertical: "top", horizontal: "right" },
  transformOrigin = { vertical: "top", horizontal: "left" },
  maxHeight = 500,
  maxWidth = 278,
  minWidth = 200,
  style,
}) => (
  <Popover
    id={open ? id : undefined}
    open={open}
    anchorEl={anchorEl}
    onClose={onClose}
    anchorOrigin={anchorOrigin}
    transformOrigin={transformOrigin}
    style={{ maxHeight, width: "100%", ...style }}
    onClick={(e) => {
      e.stopPropagation()
    }}
  >
    <Paper
      elevation={2}
      sx={{
        width: "100%",
        maxWidth,
        minWidth,
        px: 1,
        py: 1.25,
        display: "flex",
        flex: 1,
        flexDirection: "column",
        backgroundColor: "var(--apollon-background-variant)",
      }}
    >
      {children}
    </Paper>
  </Popover>
)
