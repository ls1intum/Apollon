import type { Page } from "@playwright/test"

/**
 * Geometry probes for asserting on the *rendered* edge routes.
 *
 * Node CSS transforms and edge `<path d>` coordinates live in the same flow
 * coordinate space — both sit inside `.react-flow__viewport` and are written in
 * unscaled model units — so a node's `translate(x,y)` + `offsetWidth/Height` and
 * a point sampled off the edge path can be compared directly, with no zoom math.
 * (The edge-resize-gap spec relies on exactly this equivalence.)
 *
 * Sampling the path with the browser's own `getPointAtLength` rather than
 * parsing the `d` string means rounded corners, line-jump arcs and any future
 * curve command are all handled by the engine that draws them — the test sees
 * the same geometry the user does.
 */

export type Rect = {
  id: string
  x: number
  y: number
  width: number
  height: number
}
export type Pt = { x: number; y: number }

export function collapseCollinearVertices(points: readonly Pt[]): Pt[] {
  const collapsed: Pt[] = []
  for (const point of points) {
    const previous = collapsed[collapsed.length - 1]
    if (previous?.x === point.x && previous.y === point.y) continue
    while (collapsed.length >= 2) {
      const before = collapsed[collapsed.length - 2]
      const current = collapsed[collapsed.length - 1]
      if (
        (before.x === current.x && current.x === point.x) ||
        (before.y === current.y && current.y === point.y)
      )
        collapsed.pop()
      else break
    }
    collapsed.push(point)
  }
  return collapsed
}

/** Every node's rectangle in flow coordinates, keyed by data-id. */
export async function readNodeRects(page: Page): Promise<Rect[]> {
  return page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll<HTMLElement>(".react-flow__node[data-id]"),
    ]
    return nodes.map((el) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
      return {
        id: el.getAttribute("data-id") || "",
        x: m.e,
        y: m.f,
        width: el.offsetWidth,
        height: el.offsetHeight,
      }
    })
  })
}

/**
 * Points sampled along an edge's rendered path, in flow coordinates. `stepPx`
 * is the spacing along the path; smaller catches thinner overlaps.
 */
export async function sampleEdgePath(
  page: Page,
  edgeId: string,
  stepPx = 3
): Promise<Pt[]> {
  return page.evaluate(
    ({ edgeId, stepPx }) => {
      const path = document.querySelector<SVGPathElement>(
        `.react-flow__edge[data-id="${edgeId}"] .react-flow__edge-path`
      )
      if (!path) return []
      const total = path.getTotalLength()
      const out: { x: number; y: number }[] = []
      for (let d = 0; d <= total; d += stepPx) {
        const p = path.getPointAtLength(d)
        out.push({ x: p.x, y: p.y })
      }
      return out
    },
    { edgeId, stepPx }
  )
}

/** Exact vertices emitted by Apollon's polyline path (`M … L …`). Unlike sampled
 * curvature detection this cannot merge a real one-grid-cell dogleg. Line-jump
 * curve commands are intentionally ignored: connecting their surrounding line
 * vertices measures the underlying route rather than counting bridge decoration. */
export async function readEdgePathVertices(
  page: Page,
  edgeId: string
): Promise<Pt[]> {
  const vertices = await page.evaluate((id) => {
    const path = document.querySelector<SVGPathElement>(
      `.react-flow__edge[data-id="${id}"] .react-flow__edge-path`
    )
    const data = path?.getAttribute("d") ?? ""
    const vertices: { x: number; y: number }[] = []
    const command =
      /[ML]\s*(-?(?:\d+(?:\.\d+)?|\.\d+))[,\s]+(-?(?:\d+(?:\.\d+)?|\.\d+))/gi
    for (const match of data.matchAll(command))
      vertices.push({ x: Number(match[1]), y: Number(match[2]) })
    return vertices
  }, edgeId)
  return collapseCollinearVertices(vertices)
}

/** How far a point sits *inside* a rectangle (0 when on or outside the border). */
function penetration(p: Pt, r: Rect): number {
  const dx = Math.min(p.x - r.x, r.x + r.width - p.x)
  const dy = Math.min(p.y - r.y, r.y + r.height - p.y)
  return Math.min(dx, dy)
}

/** Shortest distance from a point to a rectangle's border (0 when inside). */
function distanceToRect(p: Pt, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.width))
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.height))
  return Math.hypot(dx, dy)
}

/**
 * Distance from a point to a rectangle's OUTLINE — unlike `distanceToRect`, a
 * point deep inside the rect is far from the border, not zero. Used to detect an
 * edge lying along a container's frame (rather than merely being inside it,
 * which is normal and correct for an edge in a package).
 */
export function distanceToRectBorder(p: Pt, r: Rect): number {
  const left = Math.abs(p.x - r.x)
  const right = Math.abs(p.x - (r.x + r.width))
  const top = Math.abs(p.y - r.y)
  const bottom = Math.abs(p.y - (r.y + r.height))
  const withinX = p.x >= r.x && p.x <= r.x + r.width
  const withinY = p.y >= r.y && p.y <= r.y + r.height

  const candidates: number[] = []
  if (withinX) candidates.push(top, bottom)
  if (withinY) candidates.push(left, right)
  if (candidates.length === 0) return distanceToRect(p, r)
  return Math.min(...candidates)
}

/**
 * The closest any part of an edge comes to a node it does NOT connect to. Used
 * to assert a route keeps a real margin from unrelated nodes rather than
 * grazing their borders. Endpoint nodes are excluded (the edge touches them).
 */
export async function minClearanceToOtherNodes(
  page: Page,
  edgeId: string,
  endpoints: { source: string; target: string }
): Promise<number> {
  const [rects, points] = await Promise.all([
    readNodeRects(page),
    sampleEdgePath(page, edgeId),
  ])
  const others = rects.filter(
    (r) => r.id !== endpoints.source && r.id !== endpoints.target
  )
  if (others.length === 0 || points.length === 0) return Infinity
  let min = Infinity
  for (const p of points) {
    for (const r of others) min = Math.min(min, distanceToRect(p, r))
  }
  return min
}

/**
 * The closest an edge comes to a node it connects to, ignoring the stretch of
 * path within `excludePathPx` of that connection — i.e. how tightly the edge
 * hugs its own endpoint node once past the stub. A small value is the "flows too
 * close around the node" complaint; a healthy margin is what we want.
 */
export async function clearanceToConnectedNode(
  page: Page,
  edgeId: string,
  nodeId: string,
  connectedEnd: "source" | "target",
  excludePathPx = 45
): Promise<number> {
  const rects = await readNodeRects(page)
  const rect = rects.find((r) => r.id === nodeId)
  if (!rect) return Infinity

  const withLength = await page.evaluate(
    ({ edgeId }) => {
      const path = document.querySelector<SVGPathElement>(
        `.react-flow__edge[data-id="${edgeId}"] .react-flow__edge-path`
      )
      if (!path)
        return {
          total: 0,
          points: [] as { x: number; y: number; at: number }[],
        }
      const total = path.getTotalLength()
      const points: { x: number; y: number; at: number }[] = []
      for (let d = 0; d <= total; d += 3) {
        const p = path.getPointAtLength(d)
        points.push({ x: p.x, y: p.y, at: d })
      }
      return { total, points }
    },
    { edgeId }
  )

  let min = Infinity
  for (const p of withLength.points) {
    // Drop the stub next to the connection this node owns.
    const fromConnection =
      connectedEnd === "source" ? p.at : withLength.total - p.at
    if (fromConnection < excludePathPx) continue
    min = Math.min(min, distanceToRect(p, rect))
  }
  return min
}

/** Sampled points shared (near-coincident) between two edges' rendered paths —
 * the signature of two edges drawn on top of each other. */
export async function coincidentSampleCount(
  page: Page,
  edgeA: string,
  edgeB: string,
  tolerancePx = 2
): Promise<number> {
  const [a, b] = await Promise.all([
    sampleEdgePath(page, edgeA, 4),
    sampleEdgePath(page, edgeB, 4),
  ])
  let count = 0
  for (const pa of a) {
    for (const pb of b) {
      if (Math.hypot(pa.x - pb.x, pa.y - pb.y) <= tolerancePx) {
        count++
        break
      }
    }
  }
  return count
}

export type Overlap = {
  edgeId: string
  nodeId: string
  point: Pt
  depthPx: number
}

/**
 * Every place a sampled edge point lies more than `tolerancePx` inside a node
 * body. Endpoint nodes (`ownEndpoints`) are exempt only at their border: an edge
 * must touch its own source/target, so shallow penetration there is expected,
 * but it must never cut deep through its own node either.
 */
export async function findEdgeNodeOverlaps(
  page: Page,
  edgeId: string,
  endpoints: { source: string; target: string },
  tolerancePx = 4
): Promise<Overlap[]> {
  const [rects, points] = await Promise.all([
    readNodeRects(page),
    sampleEdgePath(page, edgeId),
  ])
  const own = new Set([endpoints.source, endpoints.target])
  const overlaps: Overlap[] = []
  for (const p of points) {
    for (const r of rects) {
      // An endpoint node gets a deeper grace band — the edge legitimately
      // reaches its border and the connection point can sit a few px in.
      const tol = own.has(r.id) ? tolerancePx + 12 : tolerancePx
      const depth = penetration(p, r)
      if (depth > tol) {
        overlaps.push({ edgeId, nodeId: r.id, point: p, depthPx: depth })
      }
    }
  }
  return overlaps
}
