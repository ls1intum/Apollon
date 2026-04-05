import React, { ReactNode, useMemo } from "react"
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
}) => {
  // Resolve the closest .apollon-editor container so the popover portal
  // inherits the scoped CSS custom properties (theme variables).
  const container = useMemo(() => {
    if (!anchorEl) return undefined
    const el =
      anchorEl instanceof SVGElement
        ? (anchorEl.closest(".apollon-editor") ??
          anchorEl.ownerSVGElement?.closest(".apollon-editor"))
        : anchorEl.closest(".apollon-editor")
    return (el as HTMLElement) ?? undefined
  }, [anchorEl])

  return (
    <Popover
      id={open ? id : undefined}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      container={container}
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
          backgroundColor: "var(--apollon-background-variant, #f8f9fa)",
        }}
      >
        {children}
      </Paper>
    </Popover>
  )
}
