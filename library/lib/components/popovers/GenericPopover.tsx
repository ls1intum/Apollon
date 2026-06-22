import React, { ReactNode, useMemo } from "react"
import { Paper, Popover, PopoverOrigin } from "@mui/material"

interface GenericPopoverProps {
  id: string
  anchorEl: HTMLElement | SVGElement | null
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
  const popoverThemeVars = useMemo(() => {
    const source =
      anchorEl instanceof Element
        ? (anchorEl.closest(".apollon-editor") ?? anchorEl)
        : null

    if (!source) return {}

    const vars = [
      "--apollon-primary",
      "--apollon-primary-contrast",
      "--apollon-background",
      "--apollon-background-variant",
      "--apollon-gray-variant",
      "--panel-background",
      "--panel-shadow",
      "--text",
    ]

    const computed = getComputedStyle(source)
    const resolved: Record<string, string> = {}
    for (const variable of vars) {
      const value = computed.getPropertyValue(variable).trim()
      if (value) {
        resolved[variable] = value
      }
    }

    return resolved
  }, [anchorEl])

  // Portal to document.body (MUI default - no `container`), not into the
  // `.apollon-editor` subtree: an embedder wrapper using `contain`/`transform`
  // would become the containing block for MUI's `position: fixed` root and
  // shift the popover off-screen.
  return (
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
        style={popoverThemeVars as React.CSSProperties}
        sx={{
          width: "100%",
          maxWidth,
          minWidth,
          // border-box so `maxWidth` is the popover's TOTAL width; with the
          // default content-box the px padding was added on top, pushing the
          // paper past its max and clipping right-edge controls (e.g. the
          // colour toggle and per-row delete buttons).
          boxSizing: "border-box",
          px: 1,
          py: 1.25,
          display: "flex",
          flex: 1,
          flexDirection: "column",
          backgroundColor: "var(--apollon-background-variant, #f8f9fa)",
          color: "var(--apollon-primary-contrast, #000000)",
          "& .MuiSelect-select": {
            color: "var(--apollon-primary-contrast, #000000) !important",
          },
          "& .MuiFormLabel-root": {
            color: "var(--apollon-primary-contrast, #000000) !important",
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "var(--apollon-primary-contrast, #000000) !important",
          },
          "& .MuiSvgIcon-root": {
            color: "var(--apollon-primary-contrast, #000000) !important",
          },
          "& .MuiCheckbox-root": {
            color: "var(--apollon-primary-contrast, #000000)",
            "&.Mui-checked": {
              color: "var(--apollon-primary-contrast, #000000)",
            },
            "&:hover": {
              backgroundColor:
                "color-mix(in srgb, var(--apollon-primary-contrast, #000000) 12%, transparent)",
            },
          },
        }}
      >
        {children}
      </Paper>
    </Popover>
  )
}
