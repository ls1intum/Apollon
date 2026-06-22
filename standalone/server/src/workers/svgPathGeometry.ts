/**
 * Pure SVG path geometry — a JSDOM-free reimplementation of
 * `SVGGeometryElement.getTotalLength()` / `getPointAtLength()`.
 *
 * JSDOM has no geometry engine, so those two methods are unimplemented and throw
 * under the server-side export. The apollon library positions edge labels,
 * toolbars, and per-type decorators by measuring the rendered edge path with
 * them (`useStepPathEdge` / `useStraightPathEdge`), so without them every edge
 * label lands at a fallback point off the line in the headless export while the
 * browser editor — which calls the native methods on the same path — is correct.
 *
 * We reproduce them by flattening the path `d` to a polyline: line commands are
 * exact and quadratic/cubic curves are sampled (the only curve apollon edges
 * emit is the `Q` line-jump hop). The single shared render path then positions
 * labels identically in the browser and the export — which is the whole point.
 */

export interface PathPoint {
  x: number
  y: number
}

const QUAD_SAMPLES = 24
const CUBIC_SAMPLES = 32

const distance = (a: PathPoint, b: PathPoint): number =>
  Math.hypot(b.x - a.x, b.y - a.y)

/**
 * Flattens an SVG path `d` to an absolute polyline. Supports the commands
 * apollon emits (`M`/`L`/`H`/`V`/`Q`/`C`/`Z`, absolute or relative); an
 * unsupported command (`A`/`S`/`T`) stops flattening at that point rather than
 * desyncing the argument stream.
 */
export function flattenPath(d: string): PathPoint[] {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g)
  if (!tokens) return []

  const pts: PathPoint[] = []
  let i = 0
  let cur: PathPoint = { x: 0, y: 0 }
  let sub: PathPoint = { x: 0, y: 0 }
  let cmd = ""
  const n = (): number => Number(tokens[i++])

  while (i < tokens.length) {
    // A letter starts a new command; a bare number is an implicit repeat of the
    // previous command (with M/m continuing as L/l per the SVG spec).
    if (/[A-Za-z]/.test(tokens[i]!)) cmd = tokens[i++]!
    const rel = cmd === cmd.toLowerCase()
    const bx = rel ? cur.x : 0
    const by = rel ? cur.y : 0

    switch (cmd.toUpperCase()) {
      case "M": {
        cur = { x: bx + n(), y: by + n() }
        sub = cur
        pts.push(cur)
        cmd = rel ? "l" : "L"
        break
      }
      case "L": {
        cur = { x: bx + n(), y: by + n() }
        pts.push(cur)
        break
      }
      case "H": {
        cur = { x: bx + n(), y: cur.y }
        pts.push(cur)
        break
      }
      case "V": {
        cur = { x: cur.x, y: by + n() }
        pts.push(cur)
        break
      }
      case "Q": {
        const c = { x: bx + n(), y: by + n() }
        const e = { x: bx + n(), y: by + n() }
        const p0 = cur
        for (let s = 1; s <= QUAD_SAMPLES; s++) {
          const u = s / QUAD_SAMPLES
          const v = 1 - u
          pts.push({
            x: v * v * p0.x + 2 * v * u * c.x + u * u * e.x,
            y: v * v * p0.y + 2 * v * u * c.y + u * u * e.y,
          })
        }
        cur = e
        break
      }
      case "C": {
        const c1 = { x: bx + n(), y: by + n() }
        const c2 = { x: bx + n(), y: by + n() }
        const e = { x: bx + n(), y: by + n() }
        const p0 = cur
        for (let s = 1; s <= CUBIC_SAMPLES; s++) {
          const u = s / CUBIC_SAMPLES
          const v = 1 - u
          pts.push({
            x:
              v * v * v * p0.x +
              3 * v * v * u * c1.x +
              3 * v * u * u * c2.x +
              u * u * u * e.x,
            y:
              v * v * v * p0.y +
              3 * v * v * u * c1.y +
              3 * v * u * u * c2.y +
              u * u * u * e.y,
          })
        }
        cur = e
        break
      }
      case "Z": {
        cur = { ...sub }
        pts.push(cur)
        break
      }
      default:
        return pts
    }
  }
  return pts
}

export function pathTotalLength(d: string): number {
  const pts = flattenPath(d)
  let total = 0
  for (let k = 1; k < pts.length; k++) total += distance(pts[k - 1]!, pts[k]!)
  return total
}

export function pathPointAtLength(d: string, target: number): PathPoint {
  const pts = flattenPath(d)
  if (pts.length === 0) return { x: 0, y: 0 }
  if (pts.length === 1 || target <= 0) return { ...pts[0]! }

  let acc = 0
  for (let k = 1; k < pts.length; k++) {
    const seg = distance(pts[k - 1]!, pts[k]!)
    if (acc + seg >= target) {
      const t = seg === 0 ? 0 : (target - acc) / seg
      return {
        x: pts[k - 1]!.x + (pts[k]!.x - pts[k - 1]!.x) * t,
        y: pts[k - 1]!.y + (pts[k]!.y - pts[k - 1]!.y) * t,
      }
    }
    acc += seg
  }
  return { ...pts[pts.length - 1]! }
}

/**
 * Installs `getTotalLength` / `getPointAtLength` on every SVG element prototype
 * in the given window that exists, so a `<path>` resolves our implementation
 * regardless of where JSDOM happens to declare (or omit) the throwing stub.
 */
export function installSvgPathGeometry(win: Window): void {
  const w = win as unknown as Record<string, { prototype?: object } | undefined>
  for (const name of ["SVGPathElement", "SVGGeometryElement", "SVGElement"]) {
    const proto = w[name]?.prototype as
      | {
          getTotalLength?: () => number
          getPointAtLength?: (len: number) => PathPoint
        }
      | undefined
    if (!proto) continue
    proto.getTotalLength = function () {
      return pathTotalLength(
        (this as unknown as Element).getAttribute?.("d") ?? ""
      )
    }
    proto.getPointAtLength = function (len: number) {
      return pathPointAtLength(
        (this as unknown as Element).getAttribute?.("d") ?? "",
        len
      )
    }
  }
}
