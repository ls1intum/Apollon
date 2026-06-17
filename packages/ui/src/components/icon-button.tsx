import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"

import { cn } from "../lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

// Compact square icon-only button. Styling lives in styles/components.css keyed
// on data-slot="icon-button" (see button.tsx for the embed-safe rationale).
// When `tooltip` is set the button is wrapped in a shared Tooltip.
export interface IconButtonProps
  extends Omit<ButtonPrimitive.Props, "aria-label" | "children"> {
  ariaLabel: string
  tooltip?: React.ReactNode
  children: React.ReactNode
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { ariaLabel, tooltip, className, type = "button", children, ...props },
    ref
  ) => {
    const button = (
      <ButtonPrimitive
        ref={ref}
        type={type}
        data-slot="icon-button"
        className={cn(className)}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </ButtonPrimitive>
    )

    if (!tooltip) {
      return button
    }

    return (
      <Tooltip>
        <TooltipTrigger render={button} />
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    )
  }
)

IconButton.displayName = "IconButton"

export { IconButton }
