import React, { ReactNode, useMemo } from "react"
import { Popover } from "@base-ui/react/popover"
import { PopoverOrigin } from "@/types"
import { resolveApollonThemeVars } from "@/components/ui/portalTheme"

interface GenericPopoverProps {
  id: string
  anchorEl: HTMLElement | SVGElement | null
  open: boolean
  onClose: () => void
  children: ReactNode
  transformOrigin?: PopoverOrigin
  maxHeight?: number
  maxWidth?: number
  minWidth?: number
  style?: React.CSSProperties
}

// `transformOrigin` is the popover's own corner, so it dictates growth
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
  const popoverThemeVars = useMemo(
    () =>
      resolveApollonThemeVars(anchorEl instanceof Element ? anchorEl : null),
    [anchorEl]
  )

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
