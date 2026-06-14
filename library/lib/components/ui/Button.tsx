import React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "outlined" | "contained" | "text"
  /** MUI-only; accepted for compatibility, ignored. */
  size?: "small" | "medium" | "large"
}

export const Button: React.FC<ButtonProps> = ({
  variant = "outlined",
  size: _size,
  className,
  type = "button",
  children,
  ...props
}) => {
  const classes = ["apollon-button", `apollon-button--${variant}`, className]
    .filter(Boolean)
    .join(" ")

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}
