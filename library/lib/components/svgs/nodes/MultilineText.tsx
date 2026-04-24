import { FC, useMemo, SVGProps } from "react"
import { wrapTextInRect, type SvgFontSpec } from "@/utils/svgTextLayout"

type VerticalAnchor = "top" | "middle" | "bottom"
type TextAnchor = "start" | "middle" | "end"

type Props = Omit<SVGProps<SVGTextElement>, "x" | "y"> & {
  /** The text to lay out. Whitespace outside words collapses per CSS `normal`. */
  text: string
  /** Anchor x coordinate (meaning depends on `textAnchor`). */
  x: number
  /** Anchor y coordinate (meaning depends on `verticalAnchor`). */
  y: number
  /** Maximum line width in SVG user units. */
  maxWidth: number
  /** Font size in CSS px (also used to measure via canvas). */
  fontSize: number
  fontWeight?: string | number
  fontFamily?: string
  fontStyle?: string
  /** Line height in SVG user units. Defaults to `round(fontSize * 1.2)`. */
  lineHeight?: number
  /** "middle" centers the block on `y`; "top" treats `y` as the top; "bottom" as the bottom. */
  verticalAnchor?: VerticalAnchor
  textAnchor?: TextAnchor
  fill?: string
  /** Cap on line count; remaining content is dropped (no ellipsis added here). */
  maxLines?: number
  /** Optional callback for consumers that want to know how many lines were rendered. */
  onLayout?: (info: { lineCount: number; blockHeight: number }) => void
}

const DEFAULT_FONT_FAMILY =
  "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif"

/**
 * Lays out multi-line SVG text using pretext-powered canvas measurement.
 *
 * Renders an SVG `<text>` with one absolutely-positioned `<tspan>` per wrapped
 * line. Handles vertical centering, top- and bottom-anchored placement. For
 * non-rectangular shapes (ellipses, diamonds), use the lower-level helpers in
 * `svgTextLayout` directly.
 */
export const MultilineText: FC<Props> = ({
  text,
  x,
  y,
  maxWidth,
  fontSize,
  fontWeight = 400,
  fontFamily = DEFAULT_FONT_FAMILY,
  fontStyle,
  lineHeight,
  verticalAnchor = "middle",
  textAnchor = "middle",
  fill = "var(--apollon-primary-contrast, #000000)",
  maxLines,
  pointerEvents = "none",
  onLayout,
  ...rest
}) => {
  const resolvedLineHeight = lineHeight ?? Math.round(fontSize * 1.2)

  const font: SvgFontSpec = useMemo(
    () => ({ fontSize, fontWeight, fontFamily, fontStyle }),
    [fontSize, fontWeight, fontFamily, fontStyle]
  )

  const wrapped = useMemo(
    () =>
      wrapTextInRect(text, maxWidth, font, {
        lineHeight: resolvedLineHeight,
        maxLines,
      }),
    [text, maxWidth, font, resolvedLineHeight, maxLines]
  )

  if (!text || wrapped.lines.length === 0) {
    onLayout?.({ lineCount: 0, blockHeight: 0 })
    return null
  }

  const lines = wrapped.lines
  const n = lines.length
  const blockHeight = n * resolvedLineHeight

  // Compute the center-y of the first line based on vertical anchoring.
  let firstLineCenterY: number
  if (verticalAnchor === "top") {
    firstLineCenterY = y + resolvedLineHeight / 2
  } else if (verticalAnchor === "bottom") {
    firstLineCenterY = y - blockHeight + resolvedLineHeight / 2
  } else {
    firstLineCenterY = y - blockHeight / 2 + resolvedLineHeight / 2
  }

  onLayout?.({ lineCount: n, blockHeight })

  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="middle"
      fontSize={fontSize}
      fontWeight={String(fontWeight)}
      fontFamily={fontFamily}
      fontStyle={fontStyle}
      fill={fill}
      pointerEvents={pointerEvents}
      {...rest}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} y={firstLineCenterY + i * resolvedLineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
}
