/**
 * Minimal SVG path-`d` tokenizer + segment normalizer.
 *
 * Produces a sequence of absolute-coordinate path segments suitable for emission
 * into PPTX `custGeom` paths. Curves are normalized to cubic Béziers (so the
 * downstream emitter only needs to handle moveTo/lineTo/cubicBezTo/close).
 *
 * Supports: M m L l H h V v C c S s Q q T t A a Z z.
 */
export type Pt = { x: number; y: number }

export type PathSegment =
  | { type: "M"; pt: Pt }
  | { type: "L"; pt: Pt }
  | { type: "C"; c1: Pt; c2: Pt; pt: Pt }
  | { type: "Z" }

const NUMBER_RE = /[+-]?\d*\.?\d+(?:[eE][+-]?\d+)?/g

/**
 * SVG-spec arc flag: a single `0` or `1` that may NOT have a separator from
 * the surrounding numbers. So `A 5 5 0 11 10 10` means `largeArc=1, sweep=1,
 * x=10, y=10` — the canonical greedy number tokenizer would mis-read `11` as
 * one number. We tokenize arcs separately to honor the spec.
 */
function tokenizeArcArgs(argStr: string): number[] {
  // Pattern: rx, ry, rot, flag, flag, x, y  (× any number of repetitions)
  const tokenRe = /([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)|([01])/g
  const nums: number[] = []
  let m: RegExpExecArray | null
  let i = 0 // 0..6 within the current 7-tuple
  while ((m = tokenRe.exec(argStr)) !== null) {
    if (i === 3 || i === 4) {
      // Force flag interpretation: read a single digit only.
      const start = m.index
      const ch = argStr[start]
      if (ch === "0" || ch === "1") {
        nums.push(ch === "1" ? 1 : 0)
        // Reset regex past the single digit.
        tokenRe.lastIndex = start + 1
      } else {
        // Defensive: if no flag digit found, fall back to whatever was matched.
        nums.push(parseFloat(m[0]))
      }
    } else {
      nums.push(parseFloat(m[0]))
    }
    i = (i + 1) % 7
  }
  return nums
}

export function tokenizePath(d: string): Array<{
  cmd: string
  args: number[]
}> {
  const tokens: Array<{ cmd: string; args: number[] }> = []
  const cmdRe = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g
  let m: RegExpExecArray | null
  while ((m = cmdRe.exec(d)) !== null) {
    const cmd = m[1]
    const argStr = m[2]
    let nums: number[]
    if (cmd === "A" || cmd === "a") {
      nums = tokenizeArcArgs(argStr)
    } else {
      nums = []
      let nm: RegExpExecArray | null
      NUMBER_RE.lastIndex = 0
      while ((nm = NUMBER_RE.exec(argStr)) !== null) {
        nums.push(parseFloat(nm[0]))
      }
    }
    tokens.push({ cmd, args: nums })
  }
  return tokens
}

/**
 * Approximate an elliptical arc with up to 4 cubic Béziers.
 * Adapted from canonical SVG arc decomposition (Maisonobe / Ferraiolo).
 */
function arcToCubics(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  phiDeg: number,
  largeArc: boolean,
  sweep: boolean,
  x2: number,
  y2: number
): Array<{ c1: Pt; c2: Pt; pt: Pt }> {
  if (x1 === x2 && y1 === y2) return []
  let rx = Math.abs(rxIn)
  let ry = Math.abs(ryIn)
  if (rx === 0 || ry === 0) {
    return [
      { c1: { x: x1, y: y1 }, c2: { x: x2, y: y2 }, pt: { x: x2, y: y2 } },
    ]
  }
  const phi = (phiDeg * Math.PI) / 180
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const dx2 = (x1 - x2) / 2
  const dy2 = (y1 - y2) / 2
  const x1p = cosPhi * dx2 + sinPhi * dy2
  const y1p = -sinPhi * dx2 + cosPhi * dy2
  let rxSq = rx * rx
  let rySq = ry * ry
  const x1pSq = x1p * x1p
  const y1pSq = y1p * y1p
  const radiiCheck = x1pSq / rxSq + y1pSq / rySq
  if (radiiCheck > 1) {
    const s = Math.sqrt(radiiCheck)
    rx *= s
    ry *= s
    rxSq = rx * rx
    rySq = ry * ry
  }
  const sign = largeArc === sweep ? -1 : 1
  let sq =
    (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq)
  sq = sq < 0 ? 0 : sq
  const coef = sign * Math.sqrt(sq)
  const cxp = (coef * (rx * y1p)) / ry
  const cyp = (coef * -(ry * x1p)) / rx
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2

  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy
    const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy)
    let a = Math.acos(Math.max(-1, Math.min(1, dot / len)))
    if (ux * vy - uy * vx < 0) a = -a
    return a
  }
  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let dTheta = angle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry
  )
  if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI
  if (sweep && dTheta < 0) dTheta += 2 * Math.PI

  const segments = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)))
  const delta = dTheta / segments
  const t =
    ((8 / 3) * Math.sin(delta / 4) * Math.sin(delta / 4)) / Math.sin(delta / 2)
  const result: Array<{ c1: Pt; c2: Pt; pt: Pt }> = []
  let theta = theta1
  let curX = x1
  let curY = y1
  for (let i = 0; i < segments; i++) {
    const sinTheta1 = Math.sin(theta)
    const cosTheta1 = Math.cos(theta)
    const theta2 = theta + delta
    const cosTheta2 = Math.cos(theta2)
    const sinTheta2 = Math.sin(theta2)
    const e2x = cx + rx * cosTheta2 * cosPhi - ry * sinTheta2 * sinPhi
    const e2y = cy + rx * cosTheta2 * sinPhi + ry * sinTheta2 * cosPhi
    const c1x = curX + t * (-rx * sinTheta1 * cosPhi - ry * cosTheta1 * sinPhi)
    const c1y = curY + t * (-rx * sinTheta1 * sinPhi + ry * cosTheta1 * cosPhi)
    const c2x = e2x - t * (-rx * sinTheta2 * cosPhi - ry * cosTheta2 * sinPhi)
    const c2y = e2y - t * (-rx * sinTheta2 * sinPhi + ry * cosTheta2 * cosPhi)
    result.push({
      c1: { x: c1x, y: c1y },
      c2: { x: c2x, y: c2y },
      pt: { x: e2x, y: e2y },
    })
    curX = e2x
    curY = e2y
    theta = theta2
  }
  return result
}

/**
 * Parse an SVG path's `d` attribute into normalized absolute-coordinate
 * cubic-Bézier segments. Throws nothing; on malformed input returns whatever
 * was successfully parsed up to the failure.
 */
export function parsePath(d: string): PathSegment[] {
  const out: PathSegment[] = []
  const tokens = tokenizePath(d)
  let cx = 0
  let cy = 0
  let startX = 0
  let startY = 0
  let prevCubicCtrl: Pt | null = null
  let prevQuadCtrl: Pt | null = null
  let prevCmd = ""

  for (const { cmd, args } of tokens) {
    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    let i = 0
    const consume = (n: number) => {
      const slice = args.slice(i, i + n)
      i += n
      return slice
    }

    if (C === "M") {
      let isFirst = true
      while (i + 2 <= args.length) {
        const [dx, dy] = consume(2)
        const x = rel ? cx + dx : dx
        const y = rel ? cy + dy : dy
        cx = x
        cy = y
        if (isFirst) {
          startX = x
          startY = y
          out.push({ type: "M", pt: { x, y } })
          isFirst = false
        } else {
          // implicit lineTo per spec
          out.push({ type: "L", pt: { x, y } })
        }
      }
      prevCubicCtrl = null
      prevQuadCtrl = null
    } else if (C === "L") {
      while (i + 2 <= args.length) {
        const [dx, dy] = consume(2)
        const x = rel ? cx + dx : dx
        const y = rel ? cy + dy : dy
        out.push({ type: "L", pt: { x, y } })
        cx = x
        cy = y
      }
      prevCubicCtrl = null
      prevQuadCtrl = null
    } else if (C === "H") {
      while (i + 1 <= args.length) {
        const [dx] = consume(1)
        const x = rel ? cx + dx : dx
        out.push({ type: "L", pt: { x, y: cy } })
        cx = x
      }
      prevCubicCtrl = null
      prevQuadCtrl = null
    } else if (C === "V") {
      while (i + 1 <= args.length) {
        const [dy] = consume(1)
        const y = rel ? cy + dy : dy
        out.push({ type: "L", pt: { x: cx, y } })
        cy = y
      }
      prevCubicCtrl = null
      prevQuadCtrl = null
    } else if (C === "C") {
      while (i + 6 <= args.length) {
        const [a, b, c, d2, e, f] = consume(6)
        const c1x = rel ? cx + a : a
        const c1y = rel ? cy + b : b
        const c2x = rel ? cx + c : c
        const c2y = rel ? cy + d2 : d2
        const x = rel ? cx + e : e
        const y = rel ? cy + f : f
        out.push({
          type: "C",
          c1: { x: c1x, y: c1y },
          c2: { x: c2x, y: c2y },
          pt: { x, y },
        })
        cx = x
        cy = y
        prevCubicCtrl = { x: c2x, y: c2y }
      }
      prevQuadCtrl = null
    } else if (C === "S") {
      while (i + 4 <= args.length) {
        const [c, d2, e, f] = consume(4)
        const c1 =
          prevCmd === "C" || prevCmd === "S"
            ? {
                x: 2 * cx - (prevCubicCtrl?.x ?? cx),
                y: 2 * cy - (prevCubicCtrl?.y ?? cy),
              }
            : { x: cx, y: cy }
        const c2x = rel ? cx + c : c
        const c2y = rel ? cy + d2 : d2
        const x = rel ? cx + e : e
        const y = rel ? cy + f : f
        out.push({
          type: "C",
          c1,
          c2: { x: c2x, y: c2y },
          pt: { x, y },
        })
        cx = x
        cy = y
        prevCubicCtrl = { x: c2x, y: c2y }
        prevCmd = "C"
      }
      prevQuadCtrl = null
    } else if (C === "Q") {
      while (i + 4 <= args.length) {
        const [a, b, c, d2] = consume(4)
        const qx = rel ? cx + a : a
        const qy = rel ? cy + b : b
        const x = rel ? cx + c : c
        const y = rel ? cy + d2 : d2
        // quadratic -> cubic conversion
        const c1 = { x: cx + (2 / 3) * (qx - cx), y: cy + (2 / 3) * (qy - cy) }
        const c2 = { x: x + (2 / 3) * (qx - x), y: y + (2 / 3) * (qy - y) }
        out.push({ type: "C", c1, c2, pt: { x, y } })
        cx = x
        cy = y
        prevQuadCtrl = { x: qx, y: qy }
      }
      prevCubicCtrl = null
    } else if (C === "T") {
      while (i + 2 <= args.length) {
        const [a, b] = consume(2)
        const x = rel ? cx + a : a
        const y = rel ? cy + b : b
        const qx: number =
          prevCmd === "Q" || prevCmd === "T"
            ? 2 * cx - (prevQuadCtrl?.x ?? cx)
            : cx
        const qy: number =
          prevCmd === "Q" || prevCmd === "T"
            ? 2 * cy - (prevQuadCtrl?.y ?? cy)
            : cy
        const c1 = { x: cx + (2 / 3) * (qx - cx), y: cy + (2 / 3) * (qy - cy) }
        const c2 = { x: x + (2 / 3) * (qx - x), y: y + (2 / 3) * (qy - y) }
        out.push({ type: "C", c1, c2, pt: { x, y } })
        cx = x
        cy = y
        prevQuadCtrl = { x: qx, y: qy }
        prevCmd = "Q"
      }
      prevCubicCtrl = null
    } else if (C === "A") {
      while (i + 7 <= args.length) {
        const [rx, ry, rot, laFlag, swFlag, ex, ey] = consume(7)
        const x = rel ? cx + ex : ex
        const y = rel ? cy + ey : ey
        const cubics = arcToCubics(
          cx,
          cy,
          rx,
          ry,
          rot,
          !!laFlag,
          !!swFlag,
          x,
          y
        )
        for (const cu of cubics) out.push({ type: "C", ...cu })
        cx = x
        cy = y
      }
      prevCubicCtrl = null
      prevQuadCtrl = null
    } else if (C === "Z") {
      out.push({ type: "Z" })
      cx = startX
      cy = startY
      prevCubicCtrl = null
      prevQuadCtrl = null
    }
    prevCmd = C
  }
  return out
}

/**
 * Compute the bounding box of a cubic-normalized path. Anchors only — control
 * points can extend outside the visual bbox but anchor points are sufficient
 * for placing the PPTX shape's rect (curves still render correctly because
 * pptxgenjs allows points outside the shape's path-w/path-h box).
 *
 * To stay safe we additionally include cubic control points; this slightly
 * over-bounds but guarantees no clipping in PowerPoint.
 */
export function pathBBox(segs: PathSegment[]): {
  x: number
  y: number
  width: number
  height: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const accept = (p: Pt) => {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  for (const s of segs) {
    if (s.type === "M" || s.type === "L") accept(s.pt)
    else if (s.type === "C") {
      accept(s.c1)
      accept(s.c2)
      accept(s.pt)
    }
  }
  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}
