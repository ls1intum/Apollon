import React from "react"

type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "subtitle1"
  | "subtitle2"
  | "body1"
  | "body2"
  | "caption"

const variantTag: Record<TypographyVariant, keyof React.JSX.IntrinsicElements> =
  {
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
    h5: "h5",
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
  sx?: React.CSSProperties
  style?: React.CSSProperties
  className?: string
  id?: string
}

// Visual tokens (size / weight / color) live in app.css
// ([data-slot="typography"][data-variant="…"], --apollon-* fallbacks). Callers
// still pass sx/style for one-off layout; those win over the data-slot rule.
export const Typography: React.FC<TypographyProps> = ({
  variant = "body1",
  children,
  sx,
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
      style={{ ...sx, ...style }}
    >
      {children}
    </Tag>
  )
}
