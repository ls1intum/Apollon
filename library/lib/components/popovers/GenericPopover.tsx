import React, { ReactNode, useMemo } from "react"
import { Popover } from "@base-ui/react/popover"
import { PopoverOrigin } from "@/types"

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

// Forwarded onto the portaled content, which escapes the `.apollon-editor`
// subtree and so wouldn't otherwise inherit these.
const THEME_VARS = [
  "--apollon-primary",
  "--apollon-primary-contrast",
  "--apollon-background",
  "--apollon-background-variant",
  "--apollon-hover-neutral",
  "--apollon-gray-variant",
  "--panel-background",
  "--panel-shadow",
  "--text",
  "--popover-divider",
] as const

// MUI's `transformOrigin` is the popover's own corner, so it dictates growth
// direction: anchored-left opens right, anchored-right opens left.
function toSideAlign(transformOrigin: PopoverOrigin): {
  side: "top" | "bottom" | "left" | "right"
  align: "start" | "center" | "end"
} {
  const side =
    transformOrigin.horizontal === "left"
      ? "right"
      : transformOrigin.horizontal === "right"
        ? "left"
        : "bottom"

  const align =
    transformOrigin.vertical === "top"
      ? "start"
      : transformOrigin.vertical === "bottom"
        ? "end"
        : "center"

  return { side, align }
}

export const GenericPopover: React.FC<GenericPopoverProps> = ({
  id,
  anchorEl,
  open,
  onClose,
  children,
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

    const computed = getComputedStyle(source)
    const resolved: Record<string, string> = {}
    for (const variable of THEME_VARS) {
      const value = computed.getPropertyValue(variable).trim()
      if (value) {
        resolved[variable] = value
      }
    }

    return resolved
  }, [anchorEl])

  const { side, align } = toSideAlign(transformOrigin)

  if (!anchorEl && open) return null

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Popover.Portal>
        {anchorEl && (
          <Popover.Positioner
            anchor={anchorEl}
            side={side}
            align={align}
            sideOffset={4}
            collisionPadding={8}
          >
            <Popover.Popup
              id={open ? id : undefined}
              initialFocus={false}
              onClick={(e) => e.stopPropagation()}
              className="apollon-popover"
              style={{
                ...popoverThemeVars,
                maxHeight,
                maxWidth,
                minWidth,
                overflowY: "auto",
                ...style,
              }}
            >
              {children}
            </Popover.Popup>
          </Popover.Positioner>
        )}
      </Popover.Portal>
    </Popover.Root>
  )
}
