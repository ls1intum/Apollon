import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "../lib/utils"

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  portalContainer,
  positionerClassName,
  positionMethod,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "positionMethod"
  > & {
    /** Where the tooltip portals to; defaults to document.body. */
    portalContainer?: TooltipPrimitive.Portal.Props["container"]
    /**
     * Extra classes for the positioner, the element that stacks the tooltip
     * against the page (it is a stacking context, so a z-index on the popup
     * alone cannot lift it above a host's layers).
     */
    positionerClassName?: string
  }) {
  return (
    <TooltipPrimitive.Portal container={portalContainer}>
      <TooltipPrimitive.Positioner
        data-slot="tooltip-positioner"
        className={positionerClassName}
        positionMethod={positionMethod}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(className)}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow data-slot="tooltip-arrow" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
