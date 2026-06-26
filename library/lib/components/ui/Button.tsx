import React from "react"
import { Button as SharedButton } from "@tumaet/ui/components/button"

// Adapts the shared @tumaet/ui Button to the editor's variant vocabulary
// (outlined/contained/text) so the editor and webapp render one primitive.
// Styling comes from the bundled, Tailwind-free components.css
// (data-slot/data-variant rules).
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "outlined" | "contained" | "text"
  /** Accepted for API compatibility; ignored — the shared primitive owns its size. */
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
