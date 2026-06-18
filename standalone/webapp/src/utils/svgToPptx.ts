/**
 * Convert an Apollon-exported (compat-mode) SVG string into a flat sequence of
 * native PPTX shapes on a single slide. The goal is *animatability*: each
 * visible diagram element (rectangle, line, text label, arrowhead) becomes its
 * own `<p:sp>` so users can apply per-element animations from PowerPoint's
 * (or Keynote's) Animation panel.
 *
 * Coordinate strategy: PPTX uses inches; pixels → inches via PX_PER_INCH (96).
 * Apollon's SVG sets `viewBox="clip.x clip.y W H"`, so we subtract the clip
 * origin from every absolute coordinate. Inside each `.react-flow__node` group
 * the inner `<svg>` has its own viewBox that maps 1:1 onto its pixel size, so
 * we recurse with an accumulated transform.
 *
 * Paint inheritance: SVG lets a parent `<g>` set `stroke`, `fill`,
 * `stroke-width` etc. for its descendants. The walker carries an inherited
 * paint-style object so children that omit those attributes pick them up
 * (Apollon's use-case actor stick figure relies on this for its lines).
 *
 * Rotation: 2D affine matrices that came from `rotate()` are decomposed back
 * into rotation + scale + flip and applied to the emitted shape's `rotate`
 * property so PowerPoint/Keynote render them correctly.
 */
import type pptxgen from "pptxgenjs"
import { parsePath, pathBBox, type PathSegment, type Pt } from "./svgPathParser"
import type { DiagramFitOption } from "@/lib/pptxExportSettings"

const PX_PER_INCH = 96
const PT_PER_PX = 0.75

/**
 * Offset (in em) from the alphabetic baseline up to the point Apollon centres
 * labels on — Inter's middle baseline. Matches the `compat` export's
 * baseline-resolution constant, so PPTX text lands where the editor draws it.
 */
const BASELINE_TO_CENTER_EM = 0.25
/** Slack added to canvas-measured run width so glyph edges don't clip. */
const TEXT_BOX_HORIZONTAL_SLACK_FACTOR = 0.4
/** Lower bound on text-box width (in em) so very short runs still render. */
const TEXT_BOX_MIN_WIDTH_FACTOR = 1.5
/** Text-box height as a fraction of font-size (line-box rough estimate). */
const TEXT_BOX_HEIGHT_FACTOR = 1.35
/** Truncation point for animation-pane shape names. */
const SHAPE_NAME_LABEL_LIMIT = 40

type Mat = readonly [number, number, number, number, number, number]
const IDENTITY: Mat = [1, 0, 0, 1, 0, 0]

const apply = (m: Mat, p: Pt): Pt => ({
  x: m[0] * p.x + m[2] * p.y + m[4],
  y: m[1] * p.x + m[3] * p.y + m[5],
})

const multiply = (a: Mat, b: Mat): Mat => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
]

/**
 * Decompose an affine matrix into rotation (degrees) + uniform scale +
 * (optional) flip. We only emit a non-zero `rotate` when the rotation is
 * appreciable, otherwise PowerPoint adds tiny visual jitter.
 */
function decomposeRotation(m: Mat): {
  rotateDeg: number
  scaleX: number
  scaleY: number
} {
  const a = m[0]
  const b = m[1]
  const c = m[2]
  const d = m[3]
  const scaleX = Math.sqrt(a * a + b * b) || 1
  const scaleY = Math.sqrt(c * c + d * d) || 1
  // Determinant negative → reflection. We don't carry that into shape flipH/V
  // because Apollon's compat-mode export doesn't reflect anything.
  const rotateRad = Math.atan2(b, a)
  const rotateDeg = (rotateRad * 180) / Math.PI
  return {
    rotateDeg: Math.abs(rotateDeg) < 0.01 ? 0 : rotateDeg,
    scaleX,
    scaleY,
  }
}

/** Parse `transform="..."` supporting translate(), matrix(), scale(), rotate(). */
function parseTransform(value: string | null): Mat {
  if (!value) return IDENTITY
  let m: Mat = IDENTITY
  const re = /(translate|matrix|scale|rotate)\s*\(([^)]*)\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(value)) !== null) {
    const fn = match[1]
    const nums = match[2]
      .split(/[\s,]+/)
      .filter((s) => s.length > 0)
      .map(Number)
    if (fn === "translate") {
      const tx = nums[0] || 0
      const ty = nums[1] || 0
      m = multiply(m, [1, 0, 0, 1, tx, ty])
    } else if (fn === "matrix" && nums.length === 6) {
      m = multiply(m, [nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]])
    } else if (fn === "scale") {
      const sx = nums[0] || 1
      const sy = nums.length > 1 ? nums[1] : sx
      m = multiply(m, [sx, 0, 0, sy, 0, 0])
    } else if (fn === "rotate") {
      const a = ((nums[0] || 0) * Math.PI) / 180
      const cos = Math.cos(a)
      const sin = Math.sin(a)
      const cx = nums[1] || 0
      const cy = nums[2] || 0
      if (cx || cy) {
        m = multiply(m, [1, 0, 0, 1, cx, cy])
        m = multiply(m, [cos, sin, -sin, cos, 0, 0])
        m = multiply(m, [1, 0, 0, 1, -cx, -cy])
      } else {
        m = multiply(m, [cos, sin, -sin, cos, 0, 0])
      }
    }
  }
  return m
}

/**
 * Subset of CSS named colors that Apollon's compat-mode export can produce
 * after CSS-variable resolution. Hoisted to module scope to avoid per-call
 * allocation.
 */
const NAMED_COLORS: Record<string, string> = {
  black: "000000",
  white: "FFFFFF",
  red: "FF0000",
  green: "008000",
  blue: "0000FF",
  gray: "808080",
  grey: "808080",
}

type ResolvedColor = { hex: string; alpha: number }

const hexByte = (n: number) =>
  Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0")

/**
 * Resolve a color string ("#rgb", "#rrggbb", "#rrggbbaa", "rgb(…)", "rgba(…)",
 * or named) into a 6-char uppercase hex plus an alpha channel in [0, 1].
 *
 * Returns null for "none" / "transparent" / unrecognized so callers can decide
 * whether to skip emission. `currentColor` returns null too — Apollon's compat
 * mode resolves these upstream, so seeing one in the export is a contract
 * violation worth letting bubble up as "missing fill" rather than silently
 * substituting.
 */
function resolveColor(raw: string | null | undefined): ResolvedColor | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v || v === "none" || v === "transparent" || v === "currentColor")
    return null
  if (v.startsWith("#")) {
    const hex = v.slice(1)
    if (hex.length === 3) {
      return {
        hex: (
          hex[0] +
          hex[0] +
          hex[1] +
          hex[1] +
          hex[2] +
          hex[2]
        ).toUpperCase(),
        alpha: 1,
      }
    }
    if (hex.length === 6) return { hex: hex.toUpperCase(), alpha: 1 }
    if (hex.length === 8) {
      const alpha = parseInt(hex.slice(6, 8), 16) / 255
      return {
        hex: hex.slice(0, 6).toUpperCase(),
        alpha: Number.isFinite(alpha) ? alpha : 1,
      }
    }
    return null
  }
  if (v.startsWith("rgb")) {
    const nums = v
      .replace(/[^\d.,-]/g, "")
      .split(",")
      .map(Number)
    if (nums.length >= 3 && nums.slice(0, 3).every(Number.isFinite)) {
      const [r, g, b, a] = nums
      const alpha = nums.length >= 4 && Number.isFinite(a) ? a : 1
      return {
        hex: (hexByte(r) + hexByte(g) + hexByte(b)).toUpperCase(),
        alpha,
      }
    }
    return null
  }
  const named = NAMED_COLORS[v.toLowerCase()]
  return named ? { hex: named, alpha: 1 } : null
}

function styleToObject(s: string | null): Record<string, string> {
  const r: Record<string, string> = {}
  if (!s) return r
  for (const decl of s.split(";")) {
    const [k, ...rest] = decl.split(":")
    if (k && rest.length) r[k.trim()] = rest.join(":").trim()
  }
  return r
}

function getAttr(el: Element, name: string, style: Record<string, string>) {
  return el.getAttribute(name) ?? style[name] ?? null
}

function getNum(
  el: Element,
  name: string,
  style: Record<string, string>,
  fallback: number
): number {
  const v = getAttr(el, name, style)
  if (v == null) return fallback
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Map an SVG `stroke-dasharray` to one of the OOXML preset dash kinds. Lossy
 * — pptxgenjs doesn't expose custom dash arrays — but covers the dotted /
 * short-dash / long-dash families Apollon emits.
 */
function dashType(
  value: string | null
): "dash" | "dashDot" | "sysDot" | undefined {
  if (!value || value === "none" || value === "0") return undefined
  const tokens = value
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite)
  if (tokens.length === 0) return undefined
  const sum = tokens.reduce((a, b) => a + b, 0)
  if (sum < 6) return "sysDot"
  if (tokens.length >= 4) return "dashDot"
  return "dash"
}

/* ------------------------------------------------------------------ */
/* Inherited paint                                                     */
/* ------------------------------------------------------------------ */

type PaintStyle = {
  fill: string | null
  stroke: string | null
  strokeWidth: number
  strokeDash: string | null
  opacity: number
  fillOpacity: number
  strokeOpacity: number
}

const DEFAULT_PAINT: PaintStyle = {
  // SVG spec default for fill is black; default stroke is none.
  fill: "000000",
  stroke: null,
  strokeWidth: 1,
  strokeDash: null,
  opacity: 1,
  fillOpacity: 1,
  strokeOpacity: 1,
}

/**
 * Parse a numeric SVG attribute, falling back to `parent` when the value is
 * absent OR malformed (NaN). Crucially treats `0` as a valid input: a
 * `||`-style fallback would reinterpret legal `stroke-width="0"` or
 * `opacity="0"` as "inherit", which is wrong per SVG spec.
 */
const parseNumOrInherit = (raw: string | null, parent: number): number => {
  if (raw === null) return parent
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : parent
}

const WHITE_HEX = "FFFFFF"

function inheritPaint(
  el: Element,
  style: Record<string, string>,
  parent: PaintStyle
): PaintStyle {
  const fillRaw = getAttr(el, "fill", style)
  const strokeRaw = getAttr(el, "stroke", style)
  const swRaw = getAttr(el, "stroke-width", style)
  const sdRaw = getAttr(el, "stroke-dasharray", style)
  const opRaw = getAttr(el, "opacity", style)
  const foRaw = getAttr(el, "fill-opacity", style)
  const soRaw = getAttr(el, "stroke-opacity", style)

  const fillResolved = fillRaw === null ? null : resolveColor(fillRaw)
  const strokeResolved = strokeRaw === null ? null : resolveColor(strokeRaw)

  return {
    fill:
      fillRaw === null
        ? parent.fill
        : fillRaw === "none" || fillRaw === "transparent"
          ? null
          : (fillResolved?.hex ?? parent.fill),
    stroke:
      strokeRaw === null
        ? parent.stroke
        : strokeRaw === "none" || strokeRaw === "transparent"
          ? null
          : (strokeResolved?.hex ?? parent.stroke),
    strokeWidth: parseNumOrInherit(swRaw, parent.strokeWidth),
    strokeDash: sdRaw ?? parent.strokeDash,
    opacity: parseNumOrInherit(opRaw, parent.opacity),
    // Multiply any rgba/#rrggbbaa alpha into the corresponding paint-opacity
    // so callers see one channel; SVG spec lets fill-opacity and the color's
    // own alpha both contribute, and PPTX has only one transparency knob.
    fillOpacity:
      parseNumOrInherit(foRaw, parent.fillOpacity) * (fillResolved?.alpha ?? 1),
    strokeOpacity:
      parseNumOrInherit(soRaw, parent.strokeOpacity) *
      (strokeResolved?.alpha ?? 1),
  }
}

function fillProps(p: PaintStyle): pptxgen.ShapeFillProps {
  if (!p.fill) return { type: "none" }
  const a = p.opacity * p.fillOpacity
  if (a <= 0) return { type: "none" }
  return {
    type: "solid",
    color: p.fill,
    transparency: Math.round((1 - a) * 100),
  }
}

function lineProps(ctx: EmitContext, p: PaintStyle): pptxgen.ShapeLineProps {
  if (!p.stroke || p.strokeWidth <= 0) return { type: "none" }
  const a = p.opacity * p.strokeOpacity
  if (a <= 0) return { type: "none" }
  return {
    type: "solid",
    color: p.stroke,
    width: toStrokePt(ctx, p.strokeWidth),
    transparency: Math.round((1 - a) * 100),
    dashType: dashType(p.strokeDash),
  }
}

/* ------------------------------------------------------------------ */
/* Shape emit context                                                  */
/* ------------------------------------------------------------------ */

/**
 * The viewport defines how a point in SVG-px space (with origin at the
 * diagram's clip) is projected onto the PPTX slide canvas (in inches).
 *
 * For "fit" slide-size, scale=1/96 (px → in) and offset=0.
 * For fixed slide sizes, scale shrinks the diagram so it fits inside the
 * canvas (no enlargement past 1× in/px), and offset centres it.
 */
type SlideViewport = {
  /** Slide width in inches. */
  slideWidth: number
  /** Slide height in inches. */
  slideHeight: number
  /** Multiplier applied to every linear length in SVG-px (1 = unscaled). */
  scale: number
  /** Slide x-origin in inches for the diagram's clip top-left. */
  offsetX: number
  /** Slide y-origin in inches for the diagram's clip top-left. */
  offsetY: number
}

type EmitContext = {
  pres: pptxgen
  slide: pptxgen.Slide
  clipX: number
  clipY: number
  viewport: SlideViewport
  counter: { n: number }
  ownerName: string | null
  /** Font face actually written to the PPTX. */
  exportFontFace: string
  measureText: (
    text: string,
    fontSize: number,
    bold: boolean,
    italic: boolean,
    fontFace: string
  ) => number
}

const toSlideX = (ctx: EmitContext, x: number): number =>
  (x - ctx.clipX) * (ctx.viewport.scale / PX_PER_INCH) + ctx.viewport.offsetX
const toSlideY = (ctx: EmitContext, y: number): number =>
  (y - ctx.clipY) * (ctx.viewport.scale / PX_PER_INCH) + ctx.viewport.offsetY
const toSlideSize = (ctx: EmitContext, s: number): number =>
  s * (ctx.viewport.scale / PX_PER_INCH)
const toFontPt = (ctx: EmitContext, fsPx: number): number =>
  fsPx * ctx.viewport.scale * PT_PER_PX
const toStrokePt = (ctx: EmitContext, swPx: number): number =>
  swPx * ctx.viewport.scale * PT_PER_PX

/**
 * Apollon renders text in `Inter, system-ui, Avenir, Helvetica, Arial,
 * sans-serif`. PPTX/OOXML stores a single font name with no fallback chain,
 * so we have to pick one that's actually installed wherever the file is
 * opened. Mac users (and the receiving Mac viewers) get SF Pro Text — the
 * system font that drives `system-ui` in their browser preview, so the
 * exported file matches what they saw on screen. Everyone else gets Inter.
 */
function detectExportFontFace(override?: string): string {
  if (override) return override
  if (typeof navigator === "undefined") return "Inter"
  const ua = navigator.userAgent || ""
  // `navigator.platform` is partially deprecated but still the most reliable
  // Mac signal in practice; fall back to userAgent.
  const platform =
    (navigator as Navigator & { platform?: string }).platform || ""
  const isMac = /Mac|iPhone|iPad|iPod/.test(platform) || /Macintosh/.test(ua)
  return isMac ? "SF Pro Text" : "Inter"
}

/**
 * Apollon-default font-family tokens that should be rewritten to whatever the
 * user picked at export time; explicit non-generic names are preserved.
 */
const APOLLON_GENERIC_FONTS = new Set([
  "inter",
  "system-ui",
  "-apple-system",
  "blinkmacsystemfont",
  "avenir",
  "helvetica",
  "arial",
  "sans-serif",
  "",
])

/**
 * Decide what font to emit for a given SVG run. If the SVG declared the
 * Apollon system stack ("Inter", "system-ui", "sans-serif" etc.) we override
 * with the chosen export font; if it's an explicit family we respect it.
 */
function resolveExportFontFace(
  svgFontFace: string,
  exportFace: string
): string {
  const normalized = svgFontFace.trim().toLowerCase()
  return APOLLON_GENERIC_FONTS.has(normalized) ? exportFace : svgFontFace
}

function nextName(ctx: EmitContext, kind: string): string {
  ctx.counter.n++
  const owner = ctx.ownerName ? `${ctx.ownerName} · ` : ""
  return `${owner}${kind} ${ctx.counter.n}`
}

/* ------------------------------------------------------------------ */
/* Emitters                                                            */
/* ------------------------------------------------------------------ */

function emitRect(
  ctx: EmitContext,
  el: Element,
  ctm: Mat,
  paint: PaintStyle,
  style: Record<string, string>
) {
  const x = getNum(el, "x", style, 0)
  const y = getNum(el, "y", style, 0)
  const w = getNum(el, "width", style, 0)
  const h = getNum(el, "height", style, 0)
  if (w <= 0 || h <= 0) return
  if (isRedundantWhiteBackgroundRect(paint)) return
  const rx = getNum(el, "rx", style, 0)
  const ry = getNum(el, "ry", style, rx)

  const { rotateDeg } = decomposeRotation(ctm)
  // We compute the axis-aligned bbox in *unrotated* space (origin at the
  // rect's local 0,0) then translate the bbox center via CTM and ask PPTX to
  // rotate around it. PPTX rotates around the shape's center.
  const localCenter = { x: x + w / 2, y: y + h / 2 }
  const center = apply(ctm, localCenter)
  const topLeftSvgX = center.x - w / 2
  const topLeftSvgY = center.y - h / 2

  const isRound = Math.max(rx, ry) > 0
  const radius = Math.max(rx, ry)
  const minSide = Math.min(w, h)
  const radiusFrac =
    isRound && minSide > 0 ? Math.min(0.5, radius / minSide) : 0

  const props: pptxgen.ShapeProps = {
    x: toSlideX(ctx, topLeftSvgX),
    y: toSlideY(ctx, topLeftSvgY),
    w: toSlideSize(ctx, w),
    h: toSlideSize(ctx, h),
    rotate: rotateDeg,
    fill: fillProps(paint),
    line: lineProps(ctx, paint),
    ...(isRound ? { rectRadius: radiusFrac } : {}),
    objectName: nextName(ctx, isRound ? "Rounded rect" : "Rect"),
  }

  ctx.slide.addShape(
    isRound ? ctx.pres.ShapeType.roundRect : ctx.pres.ShapeType.rect,
    props
  )
}

function isRedundantWhiteBackgroundRect(paint: PaintStyle): boolean {
  const hasVisibleStroke =
    !!paint.stroke && paint.opacity * paint.strokeOpacity > 0
  const hasWhiteFill =
    paint.fill === WHITE_HEX && paint.opacity * paint.fillOpacity > 0

  return hasWhiteFill && !hasVisibleStroke
}

function emitEllipse(
  ctx: EmitContext,
  el: Element,
  ctm: Mat,
  paint: PaintStyle,
  style: Record<string, string>,
  isCircle: boolean
) {
  const cx = getNum(el, "cx", style, 0)
  const cy = getNum(el, "cy", style, 0)
  let rx: number
  let ry: number
  if (isCircle) {
    const r = getNum(el, "r", style, 0)
    rx = r
    ry = r
  } else {
    rx = getNum(el, "rx", style, 0)
    ry = getNum(el, "ry", style, 0)
  }
  if (rx <= 0 || ry <= 0) return
  const { rotateDeg, scaleX, scaleY } = decomposeRotation(ctm)
  const center = apply(ctm, { x: cx, y: cy })
  const w = 2 * rx * scaleX
  const h = 2 * ry * scaleY
  const topLeftSvgX = center.x - w / 2
  const topLeftSvgY = center.y - h / 2

  ctx.slide.addShape(ctx.pres.ShapeType.ellipse, {
    x: toSlideX(ctx, topLeftSvgX),
    y: toSlideY(ctx, topLeftSvgY),
    w: toSlideSize(ctx, w),
    h: toSlideSize(ctx, h),
    rotate: rotateDeg,
    fill: fillProps(paint),
    line: lineProps(ctx, paint),
    objectName: nextName(ctx, isCircle ? "Circle" : "Ellipse"),
  })
}

function emitLine(
  ctx: EmitContext,
  el: Element,
  ctm: Mat,
  paint: PaintStyle,
  style: Record<string, string>
) {
  const x1 = getNum(el, "x1", style, 0)
  const y1 = getNum(el, "y1", style, 0)
  const x2 = getNum(el, "x2", style, 0)
  const y2 = getNum(el, "y2", style, 0)
  const p1 = apply(ctm, { x: x1, y: y1 })
  const p2 = apply(ctm, { x: x2, y: y2 })
  if (!paint.stroke) return

  const minSvgX = Math.min(p1.x, p2.x)
  const minSvgY = Math.min(p1.y, p2.y)
  const w = Math.abs(p2.x - p1.x)
  const h = Math.abs(p2.y - p1.y)
  const flipH = p1.x > p2.x
  const flipV = p1.y > p2.y

  ctx.slide.addShape(ctx.pres.ShapeType.line, {
    x: toSlideX(ctx, minSvgX),
    y: toSlideY(ctx, minSvgY),
    w: toSlideSize(ctx, Math.max(w, 0.0001)),
    h: toSlideSize(ctx, Math.max(h, 0.0001)),
    flipH,
    flipV,
    line: lineProps(ctx, paint),
    objectName: nextName(ctx, "Line"),
  })
}

function emitPolygonOrPolyline(
  ctx: EmitContext,
  el: Element,
  ctm: Mat,
  paint: PaintStyle,
  closed: boolean
) {
  const pointsAttr = el.getAttribute("points") ?? ""
  const nums = pointsAttr
    .split(/[\s,]+/)
    .filter((s) => s.length > 0)
    .map(Number)
  if (nums.length < 4) return
  const pts: Pt[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push(apply(ctm, { x: nums[i], y: nums[i + 1] }))
  }
  const segs: PathSegment[] = []
  segs.push({ type: "M", pt: pts[0] })
  for (let i = 1; i < pts.length; i++) segs.push({ type: "L", pt: pts[i] })
  if (closed) segs.push({ type: "Z" })
  emitPathSegments(
    ctx,
    segs,
    paint,
    el.hasAttribute("data-inline-marker")
      ? "Arrowhead"
      : closed
        ? "Polygon"
        : "Polyline"
  )
}

function emitPath(ctx: EmitContext, el: Element, ctm: Mat, paint: PaintStyle) {
  const d = el.getAttribute("d")
  if (!d) return
  const localSegs = parsePath(d)
  const segs: PathSegment[] = localSegs.map((s) => {
    if (s.type === "M") return { type: "M", pt: apply(ctm, s.pt) }
    if (s.type === "L") return { type: "L", pt: apply(ctm, s.pt) }
    if (s.type === "C")
      return {
        type: "C",
        c1: apply(ctm, s.c1),
        c2: apply(ctm, s.c2),
        pt: apply(ctm, s.pt),
      }
    return { type: "Z" }
  })
  emitPathSegments(
    ctx,
    segs,
    paint,
    el.hasAttribute("data-inline-marker") ? "Arrowhead" : "Path"
  )
}

type PathKind = "Path" | "Polygon" | "Polyline" | "Arrowhead"
type PptxPoints = NonNullable<pptxgen.ShapeProps["points"]>
// pptxgenjs accepts a string here at runtime even though the typed enum
// (still) omits "custGeom" in v4.0.1; cast once, document why.
const CUST_GEOM = "custGeom" as unknown as pptxgen.ShapeType

const isFinitePoint = (...vs: number[]) => vs.every(Number.isFinite)

function emitPathSegments(
  ctx: EmitContext,
  segs: PathSegment[],
  paint: PaintStyle,
  kind: PathKind
) {
  if (segs.length === 0) return
  const bbox = pathBBox(segs)
  // Pad bbox by half the stroke width so PPTX path-w/path-h doesn't clip the
  // stroke itself when an endpoint sits exactly on the bbox edge.
  const pad = Math.max(0.5, paint.strokeWidth / 2)
  const bx = bbox.x - pad
  const by = bbox.y - pad
  const bw = Math.max(bbox.width + pad * 2, 0.001)
  const bh = Math.max(bbox.height + pad * 2, 0.001)

  const points: PptxPoints = []
  let started = false
  for (const s of segs) {
    if (s.type === "M") {
      if (!isFinitePoint(s.pt.x, s.pt.y)) continue
      points.push({
        x: toSlideSize(ctx, s.pt.x - bx),
        y: toSlideSize(ctx, s.pt.y - by),
        moveTo: started,
      })
      started = true
    } else if (s.type === "L") {
      if (!isFinitePoint(s.pt.x, s.pt.y)) continue
      points.push({
        x: toSlideSize(ctx, s.pt.x - bx),
        y: toSlideSize(ctx, s.pt.y - by),
      })
    } else if (s.type === "C") {
      if (!isFinitePoint(s.pt.x, s.pt.y, s.c1.x, s.c1.y, s.c2.x, s.c2.y))
        continue
      points.push({
        x: toSlideSize(ctx, s.pt.x - bx),
        y: toSlideSize(ctx, s.pt.y - by),
        curve: {
          type: "cubic",
          x1: toSlideSize(ctx, s.c1.x - bx),
          y1: toSlideSize(ctx, s.c1.y - by),
          x2: toSlideSize(ctx, s.c2.x - bx),
          y2: toSlideSize(ctx, s.c2.y - by),
        },
      })
    } else if (s.type === "Z") {
      points.push({ close: true })
    }
  }
  if (points.length === 0) return

  ctx.slide.addShape(CUST_GEOM, {
    x: toSlideX(ctx, bx),
    y: toSlideY(ctx, by),
    w: toSlideSize(ctx, bw),
    h: toSlideSize(ctx, bh),
    points,
    fill: fillProps(paint),
    line: lineProps(ctx, paint),
    objectName: nextName(ctx, kind),
  })
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

type TextStyle = {
  fontFace: string
  fontSize: number // px
  bold: boolean
  italic: boolean
  underline: boolean
  color: string | null
  textAnchor: "start" | "middle" | "end"
}

const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFace: "Inter",
  fontSize: 14,
  bold: false,
  italic: false,
  underline: false,
  color: "000000",
  textAnchor: "start",
}

/**
 * Parse a font-size value (with unit handling for `%`, `em`, `pt`, `px`,
 * unitless). Relative units are resolved against the inherited size.
 */
function parseFontSize(raw: string, inherited: number): number {
  const m = /^(-?\d*\.?\d+)\s*([a-zA-Z%]*)$/.exec(raw.trim())
  if (!m) return inherited
  const n = parseFloat(m[1])
  const unit = m[2].toLowerCase()
  if (unit === "%") return (n / 100) * inherited
  if (unit === "em") return n * inherited
  if (unit === "pt") return n / PT_PER_PX
  // px or unitless → px
  return n
}

function readTextStyle(
  el: Element,
  style: Record<string, string>,
  inherit: TextStyle
): TextStyle {
  const fontFamily = getAttr(el, "font-family", style) ?? inherit.fontFace
  const fontSizeRaw = getAttr(el, "font-size", style)
  const fontSize = fontSizeRaw
    ? parseFontSize(fontSizeRaw, inherit.fontSize)
    : inherit.fontSize
  const fwRaw = getAttr(el, "font-weight", style)
  const bold = fwRaw
    ? fwRaw === "bold" || fwRaw === "bolder" || (Number(fwRaw) || 0) >= 600
    : inherit.bold
  const fsRaw = getAttr(el, "font-style", style)
  const italic = fsRaw
    ? fsRaw === "italic" || fsRaw === "oblique"
    : inherit.italic
  const tdRaw = getAttr(el, "text-decoration", style)
  const underline = tdRaw ? /underline/.test(tdRaw) : inherit.underline
  const fill = getAttr(el, "fill", style)
  const color =
    fill === null
      ? inherit.color
      : fill === "none" || fill === "transparent"
        ? inherit.color
        : (resolveColor(fill)?.hex ?? inherit.color)
  const taRaw = getAttr(el, "text-anchor", style) as
    | TextStyle["textAnchor"]
    | null
  const textAnchor = taRaw ?? inherit.textAnchor

  return {
    fontFace: fontFamily.split(",")[0].trim().replace(/['"]/g, ""),
    fontSize,
    bold,
    italic,
    underline,
    color,
    textAnchor,
  }
}

/** Browser-side text width measurer using a single shared canvas. */
function makeCanvasMeasurer(): EmitContext["measureText"] {
  if (typeof document === "undefined") {
    // Node/jsdom path — fall back to a heuristic.
    return (text, fontSize, bold) => {
      const factor = bold ? 0.62 : 0.55
      return text.length * fontSize * factor
    }
  }
  const canvas = document.createElement("canvas")
  const ctx2d = canvas.getContext("2d")
  if (!ctx2d) {
    return (text, fontSize, bold) => {
      const factor = bold ? 0.62 : 0.55
      return text.length * fontSize * factor
    }
  }
  return (text, fontSize, bold, italic, fontFace) => {
    const weight = bold ? "700" : "400"
    const styleStr = italic ? "italic" : "normal"
    ctx2d.font = `${styleStr} ${weight} ${fontSize}px ${fontFace || "Inter"}, system-ui, Arial, sans-serif`
    return ctx2d.measureText(text).width
  }
}

type TextRun = { text: string; style: TextStyle }
type TextLine = {
  runs: TextRun[]
  anchorX: number
  baselineY: number
  textAnchor: "start" | "middle" | "end"
}

function buildTextLines(
  textEl: Element,
  ctm: Mat,
  inheritStyle: TextStyle
): TextLine[] {
  const textStyleSelf = readTextStyle(
    textEl,
    styleToObject(textEl.getAttribute("style")),
    inheritStyle
  )
  const baseX = getNum(textEl, "x", {}, 0)
  const baseY = getNum(textEl, "y", {}, 0)
  const out: TextLine[] = []
  let curLine: TextLine | null = null
  let cursorX = baseX
  let cursorY = baseY

  const flush = () => {
    if (curLine && curLine.runs.length > 0) out.push(curLine)
    curLine = null
  }
  const newLineAt = (x: number, y: number, anchor: TextLine["textAnchor"]) => {
    flush()
    const p = apply(ctm, { x, y })
    curLine = { runs: [], anchorX: p.x, baselineY: p.y, textAnchor: anchor }
  }

  newLineAt(cursorX, cursorY, textStyleSelf.textAnchor)

  const walk = (node: Node, inherited: TextStyle) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const s = node.textContent ?? ""
      if (s.length > 0 && curLine) {
        curLine.runs.push({ text: s, style: inherited })
      }
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    if (el.tagName.toLowerCase() !== "tspan") {
      el.childNodes.forEach((c) => walk(c, inherited))
      return
    }
    const tspanStyle = readTextStyle(
      el,
      styleToObject(el.getAttribute("style")),
      inherited
    )
    const xAttr = el.getAttribute("x")
    const yAttr = el.getAttribute("y")
    const dxAttr = el.getAttribute("dx")
    const dyAttr = el.getAttribute("dy")
    const dy = dyAttr !== null ? parseFloat(dyAttr) || 0 : 0
    const dx = dxAttr !== null ? parseFloat(dxAttr) || 0 : 0
    // A tspan starts a new line if it sets x/y or has a non-zero dy. A pure
    // dx is an in-line cursor advance, NOT a line break.
    const startsNewLine = xAttr !== null || yAttr !== null || dy !== 0
    if (startsNewLine) {
      const newX = xAttr !== null ? parseFloat(xAttr) : cursorX + dx
      const newY = yAttr !== null ? parseFloat(yAttr) : cursorY + dy
      cursorX = newX
      cursorY = newY
      newLineAt(newX, newY, tspanStyle.textAnchor)
    } else if (dx !== 0) {
      // Approximate the dx by padding the next run with leading spaces — we
      // can't truly inject horizontal whitespace inside an addText() run set,
      // but PPTX preserves leading space.
      cursorX += dx
    }
    el.childNodes.forEach((c) => walk(c, tspanStyle))
  }

  textEl.childNodes.forEach((c) => walk(c, textStyleSelf))
  flush()
  return out
}

function emitTextLines(
  ctx: EmitContext,
  lines: TextLine[],
  ownerLabel: string,
  ctm: Mat
) {
  const { rotateDeg } = decomposeRotation(ctm)
  for (const line of lines) {
    if (line.runs.length === 0) continue
    const fullText = line.runs.map((r) => r.text).join("")
    if (!fullText.trim()) continue
    const dominant = line.runs[0].style
    const fontSize = dominant.fontSize
    const dominantExportFace = resolveExportFontFace(
      dominant.fontFace,
      ctx.exportFontFace
    )
    let totalWidthPx = 0
    for (const r of line.runs) {
      const runFace = resolveExportFontFace(
        r.style.fontFace,
        ctx.exportFontFace
      )
      totalWidthPx += ctx.measureText(
        r.text,
        r.style.fontSize,
        r.style.bold,
        r.style.italic,
        runFace
      )
    }
    // Tight box; autoFit=false and wrap=false make PPTX render the run as-is.
    // The horizontal slack avoids one-pixel clipping at edge glyphs in
    // PowerPoint (it adds a tiny inset).
    const widthPx = Math.max(
      totalWidthPx + fontSize * TEXT_BOX_HORIZONTAL_SLACK_FACTOR,
      fontSize * TEXT_BOX_MIN_WIDTH_FACTOR
    )
    const heightPx = fontSize * TEXT_BOX_HEIGHT_FACTOR

    let leftPx: number
    if (line.textAnchor === "middle") leftPx = line.anchorX - widthPx / 2
    else if (line.textAnchor === "end") leftPx = line.anchorX - widthPx
    else leftPx = line.anchorX
    // SVG `<text y>` is the alphabetic baseline (the compat export resolves
    // dominant-baseline into it). Apollon centres labels on a point
    // BASELINE_TO_CENTER_EM above the baseline (Inter's middle-baseline metric,
    // the same offset the export used to bake the baseline); the box is emitted
    // with `valign:"middle"`, so the box top is that centre minus half the box.
    const topPx =
      line.baselineY - fontSize * BASELINE_TO_CENTER_EM - heightPx / 2

    const align: "left" | "center" | "right" =
      line.textAnchor === "middle"
        ? "center"
        : line.textAnchor === "end"
          ? "right"
          : "left"

    const ownerName = `${ownerLabel}`
    ctx.counter.n++

    ctx.slide.addText(
      line.runs.map((r) => ({
        text: r.text,
        options: {
          fontFace: resolveExportFontFace(r.style.fontFace, ctx.exportFontFace),
          fontSize: toFontPt(ctx, r.style.fontSize),
          bold: r.style.bold,
          italic: r.style.italic,
          underline: r.style.underline ? { style: "sng" } : undefined,
          color: r.style.color ?? "000000",
        },
      })),
      {
        x: toSlideX(ctx, leftPx),
        y: toSlideY(ctx, topPx),
        w: toSlideSize(ctx, widthPx),
        h: toSlideSize(ctx, heightPx),
        rotate: rotateDeg,
        align,
        valign: "middle",
        margin: 0,
        fontFace: dominantExportFace,
        fontSize: toFontPt(ctx, dominant.fontSize),
        bold: dominant.bold,
        italic: dominant.italic,
        color: dominant.color ?? "000000",
        fill: { type: "none" },
        line: { type: "none" },
        wrap: false,
        autoFit: false,
        objectName: `${ownerName} · "${fullText.trim().slice(0, SHAPE_NAME_LABEL_LIMIT)}"`,
      }
    )
  }
}

/* ------------------------------------------------------------------ */
/* Walker                                                              */
/* ------------------------------------------------------------------ */

function walk(
  ctx: EmitContext,
  el: Element,
  ctm: Mat,
  inheritedTextStyle: TextStyle,
  inheritedPaint: PaintStyle
) {
  const tag = el.tagName.toLowerCase()

  if (
    tag === "defs" ||
    tag === "style" ||
    tag === "clippath" ||
    tag === "mask" ||
    tag === "filter" ||
    tag === "marker" ||
    tag === "title" ||
    tag === "desc" ||
    tag === "metadata"
  ) {
    return
  }

  const elStyle = styleToObject(el.getAttribute("style"))
  const display = getAttr(el, "display", elStyle)
  const vis = getAttr(el, "visibility", elStyle)
  if (display === "none" || vis === "hidden") return

  const tf = parseTransform(el.getAttribute("transform"))
  const localCtm = multiply(ctm, tf)
  const paint = inheritPaint(el, elStyle, inheritedPaint)

  if (tag === "svg" || tag === "g" || tag === "a" || tag === "symbol") {
    const childTextStyle = readTextStyle(el, elStyle, inheritedTextStyle)
    let childCtm = localCtm
    if (tag === "svg") {
      const svgX = getNum(el, "x", elStyle, 0)
      const svgY = getNum(el, "y", elStyle, 0)
      if (svgX || svgY) {
        childCtm = multiply(childCtm, [1, 0, 0, 1, svgX, svgY])
      }
    }
    el.childNodes.forEach((c) => {
      if (c.nodeType === Node.ELEMENT_NODE) {
        walk(ctx, c as Element, childCtm, childTextStyle, paint)
      }
    })
    return
  }

  if (tag === "rect") return emitRect(ctx, el, localCtm, paint, elStyle)
  if (tag === "circle")
    return emitEllipse(ctx, el, localCtm, paint, elStyle, true)
  if (tag === "ellipse")
    return emitEllipse(ctx, el, localCtm, paint, elStyle, false)
  if (tag === "line") return emitLine(ctx, el, localCtm, paint, elStyle)
  if (tag === "polygon")
    return emitPolygonOrPolyline(ctx, el, localCtm, paint, true)
  if (tag === "polyline")
    return emitPolygonOrPolyline(ctx, el, localCtm, paint, false)
  if (tag === "path") return emitPath(ctx, el, localCtm, paint)
  if (tag === "text") {
    const lines = buildTextLines(el, localCtm, inheritedTextStyle)
    emitTextLines(ctx, lines, ctx.ownerName ?? "Label", localCtm)
    return
  }
  if (tag === "foreignobject") return

  // Unknown element: recurse so we don't drop nested children.
  el.childNodes.forEach((c) => {
    if (c.nodeType === Node.ELEMENT_NODE) {
      walk(ctx, c as Element, localCtm, inheritedTextStyle, paint)
    }
  })
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export type SvgToPptxOptions = {
  /**
   * Slide background color as a 6-char hex (no `#`). Pass `null` to omit any
   * background and inherit the slide-master default (effectively transparent
   * inside PowerPoint, since the master is white but no override is written).
   */
  background?: string | null
  /**
   * Override the font face emitted into the PPTX. When omitted, defaults to
   * "SF Pro Text" on Mac/iOS exporters and "Inter" everywhere else.
   */
  fontFace?: string
  /**
   * Pre-computed viewport (slide canvas size and SVG→slide transform). When
   * omitted the converter assumes "fit to content" and the slide canvas
   * matches the diagram clip 1:1.
   */
  viewport?: SlideViewport
}

/**
 * Compute the viewport (slide-canvas size + SVG→slide transform) for a given
 * clip, slide-canvas, fit mode, and source scale. The diagram is centred in
 * the canvas. When `slideCanvasInches` is omitted, the canvas matches the
 * scaled diagram exactly and `fit` is ignored.
 *
 * The slide canvas is clamped to a 1″ minimum because PowerPoint refuses to
 * open files with sub-1″ slides on some renderer paths (observed on Office
 * for Mac 16.x); the diagram still anchors at (0, 0) inside that minimum.
 */
export function computeSlideViewport(
  clip: { width: number; height: number },
  slideCanvasInches?: { width: number; height: number },
  fit: DiagramFitOption = "shrink",
  sourceScale = 1
): SlideViewport {
  const clipWidthIn = clip.width / PX_PER_INCH
  const clipHeightIn = clip.height / PX_PER_INCH
  const normalizedSourceScale = Math.max(sourceScale, 0.0001)
  if (!slideCanvasInches) {
    return {
      slideWidth: Math.max(clipWidthIn * normalizedSourceScale, 1),
      slideHeight: Math.max(clipHeightIn * normalizedSourceScale, 1),
      scale: normalizedSourceScale,
      offsetX: 0,
      offsetY: 0,
    }
  }
  const desiredWidth = clipWidthIn * normalizedSourceScale
  const desiredHeight = clipHeightIn * normalizedSourceScale
  const fitFactor = Math.min(
    slideCanvasInches.width / Math.max(desiredWidth, 0.0001),
    slideCanvasInches.height / Math.max(desiredHeight, 0.0001)
  )
  let scale: number
  switch (fit) {
    case "fill":
      scale = normalizedSourceScale * fitFactor
      break
    case "actual":
      scale = normalizedSourceScale
      break
    case "shrink":
    default:
      scale = normalizedSourceScale * Math.min(1, fitFactor)
      break
  }
  const drawnWidth = clipWidthIn * scale
  const drawnHeight = clipHeightIn * scale
  return {
    slideWidth: slideCanvasInches.width,
    slideHeight: slideCanvasInches.height,
    scale,
    offsetX: (slideCanvasInches.width - drawnWidth) / 2,
    offsetY: (slideCanvasInches.height - drawnHeight) / 2,
  }
}

export function renderSvgToSlide(
  svgString: string,
  clip: { x: number; y: number; width: number; height: number },
  pres: pptxgen,
  slide: pptxgen.Slide,
  options: SvgToPptxOptions = {}
): void {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, "image/svg+xml")
  const svg = doc.documentElement
  if (!svg || svg.tagName.toLowerCase() !== "svg") return

  if (options.background != null) {
    slide.background = { color: options.background }
  }

  const viewport = options.viewport ?? computeSlideViewport(clip)

  const ctx: EmitContext = {
    pres,
    slide,
    clipX: clip.x,
    clipY: clip.y,
    viewport,
    counter: { n: 0 },
    ownerName: null,
    exportFontFace: detectExportFontFace(options.fontFace),
    measureText: makeCanvasMeasurer(),
  }

  // Apollon's getSVG() emits exactly two top-level <g>s — nodes then edges —
  // so we name the first "Node", the second "Edge", and anything else
  // "Group N". This labelling drives the Animation Pane in PowerPoint, so
  // it stays robust if upstream ever adds a third layer.
  const topGroups = Array.from(svg.children).filter(
    (c) => c.tagName.toLowerCase() === "g"
  )
  const ownerForIndex = (idx: number, total: number): string => {
    if (total === 2) return idx === 0 ? "Node" : "Edge"
    return `Group ${idx + 1}`
  }

  topGroups.forEach((g, idx) => {
    ctx.ownerName = ownerForIndex(idx, topGroups.length)
    g.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        ctx.counter.n = 0
        walk(ctx, child as Element, IDENTITY, DEFAULT_TEXT_STYLE, DEFAULT_PAINT)
      }
    })
  })

  // Defensive: anything outside top-level groups
  ctx.ownerName = null
  svg.childNodes.forEach((child) => {
    if (
      child.nodeType === Node.ELEMENT_NODE &&
      (child as Element).tagName.toLowerCase() !== "g" &&
      (child as Element).tagName.toLowerCase() !== "style" &&
      (child as Element).tagName.toLowerCase() !== "defs"
    ) {
      walk(ctx, child as Element, IDENTITY, DEFAULT_TEXT_STYLE, DEFAULT_PAINT)
    }
  })
}
