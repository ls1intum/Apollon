import React from "react"
import { Tooltip as BaseTooltip } from "@base-ui-components/react/tooltip"

export interface TooltipProps {
  /** Tooltip text (mirrors MUI's `title`). */
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
  <BaseTooltip.Provider delay={delayDuration}>{children}</BaseTooltip.Provider>
)

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  children,
  side = "top",
  delayDuration,
}) => {
  if (!title) return <>{children}</>

  const trigger = React.isValidElement(children) ? (
    <BaseTooltip.Trigger
      render={children as React.ReactElement<Record<string, unknown>>}
      delay={delayDuration}
    />
  ) : (
    <BaseTooltip.Trigger delay={delayDuration}>{children}</BaseTooltip.Trigger>
  )

  return (
    <BaseTooltip.Root>
      {trigger}
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={4}>
          <BaseTooltip.Popup className="apollon-tooltip">
            {title}
            <BaseTooltip.Arrow className="apollon-tooltip-arrow" />
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
