import React from "react"
import { Tooltip } from "./Tooltip"

export interface IconButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "aria-label" | "children"
  > {
  ariaLabel: string
  tooltip?: React.ReactNode
  children: React.ReactNode
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { ariaLabel, tooltip, className, type = "button", children, ...props },
    ref
  ) => {
    const button = (
      <button
        ref={ref}
        type={type}
        className={["apollon-icon-button", className].filter(Boolean).join(" ")}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </button>
    )

    if (!tooltip) {
      return button
    }

    return <Tooltip title={tooltip}>{button}</Tooltip>
  }
)

IconButton.displayName = "IconButton"
