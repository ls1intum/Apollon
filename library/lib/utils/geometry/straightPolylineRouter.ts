/**
 * Deterministic obstacle-avoiding STRAIGHT polyline router.
 *
 * Given resolved integer endpoints, ordered mandatory checkpoints, and hard/soft
 * obstacle rectangles, this produces the shortest straight-segment polyline that
 * keeps clearance from the hard obstacles. It feeds memoryless auto-routing, so the
 * output MUST be reproduced byte-identically by Yjs peers and after a reload:
 *
 *  - Every decision is integer. The only square root is `isqrt` (exact floor); no
 *    `hypot`/`atan2`/float comparison ever chooses a vertex or breaks a tie.
 *  - Vertices carry a canonical key `(x, y, kind, ownerId, cornerIndex)` and the
 *    graph, adjacency lists and A* frontier are all built in that fixed order.
 *  - The A* frontier is a 4-ary min-heap keyed on `(gPlusH, vertexIndex, seq)`,
 *    whose final tie-break — the monotonic insertion counter `seq` — is a unique
 *    discriminator, so the search result cannot depend on engine scheduling or on
 *    the input order of obstacles/neighbours.
 *
 * Design (per the approved plan):
 *  1. Gate: if every checkpoint sub-chord already clears all hard obstacles by
 *     ≥ MIN clearance, return the straight polyline unchanged (the common case).
 *  2. Otherwise build a reduced/tangent visibility graph over the endpoints, the
 *     checkpoints, and the clearance-inflated corners of each HARD obstacle. Soft
 *     obstacles never block visibility (they are priced, not avoided).
 *  3. Route each checkpoint sub-chord independently with A* on that graph and
 *     concatenate — making checkpoints mandatory via-points (the libavoid model).
 *  4. Collapse collinear points exactly (integer cross product).
 *
 * This module is deliberately self-contained: `segmentsCrossOpen` and the 4-ary heap
 * live privately in `routingCost.ts` / `orthogonalRouter.ts` and are not exported, so
 * the equivalent logic is re-implemented here rather than editing those files.
 */
import type { IPoint } from "@/edges/Connection"
import { EDGES } from "@/utils/geometry/routingConstants"
import { polylineConflictCost } from "@/utils/geometry/routingCost"
import {
  distSqInt,
  isqrt,
  segLenInt,
  turnBucket,
} from "@/utils/geometry/integerGeometry"

export interface StraightRouteObstacle {
  id: string
  x: number
  y: number
  width: number
  height: number
  soft: boolean
}

export interface StraightRouteRequest {
  /** Resolved, integer, adjusted source endpoint. */
  source: IPoint
  /** Resolved, integer, adjusted target endpoint. */
  target: IPoint
  /** Ordered mandatory via-points (user waypoints); may be empty. */
  checkpoints: IPoint[]
  /** Corridor obstacle rects (bboxes). */
  obstacles: StraightRouteObstacle[]
  /** Other edges' polylines, for crossing/overlap/crowding pricing. */
  neighborRoutes: IPoint[][]
  /** Node buffer (EDGES.NODE_CLEARANCE_PX); also the crowding clearance. */
  clearancePx: number
}

/** The MINIMUM clearance the returned route guarantees from every hard obstacle.
 * It is also the gate threshold: a straight chord clearing every hard obstacle by
 * this much is returned as-is. */
const MIN_CLEARANCE_PX = EDGES.MIN_NODE_CLEARANCE_PX

/** Small angle penalty per turn bucket. It is a pure tie-break: at a scale far
 * below `ROUTING_COST.edgeCrossing` (400) and small against real segment lengths,
 * it prefers straighter equal-length routes without ever buying a detour. */
const ANGLE_PENALTY_PER_BUCKET = 4

type Kind = 0 | 1 | 2 | 3
const KIND_SOURCE: Kind = 0
const KIND_TARGET: Kind = 1
const KIND_CHECKPOINT: Kind = 2
const KIND_CORNER: Kind = 3

type Vertex = {
  x: number
  y: number
  kind: Kind
  ownerId: string
  cornerIndex: number
}

type IntRect = { x: number; y: number; w: number; h: number }

const rectOf = (o: StraightRouteObstacle): IntRect => ({
  x: o.x,
  y: o.y,
  w: o.width,
  h: o.height,
})

const inflate = (r: IntRect, d: number): IntRect => ({
  x: r.x - d,
  y: r.y - d,
  w: r.w + 2 * d,
  h: r.h + 2 * d,
})

const strictlyInside = (r: IntRect, p: IPoint): boolean =>
  p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h

const inclusiveContains = (r: IntRect, p: IPoint): boolean =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h

/** Orientation sign of point c relative to the directed line a→b (integer). */
const orient = (a: IPoint, b: IPoint, c: IPoint): number =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

/**
 * Strict interior crossing of two segments. Endpoint touches are attachment
 * geometry, not crossings — this mirrors the private `segmentsCrossOpen` in
 * `routingCost.ts`, re-implemented here so the module stays self-contained.
 */
const segmentsCrossOpen = (
  a1: IPoint,
  a2: IPoint,
  b1: IPoint,
  b2: IPoint
): boolean => {
  const l1 = orient(a1, a2, b1)
  const l2 = orient(a1, a2, b2)
  const r1 = orient(b1, b2, a1)
  const r2 = orient(b1, b2, a2)
  return l1 * l2 < 0 && r1 * r2 < 0
}

/**
 * Does the open segment a→b pass through the OPEN interior of the axis-aligned
 * rectangle? Three exact integer tests: either endpoint strictly inside, the
 * midpoint strictly inside (doubled coordinates keep it integer — this catches a
 * corner-to-corner diagonal that grazes only the rectangle's own corners), or a
 * strict crossing of any of the four sides. Corner touches are allowed.
 */
const segmentIntersectsRectInterior = (
  a: IPoint,
  b: IPoint,
  r: IntRect
): boolean => {
  if (strictlyInside(r, a) || strictlyInside(r, b)) return true

  const sx = a.x + b.x
  const sy = a.y + b.y
  if (
    sx > 2 * r.x &&
    sx < 2 * (r.x + r.w) &&
    sy > 2 * r.y &&
    sy < 2 * (r.y + r.h)
  )
    return true

  const c0 = { x: r.x, y: r.y }
  const c1 = { x: r.x + r.w, y: r.y }
  const c2 = { x: r.x + r.w, y: r.y + r.h }
  const c3 = { x: r.x, y: r.y + r.h }
  return (
    segmentsCrossOpen(a, b, c0, c1) ||
    segmentsCrossOpen(a, b, c1, c2) ||
    segmentsCrossOpen(a, b, c2, c3) ||
    segmentsCrossOpen(a, b, c3, c0)
  )
}

/**
 * Does the straight chord a→b clear every HARD obstacle by at least
 * `minClearancePx`? An obstacle whose `minClearancePx`-inflated body already
 * contains an endpoint is that endpoint's OWN node and is exempt (you cannot clear
 * the node your endpoint sits on). Soft obstacles are ignored.
 */
export function chordClearsObstacles(
  a: IPoint,
  b: IPoint,
  hardObstacles: StraightRouteObstacle[],
  minClearancePx: number
): boolean {
  for (const o of hardObstacles) {
    if (o.soft) continue
    const inflated = inflate(rectOf(o), minClearancePx)
    if (inclusiveContains(inflated, a) || inclusiveContains(inflated, b))
      continue
    if (segmentIntersectsRectInterior(a, b, inflated)) return false
  }
  return true
}

const samePoint = (a: IPoint, b: IPoint): boolean => a.x === b.x && a.y === b.y

const compareStrings = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0

/** Canonical total order on vertices. Deterministic across engines: numeric fields
 * compare exactly and string ids compare by UTF-16 code unit. */
const compareVertices = (a: Vertex, b: Vertex): number =>
  a.x - b.x ||
  a.y - b.y ||
  a.kind - b.kind ||
  compareStrings(a.ownerId, b.ownerId) ||
  a.cornerIndex - b.cornerIndex

/**
 * A minimal deterministic 4-ary min-heap keyed on `(priority, vertexIndex, seq)`.
 * Adapted from the private heap in `orthogonalRouter.ts`; `vertexIndex` is both the
 * stored payload and the secondary key, and the monotonic `seq` is a unique final
 * discriminator, so pops are engine-independent.
 */
class MinHeap {
  private readonly pr: number[] = []
  private readonly idx: number[] = []
  private readonly sq: number[] = []

  get size(): number {
    return this.pr.length
  }

  private less(i: number, j: number): boolean {
    if (this.pr[i] !== this.pr[j]) return this.pr[i] < this.pr[j]
    if (this.idx[i] !== this.idx[j]) return this.idx[i] < this.idx[j]
    return this.sq[i] < this.sq[j]
  }

  private swap(i: number, j: number): void {
    ;[this.pr[i], this.pr[j]] = [this.pr[j], this.pr[i]]
    ;[this.idx[i], this.idx[j]] = [this.idx[j], this.idx[i]]
    ;[this.sq[i], this.sq[j]] = [this.sq[j], this.sq[i]]
  }

  push(priority: number, vertexIndex: number, seq: number): void {
    this.pr.push(priority)
    this.idx.push(vertexIndex)
    this.sq.push(seq)
    let i = this.pr.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 2
      if (!this.less(i, parent)) break
      this.swap(i, parent)
      i = parent
    }
  }

  /** The lowest-priority payload, or -1 when empty. */
  pop(): number {
    if (this.pr.length === 0) return -1
    const top = this.idx[0]
    const lastPr = this.pr.pop() as number
    const lastIdx = this.idx.pop() as number
    const lastSq = this.sq.pop() as number
    if (this.pr.length === 0) return top
    this.pr[0] = lastPr
    this.idx[0] = lastIdx
    this.sq[0] = lastSq
    let i = 0
    const n = this.pr.length
    for (;;) {
      const first = 4 * i + 1
      if (first >= n) break
      let best = first
      const end = Math.min(first + 4, n)
      for (let c = first + 1; c < end; c++) if (this.less(c, best)) best = c
      if (!this.less(best, i)) break
      this.swap(i, best)
      i = best
    }
    return top
  }
}

/** Build the canonical, deduplicated vertex list and a coordinate → index lookup.
 * On a shared coordinate the canonically-smallest vertex wins, so an endpoint (low
 * kind) is never shadowed by a coincident obstacle corner. */
const buildVertices = (
  source: IPoint,
  target: IPoint,
  checkpoints: readonly IPoint[],
  hardObstacles: readonly StraightRouteObstacle[],
  clearancePx: number
): { vertices: Vertex[]; indexAt: (p: IPoint) => number } => {
  const raw: Vertex[] = [
    {
      x: source.x,
      y: source.y,
      kind: KIND_SOURCE,
      ownerId: "",
      cornerIndex: 0,
    },
    {
      x: target.x,
      y: target.y,
      kind: KIND_TARGET,
      ownerId: "",
      cornerIndex: 0,
    },
  ]
  checkpoints.forEach((c, i) =>
    raw.push({
      x: c.x,
      y: c.y,
      kind: KIND_CHECKPOINT,
      ownerId: "",
      cornerIndex: i,
    })
  )
  for (const o of hardObstacles) {
    if (o.soft) continue
    const r = inflate(rectOf(o), clearancePx)
    const corners: IPoint[] = [
      { x: r.x, y: r.y },
      { x: r.x + r.w, y: r.y },
      { x: r.x + r.w, y: r.y + r.h },
      { x: r.x, y: r.y + r.h },
    ]
    corners.forEach((p, ci) =>
      raw.push({
        x: p.x,
        y: p.y,
        kind: KIND_CORNER,
        ownerId: o.id,
        cornerIndex: ci,
      })
    )
  }

  raw.sort(compareVertices)

  const vertices: Vertex[] = []
  const byCoord = new Map<string, number>()
  for (const v of raw) {
    const key = `${v.x},${v.y}`
    if (byCoord.has(key)) continue
    byCoord.set(key, vertices.length)
    vertices.push(v)
  }
  const indexAt = (p: IPoint): number => byCoord.get(`${p.x},${p.y}`) ?? -1
  return { vertices, indexAt }
}

/**
 * Mutual visibility of two vertices: the segment between them must not enter the
 * MIN-clearance-inflated interior of any hard obstacle. A segment incident to the
 * sub-chord's own endpoint is exempt from obstacles whose inflated body contains
 * that endpoint (the node it departs from / arrives at). Corner touches are allowed.
 */
const visible = (
  vertices: readonly Vertex[],
  i: number,
  j: number,
  endA: number,
  endB: number,
  blockRects: readonly IntRect[]
): boolean => {
  const p = vertices[i]
  const q = vertices[j]
  const exemptI = i === endA || i === endB
  const exemptJ = j === endA || j === endB
  for (const r of blockRects) {
    if (exemptI && inclusiveContains(r, p)) continue
    if (exemptJ && inclusiveContains(r, q)) continue
    if (segmentIntersectsRectInterior(p, q, r)) return false
  }
  return true
}

/** Shortest obstacle-avoiding sub-path from vertex `startIndex` to `goalIndex` via
 * A* on the visibility graph. Returns the ordered point list `[A, …, B]`, or a
 * straight `[A, B]` fallback when the goal is unreachable (deterministic). */
const routeSubPath = (
  vertices: readonly Vertex[],
  startIndex: number,
  goalIndex: number,
  blockRects: readonly IntRect[]
): IPoint[] => {
  const a: IPoint = { x: vertices[startIndex].x, y: vertices[startIndex].y }
  const b: IPoint = { x: vertices[goalIndex].x, y: vertices[goalIndex].y }
  if (startIndex === goalIndex) return [a]

  const n = vertices.length
  const goal = vertices[goalIndex]

  // Adjacency built in ascending index order for a deterministic frontier.
  const adjacency: number[][] = []
  for (let i = 0; i < n; i++) {
    const list: number[] = []
    for (let j = 0; j < n; j++) {
      if (j === i) continue
      if (visible(vertices, i, j, startIndex, goalIndex, blockRects))
        list.push(j)
    }
    adjacency.push(list)
  }

  const gScore = new Array<number>(n).fill(Number.POSITIVE_INFINITY)
  const cameFrom = new Array<number>(n).fill(-1)
  const closed = new Array<boolean>(n).fill(false)
  const heuristic = (i: number): number => isqrt(distSqInt(vertices[i], goal))

  const heap = new MinHeap()
  let seq = 0
  gScore[startIndex] = 0
  heap.push(heuristic(startIndex), startIndex, seq++)

  while (heap.size > 0) {
    const u = heap.pop()
    if (closed[u]) continue
    closed[u] = true
    if (u === goalIndex) break
    const pred = cameFrom[u]
    for (const v of adjacency[u]) {
      if (closed[v]) continue
      let turn = 0
      if (pred >= 0) {
        turn =
          turnBucket(
            vertices[u].x - vertices[pred].x,
            vertices[u].y - vertices[pred].y,
            vertices[v].x - vertices[u].x,
            vertices[v].y - vertices[u].y
          ) * ANGLE_PENALTY_PER_BUCKET
      }
      const tentative = gScore[u] + segLenInt(vertices[u], vertices[v]) + turn
      if (tentative < gScore[v]) {
        gScore[v] = tentative
        cameFrom[v] = u
        heap.push(tentative + heuristic(v), v, seq++)
      }
    }
  }

  if (!Number.isFinite(gScore[goalIndex])) return [a, b]

  const reversed: IPoint[] = []
  for (let at = goalIndex; at !== -1; at = cameFrom[at])
    reversed.push({ x: vertices[at].x, y: vertices[at].y })
  reversed.reverse()
  return reversed
}

/** Drop exact duplicates and interior points that are collinear with their
 * neighbours (integer cross product). Endpoints are always kept. */
const collapseCollinear = (points: readonly IPoint[]): IPoint[] => {
  const dedup: IPoint[] = []
  for (const p of points) {
    const last = dedup[dedup.length - 1]
    if (last && samePoint(last, p)) continue
    dedup.push(p)
  }
  if (dedup.length <= 2) return dedup
  const out: IPoint[] = [dedup[0]]
  for (let i = 1; i < dedup.length - 1; i++) {
    const a = dedup[i - 1]
    const p = dedup[i]
    const c = dedup[i + 1]
    if (orient(a, c, p) === 0) continue
    out.push(p)
  }
  out.push(dedup[dedup.length - 1])
  return out
}

/** Full routing objective in integer pixels: floored segment lengths, the small
 * angle tie-break, and the crossing/overlap/crowding cost against neighbours. Used
 * to rank candidates; sums over neighbours so it is independent of their order. */
const routeObjective = (
  route: readonly IPoint[],
  neighborRoutes: readonly (readonly IPoint[])[],
  crowdingClearancePx: number
): number => {
  let length = 0
  let angle = 0
  for (let i = 1; i < route.length; i++) {
    length += segLenInt(route[i - 1], route[i])
    if (i >= 2) {
      angle +=
        turnBucket(
          route[i - 1].x - route[i - 2].x,
          route[i - 1].y - route[i - 2].y,
          route[i].x - route[i - 1].x,
          route[i].y - route[i - 1].y
        ) * ANGLE_PENALTY_PER_BUCKET
    }
  }
  const conflict = polylineConflictCost(
    route,
    neighborRoutes,
    crowdingClearancePx
  )
  return length + angle + conflict.cost
}

/** Lexicographic order on two polylines; the deterministic final tie-break when
 * two candidates score identically. */
const compareRoutes = (a: readonly IPoint[], b: readonly IPoint[]): number => {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i].x !== b[i].x) return a[i].x - b[i].x
    if (a[i].y !== b[i].y) return a[i].y - b[i].y
  }
  return a.length - b.length
}

/**
 * Route a deterministic straight (obstacle-avoiding) polyline from source to target
 * through every checkpoint in order. Returns the full route INCLUDING the endpoints:
 * `[source, …bends, target]`. When the straight polyline already clears all hard
 * obstacles by ≥ MIN clearance it is returned unchanged.
 */
export function routeStraightPolyline(req: StraightRouteRequest): IPoint[] {
  const {
    source,
    target,
    checkpoints,
    obstacles,
    neighborRoutes,
    clearancePx,
  } = req
  const hardObstacles = obstacles.filter((o) => !o.soft)
  const anchors: IPoint[] = [source, ...checkpoints, target]

  // 1. Gate: every sub-chord already clears the hard obstacles.
  const straightClears = anchors.every((a, i) => {
    if (i === 0) return true
    return chordClearsObstacles(
      anchors[i - 1],
      a,
      hardObstacles,
      MIN_CLEARANCE_PX
    )
  })
  if (straightClears) return collapseCollinear(anchors)

  // 2. Visibility graph over endpoints, checkpoints and inflated hard corners.
  const { vertices, indexAt } = buildVertices(
    source,
    target,
    checkpoints,
    hardObstacles,
    clearancePx
  )
  const blockRects = hardObstacles.map((o) =>
    inflate(rectOf(o), MIN_CLEARANCE_PX)
  )

  // 3. Route each checkpoint sub-chord independently and concatenate.
  const combined: IPoint[] = []
  for (let k = 1; k < anchors.length; k++) {
    const startIndex = indexAt(anchors[k - 1])
    const goalIndex = indexAt(anchors[k])
    const sub =
      startIndex < 0 || goalIndex < 0
        ? [anchors[k - 1], anchors[k]]
        : routeSubPath(vertices, startIndex, goalIndex, blockRects)
    if (combined.length === 0) combined.push(...sub)
    else combined.push(...sub.slice(1))
  }

  // 4. Collapse collinear points; verify the single candidate under the full
  //    objective (a deterministic, neighbour-order-independent scaffold that keeps
  //    the door open for alternative candidates without changing today's output).
  const candidate = collapseCollinear(combined)
  const candidates = [candidate]
  candidates.sort(
    (a, b) =>
      routeObjective(a, neighborRoutes, clearancePx) -
        routeObjective(b, neighborRoutes, clearancePx) || compareRoutes(a, b)
  )
  return candidates[0]
}
