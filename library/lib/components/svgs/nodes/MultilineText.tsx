import { FC, useMemo, SVGProps } from "react"
import { wrapTextInRect, type SvgFontSpec } from "@/utils/svgTextLayout"
import { FONT_FAMILY } from "@/fontStack"

type VerticalAnchor = "top" | "middle" | "bottom"
type TextAnchor = "start" | "middle" | "end"

type Props = Omit<SVGProps<SVGTextElement>, "x" | "y"> & {
  /** The text to lay out. Whitespace outside words collapses per CSS `normal`. */
  text: string
  /** Anchor x coordinate (meaning depends on `textAnchor`). */
  x: number
  /**
   * Anchor y coordinate (meaning depends on `verticalAnchor`).
   *
   * For every anchor mode we treat `y` as if it were the `y` of a single-line
   * `<text>` with `dominantBaseline="middle"`: the first line (or the only
   * line) renders at exactly that visual position, and additional lines grow in
   * the natural direction (down for `top`, up for `bottom`, split either way
   * for `middle`).
   */
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
  /**
   * Where the first (for `"top"`), last (`"bottom"`) or middle line (`"middle"`)
   * sits relative to `y`. See the `y` prop above for the precise semantics.
   */
  verticalAnchor?: VerticalAnchor
  textAnchor?: TextAnchor
  fill?: string
  /**
   * Cap on line count. When specified and the text does not fit, the last
   * rendered line is appended with a Unicode horizontal ellipsis (`…`).
   */
  maxLines?: number
}

const DEFAULT_FONT_FAMILY = FONT_FAMILY

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
    return null
  }

  const displayLines =
    wrapped.overflow && wrapped.lines.length > 0
      ? wrapped.lines.map((line, i) =>
          i === wrapped.lines.length - 1 ? `${line.trimEnd()}…` : line
        )
      : wrapped.lines

  const n = displayLines.length

  // Anchor semantics: treat `y` as if for a single-line <text> with
  // dominantBaseline="middle". First/last/middle line's visual center lands
  // exactly on `y`, extra lines grow in the natural direction.
  let firstLineCenterY: number
  if (verticalAnchor === "top") {
    firstLineCenterY = y
  } else if (verticalAnchor === "bottom") {
    firstLineCenterY = y - (n - 1) * resolvedLineHeight
  } else {
    firstLineCenterY = y - ((n - 1) * resolvedLineHeight) / 2
  }

  // Assistive tech reads each <tspan> as a separate utterance, which
  // fragments a wrapped label into "Register" "new" "user…" instead of
  // the whole sentence. We hide the per-line tspans and expose the
  // original (un-truncated) string as a single accessible name so the
  // label stays intelligible even when the visual rendering is wrapped or
  // ellipsised.
  //
  // The name lives on a wrapping `<g role="img" aria-label>`, not on the
  // `<text>` itself: `aria-label` is prohibited on a bare SVG `<text>`
  // (it has no implicit role), but it is valid on an explicit `role="img"`
  // graphic. Whitespace-only content gets a plain <g> with no role/name —
  // otherwise some screen readers announce "group" for a named-but-empty
  // element.
  const accessibleName = text.trim() ? text : undefined

  const textEl = (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="middle"
      fontSize={fontSize}
      fontWeight={fontWeight}
      fontFamily={fontFamily}
      fontStyle={fontStyle}
      fill={fill}
      pointerEvents={pointerEvents}
      {...rest}
    >
      {displayLines.map((line, i) => (
        <tspan
          key={i}
          x={x}
          y={firstLineCenterY + i * resolvedLineHeight}
          aria-hidden="true"
        >
          {line}
        </tspan>
      ))}
    </text>
  )

  if (!accessibleName) {
    return textEl
  }

  return (
    <g role="img" aria-label={accessibleName}>
      {textEl}
    </g>
  )
}
