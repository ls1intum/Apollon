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

const getPrepared = (text: string, font: string): PreparedTextWithSegments => {
  // Use U+001F (Unit Separator) as the delimiter between the font shorthand
  // and the label text. Both operands are user-visible strings, so this
  // control character is guaranteed not to appear in either and the cache
  // key stays collision-free.
  const key = `${font}${text}`
  const cached = prepareCache.get(key)
  if (cached) {
    // Touch for LRU: re-insert so recently used entries stay put and older
    // ones are the first to be evicted when we hit the limit.
    prepareCache.delete(key)
    prepareCache.set(key, cached)
    return cached
  }
  const prepared = prepareWithSegments(text, font)
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
 * Returns the resulting lines, the widest line's measured width, and whether
 * any content was dropped (i.e. could not fit within `maxLines`).
 */
export const wrapTextInRect = (
  text: string,
  maxWidth: number,
  font: SvgFontSpec | string,
  options: { maxLines?: number; lineHeight?: number } = {}
): WrappedText => {
  const trimmed = text ?? ""
  if (!trimmed) {
    return { lines: [], maxLineWidth: 0, overflow: false }
  }
  const fontString = typeof font === "string" ? font : toCanvasFont(font)
  const lineHeight =
    options.lineHeight ??
    (typeof font === "string" ? 16 : Math.round(font.fontSize * 1.2))
  const prepared = getPrepared(trimmed, fontString)
  const sanitizedWidth = Math.max(1, maxWidth)
  const result = layoutWithLines(prepared, sanitizedWidth, lineHeight)
  let lines = result.lines.map((line) => line.text)
  let maxLineWidth = lines.reduce(
    (w, _line, i) => Math.max(w, result.lines[i].width),
    0
  )
  let overflow = false
  if (options.maxLines !== undefined && lines.length > options.maxLines) {
    lines = lines.slice(0, options.maxLines)
    const trimmedLines = result.lines.slice(0, options.maxLines)
    maxLineWidth = trimmedLines.reduce((w, l) => Math.max(w, l.width), 0)
    overflow = true
  }
  return { lines, maxLineWidth, overflow }
}

export type EllipseLayout = {
  lines: LayoutLine[]
  lineHeight: number
  /** Signed y-offsets (relative to ellipse center) of each line's baseline. */
  lineOffsets: number[]
  /** Total vertical span of the laid-out block. */
  blockHeight: number
}

type EllipseOptions = {
  paddingX?: number
  paddingY?: number
  /** Cap on how many lines we will try to fit. Defaults to a generous value. */
  maxLines?: number
}

/**
 * Lay out `text` inside an ellipse of size `width`×`height`, respecting the
 * ellipse's curvature so lines near the top and bottom get a narrower max
 * width than lines near the middle.
 *
 * Strategy: for each candidate line count N (starting at 1), compute the
 * maximum width available to each of the N vertically-centered lines given
 * the ellipse equation, then stream a layout using pretext's variable-width
 * line walker. If the text is fully consumed within N lines, we're done.
 * Otherwise, try N+1. We stop once N lines would no longer fit vertically
 * inside the ellipse (or once we hit `maxLines`).
 */
export const layoutTextInEllipse = (
  text: string,
  width: number,
  height: number,
  font: SvgFontSpec | string,
  lineHeight: number,
  options: EllipseOptions = {}
): EllipseLayout => {
  const fontString = typeof font === "string" ? font : toCanvasFont(font)
  const paddingX = options.paddingX ?? 0
  const paddingY = options.paddingY ?? 0
  const maxLinesCap = options.maxLines ?? 32

  const emptyLayout: EllipseLayout = {
    lines: [],
    lineHeight,
    lineOffsets: [],
    blockHeight: 0,
  }

  const trimmed = text ?? ""
  if (!trimmed) return emptyLayout

  const rx = Math.max(0, width / 2 - paddingX)
  const ry = Math.max(0, height / 2 - paddingY)
  if (rx <= 0 || ry <= 0) return emptyLayout

  const prepared = getPrepared(trimmed, fontString)

  // Max line count vertically feasible inside the ellipse.
  const verticalCap = Math.max(1, Math.floor((2 * ry) / lineHeight))
  const maxLines = Math.min(verticalCap, maxLinesCap)

  const isCursorAtEnd = (cursor: LayoutCursor): boolean => {
    const next = layoutNextLineRange(prepared, cursor, rx * 2)
    return next === null
  }

  const widthAtY = (y: number): number => {
    const bound = Math.min(Math.abs(y), ry)
    const ratio = bound / ry
    const factor = Math.sqrt(Math.max(0, 1 - ratio * ratio))
    return 2 * rx * factor
  }

  let bestLines: LayoutLine[] | null = null
  let bestOffsets: number[] = []

  for (let n = 1; n <= maxLines; n++) {
    const blockHeight = n * lineHeight
    const topY = -blockHeight / 2

    const widths: number[] = new Array(n)
    for (let i = 0; i < n; i++) {
      const lineTop = topY + i * lineHeight
      const lineBottom = lineTop + lineHeight
      // Worst-case edge of this line — whichever edge is farther from center.
      const edge = Math.max(Math.abs(lineTop), Math.abs(lineBottom))
      widths[i] = widthAtY(edge)
    }

    // Any zero-width line means the ellipse pinches to nothing here; no point
    // trying this N — lines at the extremes cannot hold any text.
    if (widths.some((w) => w <= 0)) break

    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
    const lines: LayoutLine[] = []
    let fits = true
    for (let i = 0; i < n; i++) {
      const range = layoutNextLineRange(prepared, cursor, widths[i])
      if (range === null) break // text fully consumed before reaching N lines
      lines.push(materializeLineRange(prepared, range))
      cursor = range.end
    }

    // If we filled all N slots, make sure nothing is left over.
    if (lines.length === n && !isCursorAtEnd(cursor)) fits = false

    if (fits) {
      const offsets = new Array(lines.length)
      // Re-center on actual consumed line count so short text doesn't sit with
      // phantom trailing space.
      const actualBlockHeight = lines.length * lineHeight
      const actualTop = -actualBlockHeight / 2
      for (let i = 0; i < lines.length; i++) {
        // Baseline sits at vertical center of each line's box.
        offsets[i] = actualTop + (i + 0.5) * lineHeight
      }
      return {
        lines,
        lineHeight,
        lineOffsets: offsets,
        blockHeight: actualBlockHeight,
      }
    }

    bestLines = lines
    const actualBlockHeight = lines.length * lineHeight
    const actualTop = -actualBlockHeight / 2
    bestOffsets = lines.map((_, i) => actualTop + (i + 0.5) * lineHeight)
  }

  // Could not fit all text. Return best effort — the caller can still render
  // what we have; any remaining content is visually clipped by the ellipse.
  if (bestLines && bestLines.length > 0) {
    return {
      lines: bestLines,
      lineHeight,
      lineOffsets: bestOffsets,
      blockHeight: bestLines.length * lineHeight,
    }
  }

  // Degenerate fallback: one line at maximum ellipse width. Pretext will still
  // wrap only as far as the word boundaries allow. Reuses the already-prepared
  // text from the loop above rather than re-preparing it.
  const natural = measureNaturalWidth(prepared)
  const fallbackWidth = Math.min(natural, rx * 2)
  const fallback = layoutNextLineRange(
    prepared,
    { segmentIndex: 0, graphemeIndex: 0 },
    Math.max(1, fallbackWidth)
  )
  if (!fallback) return emptyLayout
  return {
    lines: [materializeLineRange(prepared, fallback)],
    lineHeight,
    lineOffsets: [0],
    blockHeight: lineHeight,
  }
}
