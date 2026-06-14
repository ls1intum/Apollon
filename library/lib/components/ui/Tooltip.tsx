import React from "react"
import * as RadixTooltip from "@radix-ui/react-tooltip"

export interface TooltipProps {
  /** Tooltip text (mirrors MUI's `title`). */
  title: React.ReactNode
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  delayDuration?: number
}

// Mount once near the editor root so Radix can group hovers across controls.
export const TooltipProvider: React.FC<{
  children: React.ReactNode
  delayDuration?: number
}> = ({ children, delayDuration = 700 }) => (
  <RadixTooltip.Provider delayDuration={delayDuration}>
    {children}
  </RadixTooltip.Provider>
)

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  children,
  side = "top",
  delayDuration,
}) => {
  if (!title) return <>{children}</>

  return (
    <RadixTooltip.Root delayDuration={delayDuration}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={4}
          className="apollon-tooltip"
        >
          {title}
          <RadixTooltip.Arrow className="apollon-tooltip-arrow" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
