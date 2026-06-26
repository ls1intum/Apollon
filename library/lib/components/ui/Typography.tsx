import React from "react"

// A small semantic-text helper, not a type ramp. Each variant has a rule in
// app.css ([data-slot="typography"][data-variant="…"]); the variant set below is
// exactly the styled, in-use set.
type TypographyVariant =
  | "h6"
  | "subtitle1"
  | "subtitle2"
  | "body1"
  | "body2"
  | "caption"

const variantTag: Record<TypographyVariant, keyof React.JSX.IntrinsicElements> =
  {
    h6: "h6",
    subtitle1: "p",
    subtitle2: "p",
    body1: "p",
    body2: "p",
    caption: "span",
  }

export interface TypographyProps {
  variant?: TypographyVariant
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  id?: string
}

// Visual tokens (size / weight / color) live in app.css
// ([data-slot="typography"][data-variant="…"], --apollon-* fallbacks). Callers
// still pass `style` for one-off layout; it wins over the data-slot rule.
export const Typography: React.FC<TypographyProps> = ({
  variant = "body1",
  children,
  style,
  className,
  id,
}) => {
  const Tag = variantTag[variant]
  return (
    <Tag
      id={id}
      className={className}
      data-slot="typography"
      data-variant={variant}
      style={style}
    >
      {children}
    </Tag>
  )
}
