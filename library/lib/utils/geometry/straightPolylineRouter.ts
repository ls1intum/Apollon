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
 * Design:
 *  1. Gate: if every checkpoint sub-chord already clears all hard obstacles by
 *     ≥ MIN clearance, return the straight polyline unchanged (the common case).
 *  2. Otherwise build a reduced/tangent visibility graph over the endpoints, the
 *     checkpoints, and two rings of inflated corners per HARD obstacle. Soft
 *     obstacles never block visibility (they are priced, not avoided).
 *  3. Route each checkpoint sub-chord with A* over DIRECTED EDGES, so the objective
 *     can price the things that decide whether a detour looks deliberate or
 *     accidental: travel, a flat per-bend charge plus a sharpness-graduated turn
 *     cost, the departure/arrival angle against each node side, and the shared
 *     crossing / overlap / crowding cost against neighbouring edges. Checkpoints
 *     are mandatory via-points (the libavoid model).
 *  4. Collapse collinear points, then string-pull away any bend the route does not
 *     need — accepted only when it strictly improves that same objective.
 *
 * This module is deliberately self-contained: `segmentsCrossOpen` and the 4-ary heap
 * live privately in `routingCost.ts` / `orthogonalRouter.ts` and are not exported, so
 * the equivalent logic is re-implemented here rather than editing those files.
 */
import type { IPoint } from "@/edges/Connection"
import { CANVAS, EDGES } from "@/utils/geometry/routingConstants"
import {
  polylineConflictCost,
  ROUTING_COST,
} from "@/utils/geometry/routingCost"
import { distSqInt, isqrt, segLenInt } from "@/utils/geometry/integerGeometry"

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
  /** Preferred breathing room around a node (EDGES.NODE_CLEARANCE_PX). It sets the
   * roomier of the two corner rings; the guaranteed margin is MIN_NODE_CLEARANCE_PX.
   * Edge-to-edge crowding is measured separately (EDGE_CROWDING_CLEARANCE_PX). */
  clearancePx: number
  /**
   * Which ring of obstacle corners this route should prefer to turn on: 0 hugs the
   * guaranteed margin, 1 stands further off. Sibling connectors that must clear the
   * same obstacle otherwise converge on one shared elbow; giving the outer members
   * of a fan the outer ring nests them instead, so they stay separated and parallel.
   * Derived from the edge's own coordinated seat, never from routing order, so a
   * mirror-symmetric diagram still resolves symmetrically.
   */
  preferredCornerRing?: number
  /** Routes of edges that SHARE a node with this one. They are meant to fan out
   * side by side, so they are exempt from the crowding term — but never from
   * crossing or from lying exactly on top of one another, which is always a defect.
   * Pricing them at zero crowding clearance expresses precisely that. */
  siblingRoutes?: IPoint[][]
  /** Outward unit normal of the node side the route leaves from, when known. The
   * search then prices a grazing departure (see `ENDPOINT_ANGLE_PENALTY_PX`). */
  sourceNormal?: IPoint
  /** Outward unit normal of the node side the route arrives at, when known. */
  targetNormal?: IPoint
}

/** `weight · (1 − cos θ)` between `dir` and a unit `reference`, in integer px. */
const angleCostPx = (
  dir: IPoint,
  reference: IPoint,
  weightPx: number
): number => {
  const length = isqrt(dir.x * dir.x + dir.y * dir.y)
  if (length === 0) return 0
  const dot = dir.x * reference.x + dir.y * reference.y
  const cosScaled = Math.trunc((dot * SCALE) / length)
  return Math.trunc((weightPx * (SCALE - cosScaled)) / SCALE)
}

/** Cost of the bend at `via` between the incoming and outgoing segments. */
const turnCostPx = (from: IPoint, via: IPoint, to: IPoint): number => {
  const incoming = { x: via.x - from.x, y: via.y - from.y }
  const outgoing = { x: to.x - via.x, y: to.y - via.y }
  const incomingLength = isqrt(
    incoming.x * incoming.x + incoming.y * incoming.y
  )
  if (incomingLength === 0) return 0
  // Normalising the incoming direction to the fixed-point scale keeps the whole
  // computation integer while measuring the true deviation from "straight on".
  const reference = {
    x: Math.trunc((incoming.x * SCALE) / incomingLength),
    y: Math.trunc((incoming.y * SCALE) / incomingLength),
  }
  const outgoingLength = isqrt(
    outgoing.x * outgoing.x + outgoing.y * outgoing.y
  )
  if (outgoingLength === 0) return 0
  const dot = outgoing.x * reference.x + outgoing.y * reference.y
  const cosScaled = Math.trunc(dot / outgoingLength)
  return (
    BEND_PENALTY_PX +
    Math.trunc((TURN_PENALTY_PX * (SCALE - cosScaled)) / SCALE)
  )
}

/**
 * How much dearer a conflict is between STRAIGHT edges than between orthogonal ones.
 *
 * The orthogonal engine's weights are calibrated for right-angle meetings, and a
 * 90-degree crossing is the least harmful there is — the eye follows both lines
 * straight through it (Huang et al., cited in geometry/README.md). Two straight
 * edges meet at whatever angle their endpoints dictate, and a shallow crossing or a
 * near-tangential touch is genuinely hard to trace: the two strokes merge into one
 * for a stretch and the reader loses which is which. Straight routes are also free
 * to sit anywhere, so avoiding a conflict rarely costs them much. Both facts point
 * the same way — price contact far above the orthogonal baseline.
 */
const CONFLICT_SEVERITY = 1

/**
 * Cost of one candidate segment against every neighbouring edge, delegated to the
 * SHARED `polylineConflictCost` so a crossing, a collinear overlap and a too-close
 * parallel run keep the orthogonal engine's RELATIVE ordering (`edgeCrossing` 400,
 * `overlapPerPx` 25, `crowdingPerPx` 3) — re-deriving those weights locally is how
 * the two regimes would drift apart — and then scaled as a whole by
 * `CONFLICT_SEVERITY`. Summed over neighbours, so the result never depends on their
 * order.
 */
const neighborCostPx = (
  a: IPoint,
  b: IPoint,
  neighborRoutes: readonly (readonly IPoint[])[],
  crowdingClearancePx: number
): number =>
  CONFLICT_SEVERITY *
  polylineConflictCost([a, b], neighborRoutes, crowdingClearancePx).cost

/** The MINIMUM clearance the returned route guarantees from every hard obstacle.
 * It is also the gate threshold: a straight chord clearing every hard obstacle by
 * this much is returned as-is. */
const MIN_CLEARANCE_PX = EDGES.MIN_NODE_CLEARANCE_PX

/**
 * The routing objective, expressed entirely in pixels of travel so it composes with
 * segment length and with the shared `ROUTING_COST` scale the orthogonal engine uses.
 *
 * `SCALE` is the fixed-point denominator for the cosine terms: every angular cost is
 * `weight · (1 − cos θ) / SCALE`, computed from integer dot products and `isqrt`
 * lengths, so no float/`atan2` ever reaches a decision.
 */
const SCALE = 1024

/**
 * Flat cost of HAVING a bend at all, independent of how gentle it is — the straight
 * regime's counterpart to the engine's per-corner `bendInGridCells` charge.
 *
 * Two jobs. Without a floor, a graduated angle cost makes a staircase of tiny
 * near-free bends cheaper than one honest corner and the route acquires a shimmer of
 * pointless kinks. And the floor has to be GENEROUS — four orthogonal corners' worth
 * — because a diagonal bend may fall anywhere, so a small floor lets the search buy
 * an extra corner for a few pixels of length. That is exactly what makes a drawing
 * unstable: nudge a node and a route that was saving 5px suddenly gains a bend.
 * Pricing a corner well above such savings measurably steadies the picture (bend
 * flips under a one-grid-cell node move fell by ~70% in the routing fixtures)
 * without lengthening a single route in them.
 */
const BEND_PENALTY_PX =
  4 * ROUTING_COST.bendInGridCells * CANVAS.SNAP_TO_GRID_PX

/** Additional cost scaled by how sharply the route turns. `(1 − cos)` keeps a gentle
 * course correction cheap while a right-angle turn costs ~2 further bends and a
 * hairpin twice that, so an obstacle detour reads as one smooth deviation. */
const TURN_PENALTY_PX = 90

/**
 * Cost of leaving (or meeting) a node at anything other than a right angle to its
 * side. A grazing departure that skims along the node's own edge is the single
 * ugliest artefact a shortest-path router produces, so it is priced above a bend:
 * the search would rather spend a corner, or attach on a different side, than slide
 * out sideways. Running back INTO the node costs twice this.
 */
const ENDPOINT_ANGLE_PENALTY_PX = 150

/**
 * The separation at which two edges stop reading as one thick line. Below it the
 * crowding term charges, in proportion to how far short the run falls; at or above
 * it the charge is exactly zero. That is what makes a pair of neatly parallel
 * connectors the CHEAPEST arrangement available rather than merely a tolerated one —
 * expressed as a penalty that vanishes, because a literal bonus would be a negative
 * edge weight and A* may not have those.
 *
 * Deliberately the node clearance rather than the engine's tighter edge-to-edge
 * band: a straight route is free to sit anywhere, so it can afford real daylight,
 * and the reported drawings read as cramped at the tighter value.
 */
const EDGE_CROWDING_CLEARANCE_PX = EDGES.NODE_CLEARANCE_PX

/**
 * Charged for turning at a point another route already turns at, so connectors that
 * must clear the same obstacle do not all pile onto one shared elbow.
 *
 * Deliberately SMALL. A larger value unties the knot but is order-dependent — the
 * first route to claim a corner keeps it and the next is pushed out — which makes a
 * mirror-symmetric diagram resolve differently on its two halves. Symmetry is worth
 * more than an untied elbow, so this only breaks ties between otherwise equal
 * corners; genuinely separating a fan needs deterministic port-rank nudging.
 */
const SHARED_BEND_PENALTY_PX = 12

/** Charged for turning on a corner ring other than the edge's preferred one. Enough
 * to outweigh the extra travel of standing further off an obstacle, far below a
 * crossing, so it nests a fan without ever buying a conflict. */
const RING_MISMATCH_PENALTY_PX = 70

/** Beyond this many graph vertices the directed-edge search is skipped in favour of
 * the plain vertex search: the corridor window keeps real diagrams far below it, and
 * the bound stops a pathological scene from spending quadratic state. */
const MAX_DIRECTED_SEARCH_VERTICES = 176

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
  cornerPads: readonly number[]
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
  // Two rings of corner vertices per obstacle. The TIGHT ring (the blocking margin)
  // keeps a narrow gap between two nodes usable — a single wide ring welds their
  // padded corners together and closes it. The ROOMY ring gives a second, more
  // generous turning point where there is space, so two sibling routes bending past
  // the same node are not forced through one shared pinch point: the crowding term
  // then separates them instead of stacking them.
  const blocked = hardObstacles.map((o) => inflate(rectOf(o), MIN_CLEARANCE_PX))
  for (const o of hardObstacles) {
    if (o.soft) continue
    for (const [ring, pad] of cornerPads.entries()) {
      const r = inflate(rectOf(o), pad)
      const corners: IPoint[] = [
        { x: r.x, y: r.y },
        { x: r.x + r.w, y: r.y },
        { x: r.x + r.w, y: r.y + r.h },
        { x: r.x, y: r.y + r.h },
      ]
      corners.forEach((p, ci) => {
        // A roomier corner is only worth having where it is actually reachable.
        // Keeping one that has drifted inside a NEIGHBOURING node is what welds two
        // obstacles into one blob and closes the gap between them.
        if (ring > 0 && blocked.some((b) => strictlyInside(b, p))) return
        raw.push({
          x: p.x,
          y: p.y,
          kind: KIND_CORNER,
          ownerId: o.id,
          cornerIndex: ring * 4 + ci,
        })
      })
    }
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
  blockRects: readonly IntRect[],
  neighborRoutes: readonly (readonly IPoint[])[],
  crowdingClearancePx: number,
  siblingRoutes: readonly (readonly IPoint[])[],
  occupiedBends: ReadonlySet<string>,
  preferredCornerRing: number,
  sourceNormal: IPoint | undefined,
  targetNormal: IPoint | undefined
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

  const heuristic = (i: number): number => isqrt(distSqInt(vertices[i], goal))

  // The search runs over DIRECTED EDGES, not vertices: the cost of arriving at a
  // vertex depends on the direction you arrived from (that is what a turn penalty
  // means), and the departure/arrival angles are properties of the first and last
  // segment. A state is `from * n + to`, so the bend at `to` is exactly priced when
  // the state is expanded. Vertex-keyed Dijkstra cannot express this without
  // under-counting turns.
  const stateCount = n * n
  const stateG = new Float64Array(stateCount).fill(Number.POSITIVE_INFINITY)
  const statePrev = new Int32Array(stateCount).fill(-1)
  const stateClosed = new Uint8Array(stateCount)
  const heap = new MinHeap()
  let seq = 0

  const bendCostAt = (i: number): number => {
    if (i === goalIndex) return 0
    let cost = occupiedBends.has(`${vertices[i].x},${vertices[i].y}`)
      ? SHARED_BEND_PENALTY_PX
      : 0
    if (
      vertices[i].kind === KIND_CORNER &&
      Math.floor(vertices[i].cornerIndex / 4) !== preferredCornerRing
    )
      cost += RING_MISMATCH_PENALTY_PX
    return cost
  }

  const segmentCost = (i: number, j: number): number =>
    segLenInt(vertices[i], vertices[j]) +
    neighborCostPx(
      vertices[i],
      vertices[j],
      neighborRoutes,
      crowdingClearancePx
    ) +
    // Zero clearance: a sibling only costs when it is crossed or lain upon.
    neighborCostPx(vertices[i], vertices[j], siblingRoutes, 0)

  for (const v of adjacency[startIndex]) {
    const dir = {
      x: vertices[v].x - vertices[startIndex].x,
      y: vertices[v].y - vertices[startIndex].y,
    }
    let cost = segmentCost(startIndex, v)
    if (sourceNormal)
      cost += angleCostPx(dir, sourceNormal, ENDPOINT_ANGLE_PENALTY_PX)
    if (v === goalIndex && targetNormal)
      cost += angleCostPx(
        { x: -dir.x, y: -dir.y },
        targetNormal,
        ENDPOINT_ANGLE_PENALTY_PX
      )
    const state = startIndex * n + v
    if (cost < stateG[state]) {
      stateG[state] = cost
      heap.push(cost + heuristic(v), state, seq++)
    }
  }

  let goalState = -1
  while (heap.size > 0) {
    const state = heap.pop()
    if (stateClosed[state]) continue
    stateClosed[state] = 1
    const u = (state / n) | 0
    const v = state % n
    if (v === goalIndex) {
      goalState = state
      break
    }
    for (const w of adjacency[v]) {
      if (w === u) continue
      const next = v * n + w
      if (stateClosed[next]) continue
      let cost =
        stateG[state] +
        segmentCost(v, w) +
        turnCostPx(vertices[u], vertices[v], vertices[w]) +
        bendCostAt(v)
      if (w === goalIndex && targetNormal)
        cost += angleCostPx(
          {
            x: vertices[v].x - vertices[w].x,
            y: vertices[v].y - vertices[w].y,
          },
          targetNormal,
          ENDPOINT_ANGLE_PENALTY_PX
        )
      if (cost < stateG[next]) {
        stateG[next] = cost
        statePrev[next] = state
        heap.push(cost + heuristic(w), next, seq++)
      }
    }
  }

  if (goalState < 0) return [a, b]

  const reversed: IPoint[] = []
  for (let at = goalState; at !== -1; at = statePrev[at])
    reversed.push({ x: vertices[at % n].x, y: vertices[at % n].y })
  reversed.push(a)
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
    if (i >= 2) angle += turnCostPx(route[i - 2], route[i - 1], route[i])
  }
  const conflict = polylineConflictCost(
    route,
    neighborRoutes,
    crowdingClearancePx
  )
  return length + angle + conflict.cost
}

/** The complete objective for a finished route, in integer px: travel, every bend,
 * both endpoint departure angles, and the shared neighbour-conflict cost. This is
 * the same sum the search minimises, so simplification can be accepted only when it
 * genuinely improves the drawing. */
const totalRouteCostPx = (
  route: readonly IPoint[],
  neighborRoutes: readonly (readonly IPoint[])[],
  crowdingClearancePx: number,
  siblingRoutes: readonly (readonly IPoint[])[],
  sourceNormal: IPoint | undefined,
  targetNormal: IPoint | undefined
): number => {
  let cost = 0
  for (let i = 1; i < route.length; i++) {
    cost += segLenInt(route[i - 1], route[i])
    cost += neighborCostPx(
      route[i - 1],
      route[i],
      neighborRoutes,
      crowdingClearancePx
    )
    cost += neighborCostPx(route[i - 1], route[i], siblingRoutes, 0)
    if (i >= 2) cost += turnCostPx(route[i - 2], route[i - 1], route[i])
  }
  if (sourceNormal && route.length >= 2)
    cost += angleCostPx(
      { x: route[1].x - route[0].x, y: route[1].y - route[0].y },
      sourceNormal,
      ENDPOINT_ANGLE_PENALTY_PX
    )
  if (targetNormal && route.length >= 2) {
    const last = route.length - 1
    cost += angleCostPx(
      {
        x: route[last - 1].x - route[last].x,
        y: route[last - 1].y - route[last].y,
      },
      targetNormal,
      ENDPOINT_ANGLE_PENALTY_PX
    )
  }
  return cost
}

/**
 * String-pulling: drop any bend the route does not actually need. A visibility graph
 * can only turn at obstacle corners, so it often rounds a corner it could have cut —
 * leaving a small kink that reads as a mistake. Each interior point is removed only
 * when the shortcut still clears every obstacle AND strictly lowers the complete
 * objective, so this can never trade clearance or a good exit angle for fewer bends.
 * Deterministic: a single left-to-right sweep, repeated until nothing changes.
 */
const simplifyRoute = (
  route: readonly IPoint[],
  blockRects: readonly IntRect[],
  neighborRoutes: readonly (readonly IPoint[])[],
  crowdingClearancePx: number,
  siblingRoutes: readonly (readonly IPoint[])[],
  sourceNormal: IPoint | undefined,
  targetNormal: IPoint | undefined
): IPoint[] => {
  let best = [...route]
  let bestCost = totalRouteCostPx(
    best,
    neighborRoutes,
    crowdingClearancePx,
    siblingRoutes,
    sourceNormal,
    targetNormal
  )
  for (let pass = 0; pass < 4; pass++) {
    let improved = false
    for (let i = 1; i < best.length - 1; i++) {
      const candidate = [...best.slice(0, i), ...best.slice(i + 1)]
      const a = candidate[i - 1]
      const b = candidate[i]
      const isEndA = i - 1 === 0
      const isEndB = i === candidate.length - 1
      const blocked = blockRects.some((r) => {
        if (isEndA && inclusiveContains(r, a)) return false
        if (isEndB && inclusiveContains(r, b)) return false
        return segmentIntersectsRectInterior(a, b, r)
      })
      if (blocked) continue
      const cost = totalRouteCostPx(
        candidate,
        neighborRoutes,
        crowdingClearancePx,
        siblingRoutes,
        sourceNormal,
        targetNormal
      )
      if (cost < bestCost) {
        best = candidate
        bestCost = cost
        improved = true
        i--
      }
    }
    if (!improved) break
  }
  return best
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
    siblingRoutes,
    preferredCornerRing,
    sourceNormal,
    targetNormal,
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
  //    Corners are inflated by the SAME margin the visibility test blocks at. A
  //    wider corner pad silently welds neighbouring obstacles together — their
  //    padded corners land inside each other — which closes legitimate gaps between
  //    two nodes and forces a long detour around the whole group.
  const { vertices, indexAt } = buildVertices(
    source,
    target,
    checkpoints,
    hardObstacles,
    [MIN_CLEARANCE_PX, clearancePx]
  )
  const blockRects = hardObstacles.map((o) =>
    inflate(rectOf(o), MIN_CLEARANCE_PX)
  )
  // Elbows other routes already turn at — see SHARED_BEND_PENALTY_PX.
  const occupiedBends = new Set<string>()
  for (const route of [...neighborRoutes, ...(siblingRoutes ?? [])])
    for (const point of route.slice(1, -1))
      occupiedBends.add(`${point.x},${point.y}`)

  // 3. Route each checkpoint sub-chord independently and concatenate. Only the
  //    first sub-chord departs the source node and only the last meets the target,
  //    so the endpoint-angle terms apply to those alone.
  const combined: IPoint[] = []
  for (let k = 1; k < anchors.length; k++) {
    const startIndex = indexAt(anchors[k - 1])
    const goalIndex = indexAt(anchors[k])
    const sub =
      startIndex < 0 ||
      goalIndex < 0 ||
      vertices.length > MAX_DIRECTED_SEARCH_VERTICES
        ? [anchors[k - 1], anchors[k]]
        : routeSubPath(
            vertices,
            startIndex,
            goalIndex,
            blockRects,
            neighborRoutes,
            EDGE_CROWDING_CLEARANCE_PX,
            siblingRoutes ?? [],
            occupiedBends,
            preferredCornerRing ?? 0,
            k === 1 ? sourceNormal : undefined,
            k === anchors.length - 1 ? targetNormal : undefined
          )
    if (combined.length === 0) combined.push(...sub)
    else combined.push(...sub.slice(1))
  }

  // 4. Collapse collinear points, then string-pull away any bend the route does not
  //    need. Ranking stays deterministic and neighbour-order independent.
  const candidates = [
    simplifyRoute(
      collapseCollinear(combined),
      blockRects,
      neighborRoutes,
      EDGE_CROWDING_CLEARANCE_PX,
      siblingRoutes ?? [],
      sourceNormal,
      targetNormal
    ),
  ]
  candidates.sort(
    (a, b) =>
      routeObjective(a, neighborRoutes, EDGE_CROWDING_CLEARANCE_PX) -
        routeObjective(b, neighborRoutes, EDGE_CROWDING_CLEARANCE_PX) ||
      compareRoutes(a, b)
  )
  return collapseCollinear(candidates[0])
}
