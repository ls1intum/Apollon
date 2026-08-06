import React, { ReactNode } from "react"
import { Popover } from "@base-ui/react/popover"
import { PopoverOrigin } from "@/types"
import { usePortalThemeVars } from "@/components/ui/portalTheme"
import { useApollonPortalContainer } from "@/components/ui/portalContainer"
import { AssessmentNavigationFooter } from "./AssessmentNavigationFooter"
import { useAssessmentNavigation } from "@/hooks"

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
  assessmentNavigation?: boolean
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
  assessmentNavigation = false,
}) => {
  const popoverThemeVars = usePortalThemeVars(
    anchorEl instanceof Element ? anchorEl : null
  )
  const portalContainer = useApollonPortalContainer()

  const { side, align } = toSideAlign(transformOrigin)
  const assessmentElementId = id.replace(/^popover-/, "")
  const assessmentNavigationState = useAssessmentNavigation(assessmentElementId)
  const navigation = assessmentNavigation ? assessmentNavigationState : null

  // Mod is what makes this usable: the popover is mostly a points field and a
  // comment box, so a bare arrow key belongs to the caret. Mod+Arrow is free in
  // both, which lets a tutor finish a comment and move on without reaching for
  // the mouse or tabbing out of the field first.
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!navigation?.canNavigate) return
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
      return
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      navigation.navigate("previous")
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      navigation.navigate("next")
    }
  }

  if (!anchorEl && open) return null

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) onClose()
      }}
    >
      <Popover.Portal container={portalContainer}>
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
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                ...style,
              }}
              onKeyDown={handleKeyDown}
            >
              <div className="apollon-popover__content">{children}</div>
              {assessmentNavigation && (
                <AssessmentNavigationFooter elementId={assessmentElementId} />
              )}
            </Popover.Popup>
          </Popover.Positioner>
        )}
      </Popover.Portal>
    </Popover.Root>
  )
}
