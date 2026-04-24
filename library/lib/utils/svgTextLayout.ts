import {
  layoutNextLineRange,
  layoutWithLines,
  materializeLineRange,
  measureNaturalWidth,
  prepareWithSegments,
  type LayoutCursor,
  type LayoutLine,
  type PreparedTextWithSegments,
} from "@chenglou/pretext"

/**
 * Canvas-accurate text layout helpers powered by @chenglou/pretext.
 *
 * Pretext measures text via the browser's font engine (canvas) and produces
 * line-broken layouts without ever touching the DOM. We wrap it here so SVG
 * nodes get proper word wrapping — including inside non-rectangular shapes
 * like ellipses — instead of relying on character-count approximations.
 */

const DEFAULT_FONT_FAMILY =
  "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif"

/** Compact spec for a text style. Converted into a canvas `font` shorthand. */
export type SvgFontSpec = {
  fontSize: number
  fontWeight?: string | number
  fontFamily?: string
  fontStyle?: string
}

export const toCanvasFont = (spec: SvgFontSpec): string => {
  const weight = spec.fontWeight ?? 400
  const style = spec.fontStyle ?? "normal"
  const family = spec.fontFamily ?? DEFAULT_FONT_FAMILY
  return `${style} ${weight} ${spec.fontSize}px ${family}`
}

const prepareCache = new Map<string, PreparedTextWithSegments>()
const PREPARE_CACHE_LIMIT = 256

/** How to treat whitespace during layout. Mirrors a CSS `white-space` subset. */
export type WhiteSpaceMode = "normal" | "pre-wrap"

const getPrepared = (
  text: string,
  font: string,
  whiteSpace: WhiteSpaceMode
): PreparedTextWithSegments => {
  // Use U+001F (Unit Separator) as the delimiter between the cache-key parts.
  // All three operands are user-visible strings, so this control character is
  // guaranteed not to appear in any of them and the key stays collision-free.
  const key = `${whiteSpace}${font}${text}`
  const cached = prepareCache.get(key)
  if (cached) {
    // Touch for LRU: re-insert so recently used entries stay put and older
    // ones are the first to be evicted when we hit the limit.
    prepareCache.delete(key)
    prepareCache.set(key, cached)
    return cached
  }
  const prepared = prepareWithSegments(text, font, { whiteSpace })
  if (prepareCache.size >= PREPARE_CACHE_LIMIT) {
    const firstKey = prepareCache.keys().next().value
    if (firstKey !== undefined) prepareCache.delete(firstKey)
  }
  prepareCache.set(key, prepared)
  return prepared
}

/**
 * Invalidate every cached preparation. Call this when the set of available
 * fonts changes (e.g. a webfont just finished loading) so that subsequent
 * measurements use the real font metrics rather than the fallback's.
 */
export const clearPrepareCache = (): void => {
  prepareCache.clear()
}

/**
 * Convenience: the most lines of `lineHeight` that can stack vertically in
 * `availableHeight` pixels. Always returns at least 1. Useful for SVG nodes
 * whose inner drawable area has a known vertical budget (rectangle height
 * minus top/bottom padding, for instance) and who want to cap
 * `MultilineText`'s `maxLines` so wrapping never overflows the shape.
 */
export const maxLinesForHeight = (
  availableHeight: number,
  lineHeight: number
): number => Math.max(1, Math.floor(availableHeight / lineHeight))

if (
  typeof document !== "undefined" &&
  (document as Document & { fonts?: FontFaceSet }).fonts
) {
  // Re-measure everything once the page's webfonts finish loading so wrap
  // decisions made against the fallback family get re-evaluated under the
  // real face (e.g. Inter) once it's available.
  void (document as Document & { fonts: FontFaceSet }).fonts.ready
    .then(clearPrepareCache)
    .catch(() => {
      /* noop — best-effort cache invalidation */
    })
}

export type WrappedText = {
  lines: string[]
  /**
   * Measured width of the widest laid-out line, in CSS px. Does not account
   * for any ellipsis a caller may append after truncation.
   */
  maxLineWidth: number
  /** Whether every grapheme of the input was consumed by the layout. */
  overflow: boolean
}

/**
 * Wrap text inside a rectangle of `maxWidth`. Word-break is CSS `normal`.
 * When `whiteSpace` is `"pre-wrap"` (the default), literal `\n` characters in
 * the input become hard line breaks; when it is `"normal"` whitespace runs
 * collapse the way CSS normally collapses them.
 *
 * Returns the resulting lines, the widest line's measured width, and whether
 * any content was dropped (i.e. could not fit within `maxLines`).
 */
export const wrapTextInRect = (
  text: string,
  maxWidth: number,
  font: SvgFontSpec | string,
  options: {
    maxLines?: number
    lineHeight?: number
    whiteSpace?: WhiteSpaceMode
  } = {}
): WrappedText => {
  const trimmed = text ?? ""
  if (!trimmed) {
    return { lines: [], maxLineWidth: 0, overflow: false }
  }
  const fontString = typeof font === "string" ? font : toCanvasFont(font)
  const lineHeight =
    options.lineHeight ??
    (typeof font === "string" ? 16 : Math.round(font.fontSize * 1.2))
  const whiteSpace = options.whiteSpace ?? "pre-wrap"
  const sanitizedWidth = Math.max(1, maxWidth)
  // Pretext internally uses canvas.measureText; in environments where
  // `document.createElement("canvas")` isn't available (some SSR / jsdom-
  // without-canvas configurations) the call throws. A single bad render
  // shouldn't kill the surrounding editor tree, so fall back to a minimal
  // single-line shape that preserves the original text without wrapping.
  try {
    const prepared = getPrepared(trimmed, fontString, whiteSpace)
    const result = layoutWithLines(prepared, sanitizedWidth, lineHeight)
    let lines = result.lines.map((line) => line.text)
    let maxLineWidth = result.lines.reduce((w, l) => Math.max(w, l.width), 0)
    let overflow = false
    if (options.maxLines !== undefined && lines.length > options.maxLines) {
      lines = lines.slice(0, options.maxLines)
      const trimmedLines = result.lines.slice(0, options.maxLines)
      maxLineWidth = trimmedLines.reduce((w, l) => Math.max(w, l.width), 0)
      overflow = true
    }
    return { lines, maxLineWidth, overflow }
  } catch {
    return {
      lines: [trimmed],
      maxLineWidth: sanitizedWidth,
      overflow: false,
    }
  }
}

export type ShapeLayout = {
  /** Materialized lines (from pretext). `text` already includes any ellipsis. */
  lines: { text: string; width: number }[]
  lineHeight: number
  /** Signed y-offsets (relative to shape center) of each line's visual center. */
  lineOffsets: number[]
  /** Total vertical span of the laid-out block. */
  blockHeight: number
  /** True when input text exceeded the shape's capacity and was truncated. */
  overflow: boolean
}

type ShapeOptions = {
  paddingX?: number
  paddingY?: number
  /** Cap on how many lines we will try to fit. Defaults to a generous value. */
  maxLines?: number
  /** Same semantics as `wrapTextInRect`'s `whiteSpace`. */
  whiteSpace?: WhiteSpaceMode
}

type ShapeWidthFn = (y: number, ry: number, rx: number) => number

const ellipseWidthAtY: ShapeWidthFn = (y, ry, rx) => {
  const bound = Math.min(Math.abs(y), ry)
  const ratio = bound / ry
  const factor = Math.sqrt(Math.max(0, 1 - ratio * ratio))
  return 2 * rx * factor
}

const diamondWidthAtY: ShapeWidthFn = (y, ry, rx) => {
  const bound = Math.min(Math.abs(y), ry)
  const factor = 1 - bound / ry
  return 2 * rx * Math.max(0, factor)
}

const HORIZONTAL_ELLIPSIS = "…"

/**
 * Shared "fit text inside a shape with variable per-line max width" routine.
 *
 * Strategy: for each candidate line count N (starting at 1), compute the
 * maximum width available to each of the N vertically-centered lines given
 * the shape's `widthAt(y)` function, then stream a layout using pretext's
 * variable-width line walker. If the text is fully consumed within N lines,
 * we're done. Otherwise, try N+1. We stop once N lines would no longer fit
 * vertically inside the shape, at which point the best-effort layout gets
 * an ellipsis appended to the last line so users see that content was
 * truncated instead of silently clipping glyphs.
 */
const layoutTextInShape = (
  text: string,
  width: number,
  height: number,
  font: SvgFontSpec | string,
  lineHeight: number,
  widthAt: ShapeWidthFn,
  options: ShapeOptions
): ShapeLayout => {
  const fontString = typeof font === "string" ? font : toCanvasFont(font)
  const paddingX = options.paddingX ?? 0
  const paddingY = options.paddingY ?? 0
  const maxLinesCap = options.maxLines ?? 32
  const whiteSpace = options.whiteSpace ?? "pre-wrap"

  const emptyLayout: ShapeLayout = {
    lines: [],
    lineHeight,
    lineOffsets: [],
    blockHeight: 0,
    overflow: false,
  }
  const fallbackLayout = (t: string): ShapeLayout => ({
    lines: [{ text: t, width: Math.max(0, width - 2 * paddingX) }],
    lineHeight,
    lineOffsets: [0],
    blockHeight: lineHeight,
    overflow: false,
  })

  const trimmed = text ?? ""
  if (!trimmed) return emptyLayout

  const rx = Math.max(0, width / 2 - paddingX)
  const ry = Math.max(0, height / 2 - paddingY)
  if (rx <= 0 || ry <= 0) return emptyLayout

  // See `wrapTextInRect` for the rationale — preserve the label if the
  // canvas measurement path is unavailable.
  let prepared
  try {
    prepared = getPrepared(trimmed, fontString, whiteSpace)
  } catch {
    return fallbackLayout(trimmed)
  }

  // Max line count vertically feasible inside the shape.
  const verticalCap = Math.max(1, Math.floor((2 * ry) / lineHeight))
  const maxLines = Math.min(verticalCap, maxLinesCap)

  const isCursorAtEnd = (cursor: LayoutCursor): boolean => {
    const next = layoutNextLineRange(prepared, cursor, rx * 2)
    return next === null
  }

  // Each line's visual center offset relative to the shape's vertical center
  // for a block of `n` lines. Hoisted out of the per-iteration body so the
  // happy path and the overflow path share one formula.
  const centerOffsets = (n: number): number[] => {
    const top = -(n * lineHeight) / 2
    return Array.from({ length: n }, (_, i) => top + (i + 0.5) * lineHeight)
  }

  let bestLines: LayoutLine[] | null = null

  for (let n = 1; n <= maxLines; n++) {
    const blockHeight = n * lineHeight
    const topY = -blockHeight / 2

    const widths: number[] = new Array(n)
    for (let i = 0; i < n; i++) {
      const lineTop = topY + i * lineHeight
      const lineBottom = lineTop + lineHeight
      const edge = Math.max(Math.abs(lineTop), Math.abs(lineBottom))
      widths[i] = widthAt(edge, ry, rx)
    }

    // Any zero-width line means the shape pinches to nothing here; no point
    // trying this N — lines at the extremes cannot hold any text.
    if (widths.some((w) => w <= 0)) break

    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
    const lines: LayoutLine[] = []
    for (let i = 0; i < n; i++) {
      const range = layoutNextLineRange(prepared, cursor, widths[i])
      if (range === null) break // text fully consumed before reaching N lines
      lines.push(materializeLineRange(prepared, range))
      cursor = range.end
    }

    const fits = lines.length < n || isCursorAtEnd(cursor)
    if (fits) {
      return {
        lines: lines.map((l) => ({ text: l.text, width: l.width })),
        lineHeight,
        lineOffsets: centerOffsets(lines.length),
        blockHeight: lines.length * lineHeight,
        overflow: false,
      }
    }

    bestLines = lines
  }

  if (bestLines && bestLines.length > 0) {
    // Overflow path: append a horizontal ellipsis to the final line so the
    // user sees that the content was truncated rather than silently clipped.
    const rendered = bestLines.map((l) => ({ text: l.text, width: l.width }))
    const last = rendered[rendered.length - 1]
    last.text = `${last.text.trimEnd()}${HORIZONTAL_ELLIPSIS}`
    return {
      lines: rendered,
      lineHeight,
      lineOffsets: centerOffsets(bestLines.length),
      blockHeight: bestLines.length * lineHeight,
      overflow: true,
    }
  }

  // Degenerate fallback: one line at the shape's natural width, clamped to
  // the shape diameter. Reaches this branch only when even a single line
  // can't be computed by the main loop — typically a shape that pinches to
  // zero height (impossible after the `rx <= 0 || ry <= 0` guard above), so
  // kept as defense-in-depth.
  const fallbackWidth = Math.min(measureNaturalWidth(prepared), rx * 2)
  const fallback = layoutNextLineRange(
    prepared,
    { segmentIndex: 0, graphemeIndex: 0 },
    fallbackWidth
  )
  if (!fallback) return emptyLayout
  const materialized = materializeLineRange(prepared, fallback)
  return {
    lines: [{ text: materialized.text, width: materialized.width }],
    lineHeight,
    lineOffsets: [0],
    blockHeight: lineHeight,
    overflow: !isCursorAtEnd(fallback.end),
  }
}

/**
 * Lay out `text` inside an ellipse of size `width`×`height`, respecting the
 * ellipse's curvature so lines near the top and bottom get a narrower max
 * width than lines near the middle. When the text does not fit, the final
 * visible line is suffixed with a horizontal ellipsis.
 */
export const layoutTextInEllipse = (
  text: string,
  width: number,
  height: number,
  font: SvgFontSpec | string,
  lineHeight: number,
  options: ShapeOptions = {}
): ShapeLayout =>
  layoutTextInShape(
    text,
    width,
    height,
    font,
    lineHeight,
    ellipseWidthAtY,
    options
  )

/**
 * Lay out `text` inside a rhombus / diamond of size `width`×`height`. The
 * inner width varies linearly with the distance from the vertical center
 * (full width at the middle, zero at the top and bottom vertices). Lines
 * near the vertices therefore get narrower line boxes, and overflow is
 * marked with a horizontal ellipsis on the last visible line.
 */
export const layoutTextInDiamond = (
  text: string,
  width: number,
  height: number,
  font: SvgFontSpec | string,
  lineHeight: number,
  options: ShapeOptions = {}
): ShapeLayout =>
  layoutTextInShape(
    text,
    width,
    height,
    font,
    lineHeight,
    diamondWidthAtY,
    options
  )
