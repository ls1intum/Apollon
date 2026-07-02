import React from "react"
import {
  Tooltip as SharedTooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider as SharedTooltipProvider,
} from "@tumaet/ui/components/tooltip"
import { resolveApollonThemeVars } from "./portalTheme"

// Wraps the shared @tumaet/ui Tooltip so the editor renders the same primitive as
// the webapp, exposing a `title` + default 700ms delay API for the editor's call
// sites; styling ships in the bundled, Tailwind-free components.css
// (data-slot="tooltip-content").

export interface TooltipProps {
  /** Tooltip text. */
  title: React.ReactNode
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  delayDuration?: number
}

// Mount once near the editor root so adjacent tooltips can share hover delay.
export const TooltipProvider: React.FC<{
  children: React.ReactNode
  delayDuration?: number
}> = ({ children, delayDuration = 700 }) => (
  <SharedTooltipProvider delay={delayDuration}>
    {children}
  </SharedTooltipProvider>
)

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  children,
  side = "top",
  delayDuration,
}) => {
  // Base UI types the trigger ref as a button; we only read `.closest()` off it,
  // so the concrete element type doesn't matter beyond satisfying that ref.
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  // The content portals to <body>, escaping the `.apollon-editor` subtree that
  // scopes `--apollon-*`; copy the resolved theme onto the popup (resolved at
  // open time, off the trigger) so a dark or custom embed theme carries into the
  // tooltip instead of falling back to the default light palette.
  const [portalThemeVars, setPortalThemeVars] =
    React.useState<React.CSSProperties>({})

  if (!title) return <>{children}</>

  const trigger = React.isValidElement(children) ? (
    <TooltipTrigger
      ref={triggerRef}
      render={children as React.ReactElement<Record<string, unknown>>}
      delay={delayDuration}
    />
  ) : (
    <TooltipTrigger ref={triggerRef} delay={delayDuration}>
      {children}
    </TooltipTrigger>
  )

  return (
    <SharedTooltip
      onOpenChange={(next: boolean) => {
        if (next)
          setPortalThemeVars(resolveApollonThemeVars(triggerRef.current))
      }}
    >
      {trigger}
      <TooltipContent side={side} style={portalThemeVars}>
        {title}
      </TooltipContent>
    </SharedTooltip>
  )
}
