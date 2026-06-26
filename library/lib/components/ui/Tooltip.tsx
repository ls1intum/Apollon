import React from "react"
import {
  Tooltip as SharedTooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider as SharedTooltipProvider,
} from "@tumaet/ui/components/tooltip"

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
  if (!title) return <>{children}</>

  const trigger = React.isValidElement(children) ? (
    <TooltipTrigger
      render={children as React.ReactElement<Record<string, unknown>>}
      delay={delayDuration}
    />
  ) : (
    <TooltipTrigger delay={delayDuration}>{children}</TooltipTrigger>
  )

  return (
    <SharedTooltip>
      {trigger}
      <TooltipContent side={side}>{title}</TooltipContent>
    </SharedTooltip>
  )
}
