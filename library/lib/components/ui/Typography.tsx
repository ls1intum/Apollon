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

const variantStyle: Partial<Record<TypographyVariant, React.CSSProperties>> = {
  h6: { fontSize: "1.25rem", fontWeight: 500, margin: 0 },
  subtitle1: { fontSize: "1rem", fontWeight: 400, margin: 0 },
  subtitle2: { fontSize: "0.875rem", fontWeight: 500, margin: 0 },
  body1: { fontSize: "1rem", margin: 0 },
  body2: { fontSize: "0.875rem", margin: 0 },
  caption: { fontSize: "0.75rem", margin: 0 },
}

export interface TypographyProps {
  variant?: TypographyVariant
  children?: React.ReactNode
  sx?: React.CSSProperties
  style?: React.CSSProperties
  className?: string
  id?: string
}

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
      style={{
        color: "var(--apollon-primary-contrast, #000000)",
        ...variantStyle[variant],
        ...sx,
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
