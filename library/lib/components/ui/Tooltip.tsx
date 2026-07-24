import React from "react"
import {
  Tooltip as SharedTooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider as SharedTooltipProvider,
} from "@tumaet/ui/components/tooltip"
import { usePortalThemeVars } from "./portalTheme"

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
  // The content portals to <body>, escaping the `.apollon-editor` subtree that
  // scopes `--apollon-*`; resolve the theme off the trigger and carry it along.
  const [triggerElement, setTriggerElement] =
    React.useState<HTMLButtonElement | null>(null)
  const portalThemeVars = usePortalThemeVars(triggerElement)

  if (!title) return <>{children}</>

  const trigger = React.isValidElement(children) ? (
    <TooltipTrigger
      ref={setTriggerElement}
      render={children as React.ReactElement<Record<string, unknown>>}
      delay={delayDuration}
    />
  ) : (
    <TooltipTrigger ref={setTriggerElement} delay={delayDuration}>
      {children}
    </TooltipTrigger>
  )

  return (
    <SharedTooltip>
      {trigger}
      <TooltipContent side={side} style={portalThemeVars}>
        {title}
      </TooltipContent>
    </SharedTooltip>
  )
}
