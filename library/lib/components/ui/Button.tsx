import React from "react"
import { Button as SharedButton } from "@tumaet/ui/components/button"

// Thin compatibility wrapper over the shared @tumaet/ui Button so the editor
// renders the same primitive as the webapp. Keeps the editor's existing
// (MUI-flavoured) public API — variant names + an ignored `size` — so callers
// are unchanged; the styling comes from the bundled, Tailwind-free
// components.css (data-slot/data-variant rules).
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "outlined" | "contained" | "text"
  /** MUI-only; accepted for compatibility, ignored. */
  size?: "small" | "medium" | "large"
}

const variantMap = {
  outlined: "outline",
  contained: "default",
  text: "ghost",
} as const

export const Button: React.FC<ButtonProps> = ({
  variant = "outlined",
  size: _size,
  type = "button",
  children,
  ...props
}) => {
  return (
    <SharedButton type={type} variant={variantMap[variant]} {...props}>
      {children}
    </SharedButton>
  )
}
