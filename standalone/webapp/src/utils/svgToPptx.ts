/**
 * Convert an Apollon-exported (compat-mode) SVG string into a flat sequence of
 * native PPTX shapes on a single slide. The goal is *animatability*: each
 * visible diagram element (rectangle, line, text label, arrowhead) becomes its
 * own `<p:sp>` so users can apply per-element animations from PowerPoint's
 * Animation Pane.
 *
 * Coordinate strategy: PPTX uses inches; pixels → inches via PX_PER_INCH (96).
 * Apollon's SVG sets `viewBox="clip.x clip.y W H"`, so we subtract the clip
 * origin from every absolute coordinate. Inside each `.react-flow__node` group
 * the inner `<svg>` has its own viewBox that maps 1:1 onto its pixel size, so
 * we recurse with an accumulated translate offset.
 */
import type pptxgen from "pptxgenjs"
import { parsePath, pathBBox, type PathSegment, type Pt } from "./svgPathParser"

const PX_PER_INCH = 96
const PT_PER_PX = 0.75
const px = (n: number) => n / PX_PER_INCH
const ptFromPx = (n: number) => n * PT_PER_PX

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
      m = multiply(m, nums as unknown as Mat)
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
 * Resolve `fill`/`stroke` attribute or inline-style value to a 6-char hex
 * (uppercase) or `null` if "none" / transparent. Apollon's compat-mode export
 * has already resolved CSS variables, so we only need to handle direct values.
 */
function resolveColor(raw: string | null | undefined): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v || v === "none" || v === "transparent") return null
  if (v.startsWith("#")) {
    const hex = v.slice(1)
    if (hex.length === 3) {
      return (hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]).toUpperCase()
    }
    if (hex.length === 6) return hex.toUpperCase()
    if (hex.length === 8) return hex.slice(0, 6).toUpperCase()
  }
  if (v.startsWith("rgb")) {
    const nums = v
      .replace(/[^\d.,-]/g, "")
      .split(",")
      .map(Number)
    if (nums.length >= 3) {
      const [r, g, b] = nums
      const h = (n: number) =>
        Math.max(0, Math.min(255, Math.round(n)))
          .toString(16)
          .padStart(2, "0")
      return (h(r) + h(g) + h(b)).toUpperCase()
    }
  }
  // Named colors — handle the few that show up in Apollon's CSS_VARIABLE_FALLBACKS
  const named: Record<string, string> = {
    black: "000000",
    white: "FFFFFF",
    red: "FF0000",
    green: "008000",
    blue: "0000FF",
    gray: "808080",
    grey: "808080",
  }
  return named[v.toLowerCase()] ?? null
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

function dashType(value: string | null):
  | "solid"
  | "dash"
  | "dashDot"
  | "lgDash"
  | "lgDashDot"
  | "lgDashDotDot"
  | "sysDash"
  | "sysDot"
  | undefined {
  if (!value || value === "none" || value === "0") return undefined
  const tokens = value.split(/[\s,]+/).map(Number).filter(Number.isFinite)
  if (tokens.length === 0) return undefined
  // Heuristics good enough for Apollon's stroke-dasharray usages.
  const sum = tokens.reduce((a, b) => a + b, 0)
  if (sum < 6) return "sysDot"
  if (tokens.length >= 4) return "dashDot"
  return "dash"
}

type EmitContext = {
  pres: pptxgen
  slide: pptxgen.Slide
  clipX: number
  clipY: number
  // running counter for animation-pane fallback names
  counter: { n: number }
  ownerName: string | null
}

function nextName(ctx: EmitContext, kind: string): string {
  const owner = ctx.ownerName ? `${ctx.ownerName} · ` : ""
  return `${owner}${kind} ${++ctx.counter.n}`
}

function shapeBaseProps(_ctx: EmitContext, name: string) {
  return {
    objectName: name,
  }
}

/* ------------------------------------------------------------------ */
/* Emitters                                                            */
/* ------------------------------------------------------------------ */

function emitRect(
  ctx: EmitContext,
  el: Element,
  ctm: Mat,
  style: Record<string, string>
) {
  const x = getNum(el, "x", style, 0)
  const y = getNum(el, "y", style, 0)
  const w = getNum(el, "width", style, 0)
  const h = getNum(el, "height", style, 0)
  if (w <= 0 || h <= 0) return
  const rx = getNum(el, "rx", style, 0)
  const ry = getNum(el, "ry", style, rx)

  const corners: Pt[] = [
    apply(ctm, { x, y }),
    apply(ctm, { x: x + w, y }),
    apply(ctm, { x: x + w, y: y + h }),
    apply(ctm, { x, y: y + h }),
  ]
  const minX = Math.min(...corners.map((c) => c.x)) - ctx.clipX
  const minY = Math.min(...corners.map((c) => c.y)) - ctx.clipY
  const maxX = Math.max(...corners.map((c) => c.x)) - ctx.clipX
  const maxY = Math.max(...corners.map((c) => c.y)) - ctx.clipY
  const width = maxX - minX
  const height = maxY - minY
  if (width <= 0 || height <= 0) return

  const fill = resolveColor(getAttr(el, "fill", style))
  const stroke = resolveColor(getAttr(el, "stroke", style))
  const strokeWidth = getNum(el, "stroke-width", style, 1)
  const opacity = getNum(el, "opacity", style, 1)
  const fillOpacity = getNum(el, "fill-opacity", style, 1)
  const strokeDash = getAttr(el, "stroke-dasharray", style)

  const isRound = Math.max(rx, ry) > 0
  const radius = Math.max(rx, ry)
  const minSide = Math.min(width, height)
  const radiusFrac = isRound && minSide > 0 ? Math.min(0.5, radius / minSide) : 0

  const props: pptxgen.ShapeProps = {
    x: px(minX),
    y: px(minY),
    w: px(width),
    h: px(height),
    fill:
      fill && fillOpacity * opacity > 0
        ? { type: "solid", color: fill, transparency: Math.round((1 - fillOpacity * opacity) * 100) }
        : { type: "none" },
    line:
      stroke && opacity > 0
        ? {
            type: "solid",
            color: stroke,
            width: ptFromPx(strokeWidth),
            dashType: dashType(strokeDash),
          }
        : { type: "none" },
    ...(isRound ? { rectRadius: radiusFrac } : {}),
    ...shapeBaseProps(ctx, nextName(ctx, isRound ? "Rounded rect" : "Rect")),
  }

  ctx.slide.addShape(
    isRound ? ctx.pres.ShapeType.roundRect : ctx.pres.ShapeType.rect,
    props
  )
}

function emitEllipse(
  ctx: EmitContext,
  el: Element,
  ctm: Mat,
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

  // For PPTX ellipse position is bbox top-left; we sample the four extremes
  // (works for translate/scale only — Apollon doesn't rotate ellipses).
  const corners: Pt[] = [
    apply(ctm, { x: cx - rx, y: cy - ry }),
    apply(ctm, { x: cx + rx, y: cy - ry }),
    apply(ctm, { x: cx + rx, y: cy + ry }),
    apply(ctm, { x: cx - rx, y: cy + ry }),
  ]
  const minX = Math.min(...corners.map((c) => c.x)) - ctx.clipX
  const minY = Math.min(...corners.map((c) => c.y)) - ctx.clipY
  const width = Math.max(...corners.map((c) => c.x)) - ctx.clipX - minX
  const height = Math.max(...corners.map((c) => c.y)) - ctx.clipY - minY
  if (width <= 0 || height <= 0) return

  const fill = resolveColor(getAttr(el, "fill", style))
  const stroke = resolveColor(getAttr(el, "stroke", style))
  const strokeWidth = getNum(el, "stroke-width", style, 1)
  const fillOpacity = getNum(el, "fill-opacity", style, 1)
  const opacity = getNum(el, "opacity", style, 1)
  const strokeDash = getAttr(el, "stroke-dasharray", style)

  ctx.slide.addShape(ctx.pres.ShapeType.ellipse, {
    x: px(minX),
    y: px(minY),
    w: px(width),
    h: px(height),
    fill:
      fill && fillOpacity * opacity > 0
        ? { type: "solid", color: fill, transparency: Math.round((1 - fillOpacity * opacity) * 100) }
        : { type: "none" },
    line:
      stroke && opacity > 0
        ? {
            type: "solid",
            color: stroke,
            width: ptFromPx(strokeWidth),
            dashType: dashType(strokeDash),
          }
        : { type: "none" },
    ...shapeBaseProps(ctx, nextName(ctx, isCircle ? "Circle" : "Ellipse")),
  })
}

function emitLine(
  ctx: EmitContext,
  el: Element,
  ctm: Mat,
  style: Record<string, string>
) {
  const x1 = getNum(el, "x1", style, 0)
  const y1 = getNum(el, "y1", style, 0)
  const x2 = getNum(el, "x2", style, 0)
  const y2 = getNum(el, "y2", style, 0)
  const p1 = apply(ctm, { x: x1, y: y1 })
  const p2 = apply(ctm, { x: x2, y: y2 })

  const stroke = resolveColor(getAttr(el, "stroke", style))
  if (!stroke) return
  const strokeWidth = getNum(el, "stroke-width", style, 1)
  const strokeDash = getAttr(el, "stroke-dasharray", style)

  // PPTX LINE shape uses bbox; flipH/flipV chooses direction.
  const minX = Math.min(p1.x, p2.x) - ctx.clipX
  const minY = Math.min(p1.y, p2.y) - ctx.clipY
  const w = Math.abs(p2.x - p1.x)
  const h = Math.abs(p2.y - p1.y)
  const flipH = p1.x > p2.x
  const flipV = p1.y > p2.y

  ctx.slide.addShape(ctx.pres.ShapeType.line, {
    x: px(minX),
    y: px(minY),
    w: px(Math.max(w, 0.0001)),
    h: px(Math.max(h, 0.0001)),
    flipH,
    flipV,
    line: {
      type: "solid",
      color: stroke,
      width: ptFromPx(strokeWidth),
      dashType: dashType(strokeDash),
    },
    ...shapeBaseProps(ctx, nextName(ctx, "Line")),
  })
}

function emitPolygonOrPolyline(
  ctx: EmitContext,
  el: Element,
  ctm: Mat,
  style: Record<string, string>,
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
  emitPathSegments(ctx, segs, el, style, closed ? "Polygon" : "Polyline")
}

function emitPath(
  ctx: EmitContext,
  el: Element,
  ctm: Mat,
  style: Record<string, string>
) {
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
  emitPathSegments(ctx, segs, el, style, "Path")
}

function emitPathSegments(
  ctx: EmitContext,
  segs: PathSegment[],
  el: Element,
  style: Record<string, string>,
  kind: string
) {
  if (segs.length === 0) return
  const bbox = pathBBox(segs)
  // Apollon strokes can extend outside path anchors — pad the bbox by half
  // stroke width so PPTX's path-w/path-h doesn't clip the stroke itself.
  const strokeWidth = getNum(el, "stroke-width", style, 1)
  const pad = Math.max(0.5, strokeWidth / 2)
  const bx = bbox.x - pad
  const by = bbox.y - pad
  const bw = Math.max(bbox.width + pad * 2, 0.001)
  const bh = Math.max(bbox.height + pad * 2, 0.001)

  const points: pptxgen.ShapeProps["points"] = []
  let started = false
  for (const s of segs) {
    if (s.type === "M") {
      points!.push({ x: px(s.pt.x - bx), y: px(s.pt.y - by), moveTo: started })
      started = true
    } else if (s.type === "L") {
      points!.push({ x: px(s.pt.x - bx), y: px(s.pt.y - by) })
    } else if (s.type === "C") {
      points!.push({
        x: px(s.pt.x - bx),
        y: px(s.pt.y - by),
        curve: {
          type: "cubic",
          x1: px(s.c1.x - bx),
          y1: px(s.c1.y - by),
          x2: px(s.c2.x - bx),
          y2: px(s.c2.y - by),
        },
      })
    } else if (s.type === "Z") {
      points!.push({ close: true })
    }
  }

  const fill = resolveColor(getAttr(el, "fill", style))
  const stroke = resolveColor(getAttr(el, "stroke", style))
  const fillOpacity = getNum(el, "fill-opacity", style, 1)
  const opacity = getNum(el, "opacity", style, 1)
  const strokeDash = getAttr(el, "stroke-dasharray", style)
  const fillRule = getAttr(el, "fill-rule", style)

  ctx.slide.addShape(
    "custGeom" as unknown as pptxgen.ShapeType,
    {
      x: px(bx - ctx.clipX),
      y: px(by - ctx.clipY),
      w: px(bw),
      h: px(bh),
      points,
      fill:
        fill && fillOpacity * opacity > 0
          ? {
              type: "solid",
              color: fill,
              transparency: Math.round((1 - fillOpacity * opacity) * 100),
            }
          : { type: "none" },
      line:
        stroke && opacity > 0
          ? {
              type: "solid",
              color: stroke,
              width: ptFromPx(strokeWidth),
              dashType: dashType(strokeDash),
            }
          : { type: "none" },
      ...shapeBaseProps(ctx, nextName(ctx, kind)),
    } as pptxgen.ShapeProps
  )
  void fillRule
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

type TextStyle = {
  fontFace: string
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
  color: string | null
  textAnchor: "start" | "middle" | "end"
}

function readTextStyle(
  el: Element,
  style: Record<string, string>,
  inherit: TextStyle
): TextStyle {
  const fontFamily = getAttr(el, "font-family", style) ?? inherit.fontFace
  const fontSizeRaw = getAttr(el, "font-size", style)
  let fontSize = inherit.fontSize
  if (fontSizeRaw) {
    const m = /^(-?\d*\.?\d+)/.exec(fontSizeRaw)
    if (m) fontSize = parseFloat(m[1])
  }
  const fwRaw = getAttr(el, "font-weight", style)
  const bold = fwRaw
    ? fwRaw === "bold" || (Number(fwRaw) || 0) >= 600
    : inherit.bold
  const fsRaw = getAttr(el, "font-style", style)
  const italic = fsRaw ? fsRaw === "italic" : inherit.italic
  const tdRaw = getAttr(el, "text-decoration", style)
  const underline = tdRaw ? /underline/.test(tdRaw) : inherit.underline
  const fill = getAttr(el, "fill", style)
  const color = fill ? resolveColor(fill) : inherit.color
  const taRaw = getAttr(el, "text-anchor", style) as TextStyle["textAnchor"] | null
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
 * Approximate text width in pixels. SVG text widths can only be measured at
 * render time; when our function runs the live measurement is gone. We use a
 * conservative heuristic (`0.6em` average glyph width) that empirically lands
 * close enough that PowerPoint's rendering agrees once `valign` is set.
 */
function approxTextWidthPx(text: string, fontSize: number, bold: boolean): number {
  const factor = bold ? 0.62 : 0.55
  return text.length * fontSize * factor
}

type TextRun = {
  text: string
  style: TextStyle
}

type TextLine = {
  runs: TextRun[]
  // anchor x is the SVG x of the line-start for textAnchor=start, otherwise
  // the absolute x given by the parent <text>/<tspan>.
  anchorX: number
  baselineY: number
  textAnchor: "start" | "middle" | "end"
}

/**
 * Walk a <text> element, splitting on <tspan> children that carry their own
 * `x`/`y` (treat as new line). Returns one TextLine per visual line so we can
 * emit one PPTX text-box per line — that's what gives independent animation.
 */
function buildTextLines(
  textEl: Element,
  ctm: Mat,
  parentStyle: Record<string, string>,
  inheritStyle: TextStyle
): TextLine[] {
  const textStyleSelf = readTextStyle(
    textEl,
    styleToObject(textEl.getAttribute("style")),
    inheritStyle
  )
  const baseX = getNum(textEl, "x", parentStyle, 0)
  const baseY = getNum(textEl, "y", parentStyle, 0)
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
    curLine = {
      runs: [],
      anchorX: p.x,
      baselineY: p.y,
      textAnchor: anchor,
    }
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
      // Unknown nested element — recurse anyway.
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
    const startsNewLine =
      xAttr !== null || yAttr !== null || (dyAttr !== null && parseFloat(dyAttr) !== 0)
    if (startsNewLine) {
      const newX = xAttr !== null ? parseFloat(xAttr) : cursorX + (parseFloat(dxAttr || "0") || 0)
      const newY = yAttr !== null ? parseFloat(yAttr) : cursorY + (parseFloat(dyAttr || "0") || 0)
      cursorX = newX
      cursorY = newY
      newLineAt(newX, newY, tspanStyle.textAnchor)
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
  ownerLabel: string
) {
  for (const line of lines) {
    if (line.runs.length === 0) continue
    const fullText = line.runs.map((r) => r.text).join("")
    if (!fullText.trim()) continue
    const dominant = line.runs[0].style
    const fontSize = dominant.fontSize
    const totalWidthPx = line.runs.reduce(
      (sum, r) => sum + approxTextWidthPx(r.text, r.style.fontSize, r.style.bold),
      0
    )
    // Buffer to avoid clipping at edges; PowerPoint adds its own padding too.
    const widthPx = Math.max(totalWidthPx * 1.15 + fontSize * 0.5, fontSize * 1.5)
    const heightPx = fontSize * 1.4

    let leftPx: number
    if (line.textAnchor === "middle") leftPx = line.anchorX - widthPx / 2
    else if (line.textAnchor === "end") leftPx = line.anchorX - widthPx
    else leftPx = line.anchorX
    // SVG y is the baseline; place the text-box top at baseline - fontSize*0.85
    const topPx = line.baselineY - fontSize * 0.85 - (heightPx - fontSize * 1.2) / 2

    const align: "left" | "center" | "right" =
      line.textAnchor === "middle" ? "center" : line.textAnchor === "end" ? "right" : "left"

    ctx.slide.addText(
      line.runs.map((r) => ({
        text: r.text,
        options: {
          fontFace: r.style.fontFace,
          fontSize: ptFromPx(r.style.fontSize),
          bold: r.style.bold,
          italic: r.style.italic,
          underline: r.style.underline ? { style: "sng" } : undefined,
          color: r.style.color ?? "000000",
        },
      })),
      {
        x: px(leftPx - ctx.clipX),
        y: px(topPx - ctx.clipY),
        w: px(widthPx),
        h: px(heightPx),
        align,
        valign: "middle",
        margin: 0,
        fontFace: dominant.fontFace,
        fontSize: ptFromPx(dominant.fontSize),
        bold: dominant.bold,
        italic: dominant.italic,
        color: dominant.color ?? "000000",
        fill: { type: "none" },
        line: { type: "none" },
        wrap: false,
        autoFit: false,
        ...shapeBaseProps(ctx, `${ownerLabel} · "${fullText.trim().slice(0, 40)}"`),
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
  inheritedTextStyle: TextStyle
) {
  const tag = el.tagName.toLowerCase()

  // Skip definitions, masks, etc.
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

  // Bail on display:none / visibility:hidden
  const elStyle = styleToObject(el.getAttribute("style"))
  const display = getAttr(el, "display", elStyle)
  const vis = getAttr(el, "visibility", elStyle)
  if (display === "none" || vis === "hidden") return

  // Apply transform
  const tf = parseTransform(el.getAttribute("transform"))
  const localCtm = multiply(ctm, tf)

  if (tag === "svg" || tag === "g" || tag === "a" || tag === "symbol") {
    const childTextStyle = readTextStyle(el, elStyle, inheritedTextStyle)
    let childCtm = localCtm
    // Inner <svg> with viewBox: apply (preserveAspectRatio defaults to xMidYMid
    // meet) — Apollon's per-node SVGs use width=viewBoxW, height=viewBoxH so the
    // mapping is identity. Handle x/y offset though.
    if (tag === "svg") {
      const svgX = getNum(el, "x", elStyle, 0)
      const svgY = getNum(el, "y", elStyle, 0)
      if (svgX || svgY) {
        childCtm = multiply(childCtm, [1, 0, 0, 1, svgX, svgY])
      }
    }
    el.childNodes.forEach((c) => {
      if (c.nodeType === Node.ELEMENT_NODE) {
        walk(ctx, c as Element, childCtm, childTextStyle)
      }
    })
    return
  }

  if (tag === "rect") return emitRect(ctx, el, localCtm, elStyle)
  if (tag === "circle") return emitEllipse(ctx, el, localCtm, elStyle, true)
  if (tag === "ellipse") return emitEllipse(ctx, el, localCtm, elStyle, false)
  if (tag === "line") return emitLine(ctx, el, localCtm, elStyle)
  if (tag === "polygon") return emitPolygonOrPolyline(ctx, el, localCtm, elStyle, true)
  if (tag === "polyline") return emitPolygonOrPolyline(ctx, el, localCtm, elStyle, false)
  if (tag === "path") return emitPath(ctx, el, localCtm, elStyle)
  if (tag === "text") {
    const lines = buildTextLines(el, localCtm, elStyle, inheritedTextStyle)
    emitTextLines(ctx, lines, ctx.ownerName ?? "Label")
    return
  }
  if (tag === "foreignobject") {
    // Apollon's exported SVG should never contain foreignObject in compat mode,
    // but if it does we ignore it (could rasterize as a fallback in future).
    return
  }
  // Unknown element: recurse so we don't drop nested children.
  el.childNodes.forEach((c) => {
    if (c.nodeType === Node.ELEMENT_NODE) {
      walk(ctx, c as Element, localCtm, inheritedTextStyle)
    }
  })
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export type SvgToPptxOptions = {
  /** Optional override for the slide background color (hex without #). */
  background?: string
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

  if (options.background) {
    slide.background = { color: options.background }
  }

  const ctx: EmitContext = {
    pres,
    slide,
    clipX: clip.x,
    clipY: clip.y,
    counter: { n: 0 },
    ownerName: null,
  }

  // Walk top-level <g> groups separately so we can label nodes vs edges nicely.
  const topGroups = Array.from(svg.children).filter(
    (c) => c.tagName.toLowerCase() === "g"
  )
  const isOnlyGs = topGroups.length === svg.children.length - countNonGroups(svg)
  void isOnlyGs

  // First top-level group = nodes, second = edges (matches getSVG() output).
  topGroups.forEach((g, idx) => {
    ctx.ownerName = idx === 0 ? "Node" : "Edge"
    g.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        // For each per-node <g translate(...)>, derive a friendlier owner name
        // from its first inner <svg>'s data-id — but Apollon doesn't put the
        // id on the SVG, so just number them.
        ctx.counter.n = 0
        walk(ctx, child as Element, IDENTITY, DEFAULT_TEXT_STYLE)
      }
    })
  })

  // Walk anything outside top-level groups (e.g. orphan <text>) — defensive.
  ctx.ownerName = null
  svg.childNodes.forEach((child) => {
    if (
      child.nodeType === Node.ELEMENT_NODE &&
      (child as Element).tagName.toLowerCase() !== "g" &&
      (child as Element).tagName.toLowerCase() !== "style" &&
      (child as Element).tagName.toLowerCase() !== "defs"
    ) {
      walk(ctx, child as Element, IDENTITY, DEFAULT_TEXT_STYLE)
    }
  })
}

function countNonGroups(el: Element): number {
  let n = 0
  for (const c of Array.from(el.children)) {
    if (c.tagName.toLowerCase() !== "g") n++
  }
  return n
}

export const slideSizeFromClip = (clip: {
  width: number
  height: number
}): { width: number; height: number } => ({
  width: clip.width / PX_PER_INCH,
  height: clip.height / PX_PER_INCH,
})
