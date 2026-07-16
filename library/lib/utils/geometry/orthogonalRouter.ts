import { Position } from "@xyflow/react"
import { CANVAS, EDGES } from "@/constants"
import type { IPoint } from "@/edges/Connection"
import { recordRouterSearch } from "@/sync/perfCounters"
import type { ObstacleRect } from "@/utils/geometry/obstacles"

/**
 * A pure, synchronous orthogonal connector router: A* over a sparse orthogonal
 * (Hanan) visibility graph — the grid of lines any optimal orthogonal route must
 * turn on: the sides of every obstacle, the endpoints, the stub exits. Hard
 * obstacles are never crossed: no segment that would enter one is ever created.
 *
 * Three invariants hold by construction:
 *
 *  - **Grid-aligned:** turning lines are snapped when the graph is built, so no
 *    post-hoc snap can shove a segment back into an obstacle.
 *  - **Deterministic:** the frontier breaks ties on a stable insertion counter, so
 *    identical inputs yield an identical route — this keeps a collaborative (Yjs)
 *    session from drifting between peers.
 *  - **Stable under motion:** lanes are quantised to the grid and to obstacle
 *    sides, so a blocker dragged a few pixels moves no lane and the route holds
 *    still until it crosses a grid line.
 */

/** Expansion cap before the search gives up and the caller falls back to a plain
 * step route. Every state is expanded at most once, so this only binds on a
 * lattice of >15_000 cells, which `MAX_CELLS` has already declined. */
const MAX_EXPANSIONS = 60_000

/** Lattice size above which a search is declined up front, BEFORE cost is paid:
 * the search allocates and clears four arrays of `cells * 4` before expanding a
 * single state. The lattice is quadratic in the turning lines; the dense-grid
 * benchmark's worst edge builds ~9_000 cells, so this leaves several times the
 * headroom a real diagram uses while capping scratch memory at a few megabytes. */
const MAX_CELLS = 40_000

/** A cardinal heading. Screen space: +y points down, so `Down` increases y. */
const enum Heading {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
}

const headingOf = (position: Position): Heading => {
  switch (position) {
    case Position.Top:
      return Heading.Up
    case Position.Right:
      return Heading.Right
    case Position.Bottom:
      return Heading.Down
    case Position.Left:
    default:
      return Heading.Left
  }
}

const opposite = (h: Heading): Heading => ((h + 2) % 4) as Heading

/**
 * Cost weights, all quoted in ONE unit: pixels of travel. A weighted sum, not a
 * lexicographic order — minimising bends *before* length buys absurd detours to
 * save a single corner.
 *
 *   - EVENT costs — a bend, a crossing — are charged once.
 *   - STATE costs — hugging a body, running alongside another edge, travelling
 *     inside a container — are charged PER PIXEL travelled in that state, NOT per
 *     lattice step: step count depends on how unrelated geometry subdivides the
 *     run, so per-step pricing would re-price a route when a distant node moves.
 *     Per pixel, cost is a function of the geometry alone.
 *
 * Every penalty stays within an order of magnitude of the distance it is added
 * to, so the Manhattan heuristic still prunes: a term a thousand times larger
 * than the remaining distance turns A* into Dijkstra.
 */

/** One corner. Unit the constants below are quoted in: 8 cells = 40px at the
 * default grid, in band with libavoid's `segmentPenalty`. */
const BEND_PENALTY_IN_CELLS = 8
/** Three bends. A clean jump arc over a crossing is ordinary UML; swinging around
 * a whole class to avoid one is not. (libavoid charges four.) */
const EDGE_CROSSING_PENALTY = 120
/** Fifteen bends. A crossing on the END of the crossed edge — against a node,
 * where that edge turns — has nowhere to draw its hop, so the two lines merge.
 * Nearly always avoidable by sliding the crossing along, so priced to be slid. */
const CROSSING_NEAR_CORNER_PENALTY = 600
/** Room a crossing needs at either end to draw its hop: half the 16px jump arc
 * (EDGES.EDGE_LINE_JUMP_WIDTH) plus a grid cell of slack. */
const CROSSING_CORNER_CLEARANCE = 15

/** Two parallel lines closer than this read as one. Two grid cells: visibly
 * separate, and enough for a jump arc to fit between them. */
const PARALLEL_CROWDING_CLEARANCE_CELLS = 2
/** Per pixel run alongside another edge close enough to smudge together. A 160px
 * run costs 480 — a healthy detour, never a lap. */
const CROWDING_COST_PER_PX = 3
/** Per pixel drawn ON another edge — the defect users report as a missing edge,
 * worse than hugging a node. Buys a long way round: 50px of overlap is worth a
 * 1250px detour. */
const OVERLAP_COST_PER_PX = 25
/** Per pixel travelled INSIDE a container. A package is nearly a wall: crossing
 * even a narrow one outprices any detour a real diagram offers. Per pixel rather
 * than flat, so a wide package costs more to trespass than a narrow one. */
const SOFT_CROSSING_COST_PER_PX = 50

/**
 * Clearance gradient: cost proportional to the shortfall against the ideal AND to
 * how far the run travels while short of it. So 25px of room is free, and in a
 * 20px gap every lane costs something, the middle costs least, and the gap still
 * beats going around. This one term is margins AND balance.
 *
 * A margin RECTANGLE could express neither: every lane through a blanketed gap is
 * equally "inside" it, and a segment running exactly ALONG a rectangle's edge
 * never enters it — so the cheapest lane would be the node's own border.
 *
 * Quantised to whole grid cells (a one-pixel nudge cannot make a route twitch) and
 * capped at the ideal (a route in the open never pays). At full shortfall it costs
 * a pixel per pixel: 160px of hug buys a 160px detour, no more. Raise it and
 * clearance starts buying corners, producing 20px doglegs — better spaced, worse.
 */
const CLEARANCE_COST_PER_PX_AT_FULL_DEFICIT = 1
/**
 * Per pixel run right up against a body — closer than MIN_NODE_CLEARANCE_PX, in
 * practice on its border. This, not the gradient above, buys the big detours: the
 * gradient is capped at a pixel per pixel, cheap enough that the router would hug a
 * node to avoid a crossing, which is backwards. An edge drawn ON a node is the
 * worst thing this router can produce short of cutting through one.
 *
 * At 8, a class's width of hug (160px) costs 1280. Above a badly-placed crossing
 * and above crowding an edge, so those are preferable to touching a node; below a
 * container, so a hug is still taken over no route at all.
 */
const HUGGING_COST_PER_PX = 8

/**
 * Room on either side of a run, and the best any run through that channel could
 * do. The same question `priceStep` asks, but for a route that already exists.
 */
const clearanceAlongside = (
  a: IPoint,
  b: IPoint,
  rects: readonly ObstacleRect[],
  ideal: number
): { nearest: number; achievable: number } => {
  const horizontal = a.y === b.y
  const lo = horizontal ? Math.min(a.x, b.x) : Math.min(a.y, b.y)
  const hi = horizontal ? Math.max(a.x, b.x) : Math.max(a.y, b.y)

  // A run counts as travelling PAST a body only if it overlaps a real length of
  // it: a run it heads INTO (a stub into its own node) or clips by a pixel is not
  // running alongside. Otherwise a stub grazing a corner forces a full search.
  const minOverlap = 2 * CANVAS.SNAP_TO_GRID_PX

  let lower = Infinity
  let upper = Infinity
  for (const r of rects) {
    const spanLo = horizontal ? r.x : r.y
    const spanHi = horizontal ? r.x + r.width : r.y + r.height
    if (Math.min(hi, spanHi) - Math.max(lo, spanLo) < minOverlap) continue

    const at = horizontal ? a.y : a.x
    const near = horizontal ? r.y : r.x
    const far = horizontal ? r.y + r.height : r.x + r.width
    if (at <= near) upper = Math.min(upper, near - at)
    else if (at >= far) lower = Math.min(lower, at - far)
  }

  const half = (lower + upper) / 2
  return {
    nearest: Math.min(lower, upper),
    achievable: Math.min(half, ideal),
  }
}

/** A point `distance` px along an axis-aligned segment from `a` towards `b`. */
const along = (a: IPoint, b: IPoint, distance: number): IPoint =>
  a.x === b.x
    ? { x: a.x, y: a.y + Math.sign(b.y - a.y) * distance }
    : { x: a.x + Math.sign(b.x - a.x) * distance, y: a.y }

/**
 * Fitness test for the cheap (plain step) route: does it keep the clearance a
 * search would have kept — the full `ideal`, or the middle of the channel where
 * `ideal` will not fit? If so, keep it untouched; otherwise the search takes over.
 *
 * `exemptEndsPx` exempts the stub runs, which sit on a line fixed by the handle,
 * not chosen by the router. If a handle sits 5px from a neighbour's span, every
 * route leaving it runs 5px from that neighbour, the searched one included —
 * judging the stub would reject the cheap route only for A* to return the same
 * stub, a guaranteed-futile search on the diagrams that can least afford one.
 *
 * `tolerance` is one grid cell (a lane can only land on the grid), but it stops at
 * the floor: within `minimum` of a node that could have kept `minimum` is the
 * defect, not "a cell off".
 */
export const routeRunsTooCloseToBody = (
  points: readonly IPoint[],
  bodies: readonly ObstacleRect[],
  ideal: number,
  minimum: number,
  tolerance: number,
  exemptEndsPx = 0
): boolean => {
  if (bodies.length === 0) return false

  const lengths: number[] = []
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    const length =
      Math.abs(points[i + 1].x - points[i].x) +
      Math.abs(points[i + 1].y - points[i].y)
    lengths.push(length)
    total += length
  }

  let travelled = 0
  for (let i = 0; i < points.length - 1; i++) {
    const start = travelled
    travelled += lengths[i]
    // The part of this segment clear of both exempt stubs. Trimming rather than
    // skipping the segment whole still judges the part of a first segment the
    // router had a say in (the part past the stub).
    const from = Math.max(0, exemptEndsPx - start)
    const to = Math.min(lengths[i], total - exemptEndsPx - start)
    if (to - from <= 0) continue

    const a = along(points[i], points[i + 1], from)
    const b = along(points[i], points[i + 1], to)
    const { nearest, achievable } = clearanceAlongside(a, b, bodies, ideal)

    if (nearest === Infinity) continue
    // Drawn ON a node: never acceptable, whatever the channel allows. Two touching
    // nodes' shared border reads as broken.
    if (nearest === 0) return true
    if (nearest < achievable - tolerance) return true
    if (nearest < minimum && achievable >= minimum) return true
  }
  return false
}

type Segment = { x1: number; y1: number; x2: number; y2: number }

/** Flatten polylines to their individual segments once, for repeated testing. */
const toSegments = (polylines: readonly IPoint[][]): Segment[] => {
  const segs: Segment[] = []
  for (const line of polylines) {
    for (let i = 0; i < line.length - 1; i++) {
      segs.push({
        x1: line[i].x,
        y1: line[i].y,
        x2: line[i + 1].x,
        y2: line[i + 1].y,
      })
    }
  }
  return segs
}

/** One segment of a neighbouring edge, in the reach box of some route. */
export type NeighborSegment = Segment

/**
 * The neighbour segments a route between these endpoints can actually reach:
 * those overlapping the box its endpoints and obstacles span, grown by the
 * routing margin. A neighbour outside it can be neither crossed nor lain on — so
 * it neither shapes the route NOR should invalidate the route's cache key. The
 * router prunes its lattice with this; the solver keys routes on it, so a
 * neighbour bending outside this edge's corridor no longer forces it to re-route.
 */
export const neighborsWithinReach = (
  sourcePoint: IPoint,
  targetPoints: readonly IPoint[],
  obstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][]
): NeighborSegment[] => {
  const reach = 4 * CANVAS.SNAP_TO_GRID_PX + EDGES.NODE_CLEARANCE_PX
  const xs = [sourcePoint.x, ...targetPoints.map((p) => p.x)]
  const ys = [sourcePoint.y, ...targetPoints.map((p) => p.y)]
  const left = Math.min(...xs, ...obstacles.map((o) => o.x)) - reach
  const right = Math.max(...xs, ...obstacles.map((o) => o.x + o.width)) + reach
  const top = Math.min(...ys, ...obstacles.map((o) => o.y)) - reach
  const bottom =
    Math.max(...ys, ...obstacles.map((o) => o.y + o.height)) + reach
  return toSegments(neighborEdges).filter(
    (s) =>
      Math.min(s.x1, s.x2) <= right &&
      Math.max(s.x1, s.x2) >= left &&
      Math.min(s.y1, s.y2) <= bottom &&
      Math.max(s.y1, s.y2) >= top
  )
}

const sign = (n: number): number => (n > 0 ? 1 : n < 0 ? -1 : 0)

const orient = (
  px: number,
  py: number,
  qx: number,
  qy: number,
  rx: number,
  ry: number
): number => sign((qx - px) * (ry - py) - (qy - py) * (rx - px))

/**
 * Does segment `a` cross segment `b`, counting the crossing exactly ONCE?
 *
 * A crossing can land on a lattice line where one step ends and the next begins.
 * The textbook strictly-both-sides test sees each step merely TOUCHING the line
 * and reports no crossing, leaving crossings unpriced. So the test is half-open:
 * `b`'s endpoints must strictly straddle `a`'s line (meeting point inside `b`, not
 * at its tip), and `a` must go from strictly one side of `b` to on-or-past it —
 * true for the step that ARRIVES at the crossing, false for the one that leaves.
 */
const segmentsCross = (a: Segment, b: Segment): boolean => {
  const straddles =
    orient(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1) *
      orient(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2) <
    0
  if (!straddles) return false

  const from = orient(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1)
  const to = orient(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2)
  return (from < 0 && to >= 0) || (from > 0 && to <= 0)
}

/**
 * How far apart two PARALLEL, overlapping segments run — or `null` when they are
 * not parallel, or do not overlap along their shared axis.
 *
 * Zero means one is drawn on top of the other; a few pixels reads as one thick
 * smudge. Measures the gap rather than testing for exact coincidence — the bar is
 * "visibly apart", not "not touching".
 */
const parallelGap = (a: Segment, b: Segment): number | null => {
  const aH = a.y1 === a.y2
  const bH = b.y1 === b.y2
  const aV = a.x1 === a.x2
  const bV = b.x1 === b.x2
  if (aH && bH) {
    const overlap =
      Math.min(Math.max(a.x1, a.x2), Math.max(b.x1, b.x2)) -
      Math.max(Math.min(a.x1, a.x2), Math.min(b.x1, b.x2))
    return overlap > 0 ? Math.abs(a.y1 - b.y1) : null
  }
  if (aV && bV) {
    const overlap =
      Math.min(Math.max(a.y1, a.y2), Math.max(b.y1, b.y2)) -
      Math.max(Math.min(a.y1, a.y2), Math.min(b.y1, b.y2))
    return overlap > 0 ? Math.abs(a.x1 - b.x1) : null
  }
  return null
}

/**
 * Where two orthogonal segments cross. One runs horizontal and the other vertical,
 * so the point is the pair of their fixed coordinates.
 */
const crossingPoint = (a: Segment, b: Segment): IPoint =>
  a.y1 === a.y2 ? { x: b.x1, y: a.y1 } : { x: a.x1, y: b.y1 }

/** Distance from `p` to the nearest end of segment `s`. */
const distanceToEnds = (p: IPoint, s: Segment): number =>
  Math.min(
    Math.abs(p.x - s.x1) + Math.abs(p.y - s.y1),
    Math.abs(p.x - s.x2) + Math.abs(p.y - s.y2)
  )

/**
 * Is this point too close to a neighbouring edge to be a CORNER?
 *
 * A crossing is drawn as a hop spanning a few pixels either side of the meeting
 * point. Turn the route right there and the hop has no straight run to be drawn on,
 * so a bend landing on another edge costs, and the router slides its corner along
 * until the hop fits. Asked of a corner (known when the search decides to turn),
 * not of a step, which cannot answer it (see `edgePenaltyAt`).
 */
const cornerCrowded = (
  x: number,
  y: number,
  n: NeighborIndex,
  clearance: number
): boolean => {
  for (let i = 0; i < n.hy.length; i++) {
    const dx = Math.max(n.hxLo[i] - x, x - n.hxHi[i], 0)
    const dy = Math.abs(y - n.hy[i])
    if (dx + dy < clearance) return true
  }
  for (let i = 0; i < n.vx.length; i++) {
    const dy = Math.max(n.vyLo[i] - y, y - n.vyHi[i], 0)
    const dx = Math.abs(x - n.vx[i])
    if (dx + dy < clearance) return true
  }
  return false
}

/**
 * The neighbouring edges, indexed by orientation, as flat numbers.
 *
 * Everything is axis-aligned, so crossing/overlap tests reduce to interval
 * arithmetic: a horizontal step can only be OVERLAPPED by a horizontal neighbour
 * and can only CROSS a vertical one, so half the neighbours are skipped by
 * construction. Running the general `segmentsCross` against every neighbour for
 * every step was the most expensive thing this module did.
 */
type NeighborIndex = {
  /** Horizontal segments: fixed y, and the x-span each covers. */
  hy: Float64Array
  hxLo: Float64Array
  hxHi: Float64Array
  /** Vertical segments: fixed x, and the y-span each covers. */
  vx: Float64Array
  vyLo: Float64Array
  vyHi: Float64Array
}

const indexNeighbors = (segments: readonly Segment[]): NeighborIndex => {
  const horizontal = segments.filter((s) => s.y1 === s.y2 && s.x1 !== s.x2)
  const vertical = segments.filter((s) => s.x1 === s.x2 && s.y1 !== s.y2)

  const index: NeighborIndex = {
    hy: new Float64Array(horizontal.length),
    hxLo: new Float64Array(horizontal.length),
    hxHi: new Float64Array(horizontal.length),
    vx: new Float64Array(vertical.length),
    vyLo: new Float64Array(vertical.length),
    vyHi: new Float64Array(vertical.length),
  }
  horizontal.forEach((s, i) => {
    index.hy[i] = s.y1
    index.hxLo[i] = Math.min(s.x1, s.x2)
    index.hxHi[i] = Math.max(s.x1, s.x2)
  })
  vertical.forEach((s, i) => {
    index.vx[i] = s.x1
    index.vyLo[i] = Math.min(s.y1, s.y2)
    index.vyHi[i] = Math.max(s.y1, s.y2)
  })
  return index
}

/** Total edge-awareness penalty for one axis-aligned step. */
const edgePenaltyAt = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  n: NeighborIndex,
  crowdingClearance: number
): number => {
  const horizontal = ay === by
  let penalty = 0

  // Drawn on top of a parallel neighbour, or close enough to smudge into it.
  const fixed = horizontal ? ay : ax
  const lo = horizontal ? Math.min(ax, bx) : Math.min(ay, by)
  const hi = horizontal ? Math.max(ax, bx) : Math.max(ay, by)
  const pAt = horizontal ? n.hy : n.vx
  const pLo = horizontal ? n.hxLo : n.vyLo
  const pHi = horizontal ? n.hxHi : n.vyHi

  for (let i = 0; i < pAt.length; i++) {
    // How far the two actually run together — the length the per-pixel state costs
    // are charged over, so a 10px shadow pays a tenth of a 100px shadow.
    const shared = Math.min(hi, pHi[i]) - Math.max(lo, pLo[i])
    if (shared <= 0) continue
    const gap = Math.abs(fixed - pAt[i])
    // Drawn straight on top of it: reads as a missing edge.
    if (gap === 0) penalty += OVERLAP_COST_PER_PX * shared
    // Close enough to smudge together, and too close for a jump arc to fit.
    else if (gap < crowdingClearance) penalty += CROWDING_COST_PER_PX * shared
  }

  // Crossing a perpendicular neighbour.
  const from = horizontal ? ax : ay
  const to = horizontal ? bx : by
  const cAt = horizontal ? n.vx : n.hy
  const cLo = horizontal ? n.vyLo : n.hxLo
  const cHi = horizontal ? n.vyHi : n.hxHi

  for (let i = 0; i < cAt.length; i++) {
    // The meeting point must be strictly INSIDE the neighbour, not at its tip.
    if (!(cLo[i] < fixed && fixed < cHi[i])) continue
    // Count only the step ARRIVING at the crossing, so it is counted once, not by
    // both the arriving and the leaving step.
    const line = cAt[i]
    const arrives =
      to > from ? from < line && line <= to : to <= line && line < from
    if (!arrives) continue

    penalty += EDGE_CROSSING_PENALTY

    // The hop needs room on both sides. Landed on the END of the crossed edge —
    // against a node, where that edge turns — there is nowhere for the arc and the
    // two lines merge.
    //
    // Only the CROSSED edge's ends are measurable here. "Not near a corner of the
    // CROSSING edge either" cannot be asked of a step: a crossing always lands on a
    // lattice line where the arriving step ends, so that distance is always zero. A
    // step boundary is not a corner; the route's real corners are priced at the
    // bend (see `cornerCrowding`).
    const alongNeighbor = Math.min(
      Math.abs(fixed - cLo[i]),
      Math.abs(fixed - cHi[i])
    )
    if (alongNeighbor < CROSSING_CORNER_CLEARANCE) {
      penalty += CROSSING_NEAR_CORNER_PENALTY
    }
  }

  return penalty
}

/**
 * Whether a route crosses or runs colinear on top of any neighbour edge. Decides
 * whether the cheap route gives way to the edge-aware search; a route conflicting
 * with no neighbour is left untouched.
 */
export const routeConflictsWithNeighborEdges = (
  points: readonly IPoint[],
  neighborEdges: readonly IPoint[][]
): boolean => {
  const neighbors = toSegments(neighborEdges)
  if (neighbors.length === 0) return false
  const crowding = PARALLEL_CROWDING_CLEARANCE_CELLS * CANVAS.SNAP_TO_GRID_PX

  for (let i = 0; i < points.length - 1; i++) {
    const seg: Segment = {
      x1: points[i].x,
      y1: points[i].y,
      x2: points[i + 1].x,
      y2: points[i + 1].y,
    }
    for (const n of neighbors) {
      const gap = parallelGap(seg, n)
      if (gap !== null) {
        if (gap < crowding) return true
        continue
      }
      // A crossing on its own is fine — drawn as a neat hop. Only a crossing with
      // no room for that hop is a conflict worth re-routing for; treating every
      // crossing as one would drag every edge that merely passes over another
      // through the full search for nothing.
      if (!segmentsCross(seg, n)) continue
      const at = crossingPoint(seg, n)
      if (
        distanceToEnds(at, seg) < CROSSING_CORNER_CLEARANCE ||
        distanceToEnds(at, n) < CROSSING_CORNER_CLEARANCE
      ) {
        return true
      }
    }
  }
  return false
}

/** Candidate turning lines along one axis, deduplicated and sorted ascending. */
const collectLines = (
  exact: readonly number[],
  gridSnapped: readonly number[],
  grid: number
): number[] => {
  const snap = (v: number) => Math.round(v / grid) * grid
  const lines = new Set<number>()
  for (const v of exact) lines.add(v)
  for (const v of gridSnapped) lines.add(snap(v))
  return [...lines].sort((a, b) => a - b)
}

/**
 * A minimal deterministic binary min-heap keyed on a numeric priority.
 *
 * Three parallel typed arrays rather than an array of `{priority, seq, state}`:
 * the frontier is the innermost loop, and one object per push (thousands per route)
 * is GC pressure inside the frame budget. Flat arrays make a push three stores.
 */
class MinHeap {
  private priorities: Float64Array
  private seqs: Float64Array
  private states: Int32Array
  private count = 0

  constructor(capacity: number) {
    const initial = Math.max(16, capacity)
    this.priorities = new Float64Array(initial)
    this.seqs = new Float64Array(initial)
    this.states = new Int32Array(initial)
  }

  private grow(): void {
    const grown = this.priorities.length * 2
    const priorities = new Float64Array(grown)
    const seqs = new Float64Array(grown)
    const states = new Int32Array(grown)
    priorities.set(this.priorities)
    seqs.set(this.seqs)
    states.set(this.states)
    this.priorities = priorities
    this.seqs = seqs
    this.states = states
  }

  /** Ties break on the insertion counter, never on object identity or Map order,
   * so the search is deterministic regardless of how the engine schedules it. */
  private less(a: number, b: number): boolean {
    const pa = this.priorities[a]
    const pb = this.priorities[b]
    return pa < pb || (pa === pb && this.seqs[a] < this.seqs[b])
  }

  private swap(a: number, b: number): void {
    const p = this.priorities[a]
    this.priorities[a] = this.priorities[b]
    this.priorities[b] = p
    const s = this.seqs[a]
    this.seqs[a] = this.seqs[b]
    this.seqs[b] = s
    const t = this.states[a]
    this.states[a] = this.states[b]
    this.states[b] = t
  }

  push(priority: number, seq: number, state: number): void {
    if (this.count === this.priorities.length) this.grow()
    let i = this.count++
    this.priorities[i] = priority
    this.seqs[i] = seq
    this.states[i] = state
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (!this.less(i, parent)) break
      this.swap(i, parent)
      i = parent
    }
  }

  /** The lowest-priority state, or -1 when empty. */
  pop(): number {
    if (this.count === 0) return -1
    const top = this.states[0]
    this.count--
    if (this.count > 0) {
      this.priorities[0] = this.priorities[this.count]
      this.seqs[0] = this.seqs[this.count]
      this.states[0] = this.states[this.count]
      let i = 0
      for (;;) {
        const left = 2 * i + 1
        const right = 2 * i + 2
        let smallest = i
        if (left < this.count && this.less(left, smallest)) smallest = left
        if (right < this.count && this.less(right, smallest)) smallest = right
        if (smallest === i) break
        this.swap(i, smallest)
        i = smallest
      }
    }
    return top
  }

  get size(): number {
    return this.count
  }
}

/** One candidate landing point for a search: where a route may end, which side
 * it enters along, and the stub it prefers before its final turn. */
export type RouteTarget = {
  point: IPoint
  position: Position
  stubLength: number
}

/**
 * The obstacle-avoiding orthogonal route from the source to the CHEAPEST of one or
 * more candidate targets, or `null` when none is reachable (walled off by hard
 * obstacles) so the caller can fall back. With a single target this is the classic
 * point-to-point route; with several, one A* pass picks the target endpoint that
 * yields the best path — the endpoint-anchor selection the auto-router needs — and
 * `targetIndex` reports which candidate won so the caller can adopt its anchor.
 *
 * The endpoints are terminal nodes: the route may leave the source only along its
 * declared side, may enter a target only along that target's declared side, and may
 * never pass *through* a node body. The mandatory stubs are part of the searched
 * path, so A* costs them in and a route can never spike out to a target and retrace
 * its approach; a genuine detour that costs more length beats it.
 *
 * `sourceStubLength` / each target's `stubLength` seed a turning lane at stub
 * distance for room before a turn; they are lanes to prefer, not hard minimums.
 */
export const routeAroundObstaclesToTargets = (
  sourcePoint: IPoint,
  sourcePosition: Position,
  sourceStubLength: number,
  targets: readonly RouteTarget[],
  obstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][] = []
): { route: IPoint[]; targetIndex: number } | null => {
  if (targets.length === 0) return null
  const grid = CANVAS.SNAP_TO_GRID_PX
  const idealClearance = EDGES.NODE_CLEARANCE_PX
  const minClearance = EDGES.MIN_NODE_CLEARANCE_PX
  const bendPenalty = BEND_PENALTY_IN_CELLS * grid
  const crowdingClearance = PARALLEL_CROWDING_CLEARANCE_CELLS * grid
  // Cost per pixel travelled, per whole grid cell short of the clearance the run
  // could have had — scaled so that a run at the FULL deficit pays the headline
  // rate, whatever the grid and clearance happen to be.
  const clearanceRate =
    CLEARANCE_COST_PER_PX_AT_FULL_DEFICIT / (idealClearance / grid)

  const sourceHeading = headingOf(sourcePosition)
  const sourceExit = advance(sourcePoint, sourceHeading, sourceStubLength)
  // A turn lane one grid cell out from the source, guaranteeing somewhere to turn
  // even when the endpoints are a single cell apart and the stub would overshoot
  // onto the (blocked) partner node and strand the search.
  const sourceMinExit = advance(sourcePoint, sourceHeading, grid)

  // Per-target terminal geometry: the entry heading, the arrival heading (into the
  // body, opposite the entry side), and the stub / min-turn exits that seed room
  // before the final approach — one set per candidate landing point.
  const targetInfos = targets.map((t) => {
    const heading = headingOf(t.position)
    return {
      point: t.point,
      requiredArrival: opposite(heading),
      exit: advance(t.point, heading, t.stubLength),
      minExit: advance(t.point, heading, grid),
    }
  })

  const hard = obstacles.filter((o) => !o.soft)
  const soft = obstacles.filter((o) => o.soft)

  // Only the neighbouring edges this route can reach: an edge outside the box its
  // endpoints and obstacles span can be neither crossed nor lain on, and every
  // lane derived from one costs cells quadratically for nothing. Callers
  // over-supply "nearby" because they cannot know the corridor before it is
  // built; `neighborsWithinReach` is the box, shared with the solver's route key.
  const neighborSegments = neighborsWithinReach(
    sourcePoint,
    targetInfos.map((t) => t.point),
    obstacles,
    neighborEdges
  )
  const neighborIndex = indexNeighbors(neighborSegments)

  // Turning lines. Endpoints and stub exits are kept exact (the route must reach
  // them); obstacle sides are snapped to the grid (what interior corners land on).
  // A margin ring beyond everything gives U-shaped detours somewhere to turn when
  // a port faces away from its partner.
  const margin = 4 * grid
  const spanXs = [
    sourcePoint.x,
    sourceExit.x,
    ...targetInfos.flatMap((t) => [t.point.x, t.exit.x]),
    ...obstacles.flatMap((o) => [o.x, o.x + o.width]),
  ]
  const spanYs = [
    sourcePoint.y,
    sourceExit.y,
    ...targetInfos.flatMap((t) => [t.point.y, t.exit.y]),
    ...obstacles.flatMap((o) => [o.y, o.y + o.height]),
  ]
  const exactXs = [
    sourcePoint.x,
    sourceExit.x,
    sourceMinExit.x,
    ...targetInfos.flatMap((t) => [t.point.x, t.exit.x, t.minExit.x]),
    Math.min(...spanXs) - margin,
    Math.max(...spanXs) + margin,
  ]
  const exactYs = [
    sourcePoint.y,
    sourceExit.y,
    sourceMinExit.y,
    ...targetInfos.flatMap((t) => [t.point.y, t.exit.y, t.minExit.y]),
    Math.min(...spanYs) - margin,
    Math.max(...spanYs) + margin,
  ]
  // Neighbour-edge lanes, two per segment and no more — the lattice is quadratic in
  // its lines, so five lanes per endpoint per axis would turn ten neighbours into a
  // frozen canvas:
  //
  //  - ESCAPE lanes, one crowding-clearance either side of the neighbour's line, so
  //    a route that would overlap it has somewhere to step aside. Not the line
  //    itself, and not nearer than the clearance (still priced as a smudge).
  //  - A CROSSING lane at the segment's MIDPOINT: furthest from both ends, the one
  //    place a jump arc has room to be drawn.
  //
  // Only on the axis the segment can be escaped or crossed on: a vertical neighbour
  // is escaped by moving in x and says nothing about where to turn in y.
  //
  // Escape lanes snap AWAY from the neighbour, never to the nearest grid line: a
  // neighbour's line need not be on the grid (a freeform anchor rounds to whole
  // pixels), and rounding to nearest can land the lane back INSIDE the band it
  // exists to escape — 8px from a line it must clear by 10.
  const escapeLow = (at: number) =>
    Math.floor((at - crowdingClearance) / grid) * grid
  const escapeHigh = (at: number) =>
    Math.ceil((at + crowdingClearance) / grid) * grid
  const neighborXs = neighborSegments.flatMap((s) =>
    s.x1 === s.x2 ? [escapeLow(s.x1), escapeHigh(s.x1)] : [(s.x1 + s.x2) / 2]
  )
  const neighborYs = neighborSegments.flatMap((s) =>
    s.y1 === s.y2 ? [escapeLow(s.y1), escapeHigh(s.y1)] : [(s.y1 + s.y2) / 2]
  )
  const snappedXs = [
    ...obstacles.flatMap((o) => [o.x, o.x + o.width]),
    ...neighborXs,
  ]
  const snappedYs = [
    ...obstacles.flatMap((o) => [o.y, o.y + o.height]),
    ...neighborYs,
  ]

  // A price can only pick a lane that EXISTS. The proximity term wants a run 25px
  // off a body, or — in a gap too narrow for that — down its middle; neither lane
  // is on the lattice unless put there, and the obstacle sides (the only lanes the
  // graph would otherwise offer) are exactly the hugging lanes being priced away.
  //
  //  - CLEARANCE lanes, one ideal-clearance OUTSIDE each body: the lane a route in
  //    open space should take. Outside only — a lane inside a node is unusable, and
  //    every unusable line still costs a full row of cells (quadratic lattice).
  //  - MID-CHANNEL lanes down the centre of a gap, but ONLY where it is too narrow
  //    to hold clearance lanes; in a wide channel the clearance lanes are the
  //    answer and a mid-line is a lane nobody wants.
  const clearanceLanes = (rects: readonly ObstacleRect[], axis: "x" | "y") =>
    rects.flatMap((o) =>
      axis === "x"
        ? [o.x - idealClearance, o.x + o.width + idealClearance]
        : [o.y - idealClearance, o.y + o.height + idealClearance]
    )

  /**
   * The centre line of every narrow gap between two node borders that FACE each
   * other — one node's right side and another's left, with overlapping extents, so
   * a route can actually travel down the gap.
   *
   * Facing is the point: a lane midway between each ADJACENT pair of sorted borders
   * is wrong, because a third node's border sitting inside the gap splits the pair
   * and the real channel's centre line is never generated. The route then hugs a
   * node for want of a mid-lane that does not exist.
   *
   * Only narrow gaps: wider than two clearances, the clearance lanes are already
   * the answer and a mid-line is a lane nobody wants, paid for quadratically.
   */
  const facingGapMids = (
    rects: readonly ObstacleRect[],
    axis: "x" | "y"
  ): number[] => {
    const mids: number[] = []
    for (const a of rects) {
      for (const b of rects) {
        if (a === b) continue
        const aEnd = axis === "x" ? a.x + a.width : a.y + a.height
        const bStart = axis === "x" ? b.x : b.y
        const gap = bStart - aEnd
        if (gap <= 0 || gap >= 2 * idealClearance) continue

        // They must face each other: nodes side by side in x form a channel only
        // where they also overlap in y.
        const aLo = axis === "x" ? a.y : a.x
        const aHi = axis === "x" ? a.y + a.height : a.x + a.width
        const bLo = axis === "x" ? b.y : b.x
        const bHi = axis === "x" ? b.y + b.height : b.x + b.width
        if (Math.min(aHi, bHi) <= Math.max(aLo, bLo)) continue

        // BOTH grid lines flanking the middle, not the nearest one: a narrow gap
        // rarely has its centre ON the grid (a 25px channel centres at 12.5px), and
        // snapping to nearest discards one lane — if a neighbour edge runs on the
        // survivor, the route is left choosing between overlapping it and hugging
        // the node. Both lines are cheap; let the cost model choose.
        const mid = (aEnd + bStart) / 2
        mids.push(Math.floor(mid / grid) * grid, Math.ceil(mid / grid) * grid)
      }
    }
    return mids
  }

  const xs = collectLines(
    exactXs,
    [
      ...snappedXs,
      ...clearanceLanes(obstacles, "x"),
      ...facingGapMids(obstacles, "x"),
    ],
    grid
  )
  const ys = collectLines(
    exactYs,
    [
      ...snappedYs,
      ...clearanceLanes(obstacles, "y"),
      ...facingGapMids(obstacles, "y"),
    ],
    grid
  )
  const xIndex = new Map(xs.map((v, i) => [v, i]))
  const yIndex = new Map(ys.map((v, i) => [v, i]))

  const nodeAt = (xi: number, yi: number): IPoint => ({ x: xs[xi], y: ys[yi] })
  const stride = ys.length
  const stateId = (xi: number, yi: number, h: Heading): number =>
    (xi * stride + yi) * 4 + h

  const sourceXi = xIndex.get(sourcePoint.x)!
  const sourceYi = yIndex.get(sourcePoint.y)!

  // Each target's lattice cell, its arrival heading, and its index. Keyed by
  // packed cell so the goal test is an O(1) lookup. If two candidates collapse to
  // one cell the earlier (lower-index) one wins — the search is unchanged and the
  // pick stays deterministic.
  const targetCells = new Map<
    number,
    { index: number; requiredArrival: Heading }
  >()
  targetInfos.forEach((t, index) => {
    const cell = xIndex.get(t.point.x)! * stride + yIndex.get(t.point.y)!
    if (!targetCells.has(cell))
      targetCells.set(cell, { index, requiredArrival: t.requiredArrival })
  })

  // Admissible AND consistent: the min of consistent Manhattan heuristics is
  // consistent, so the closed-state skip below stays sound with several targets.
  const targetPoints = targetInfos.map((t) => t.point)
  const heuristic = (xi: number, yi: number): number => {
    let best = Infinity
    for (const p of targetPoints) {
      const d = Math.abs(xs[xi] - p.x) + Math.abs(ys[yi] - p.y)
      if (d < best) best = d
    }
    return best
  }

  // The price of one step, computed ONCE per (cell, direction) and memoized. A
  // step's cost depends only on the two points it joins, never on how the search
  // arrived; but the search reaches a cell in up to four states and revisits cells
  // as it relaxes them, so on-the-fly pricing re-runs the same obstacle scan — the
  // dominant cost of the search. Priced once into a flat array, it is a lookup.
  // (BLOCKED is a sentinel rather than a separate array: hard obstacles are the
  // common rejection, and one branch on a number beats a second lookup.)
  const cellCount = xs.length * ys.length
  if (cellCount > MAX_CELLS) {
    recordRouterSearch(0, true)
    return null
  }
  const BLOCKED = -1
  const UNPRICED = -2
  // Indexed by (cell * 4 + heading): the step LEAVING that cell in that heading.
  // Direction matters — a crossing is charged to the arriving step, so the two
  // directions across one crossing are not priced alike.
  const stepCost = new Float64Array(cellCount * 4).fill(UNPRICED)

  // Whether a corner AT each cell would be crowded by a neighbouring edge. Asked at
  // most once per cell.
  const UNKNOWN_CORNER = -1
  const cornerCrowding = new Int8Array(cellCount).fill(UNKNOWN_CORNER)

  // The solid bodies, as flat numbers. Blocking and clearance ask about the same
  // rectangles in the hottest loop, so they are read out of flat arrays and in one
  // pass rather than two.
  const bodyCount = hard.length
  const bodyX1 = new Float64Array(bodyCount)
  const bodyY1 = new Float64Array(bodyCount)
  const bodyX2 = new Float64Array(bodyCount)
  const bodyY2 = new Float64Array(bodyCount)
  hard.forEach((rect, i) => {
    bodyX1[i] = rect.x
    bodyY1[i] = rect.y
    bodyX2[i] = rect.x + rect.width
    bodyY2[i] = rect.y + rect.height
  })

  const priceStep = (
    xi: number,
    yi: number,
    nxi: number,
    nyi: number,
    nh: Heading
  ): number => {
    const slot = (xi * stride + yi) * 4 + nh
    const cached = stepCost[slot]
    if (cached !== UNPRICED) return cached

    const ax = xs[xi]
    const ay = ys[yi]
    const bx = xs[nxi]
    const by = ys[nyi]

    const horizontal = ay === by
    const left = ax < bx ? ax : bx
    const right = ax < bx ? bx : ax
    const top = ay < by ? ay : by
    const bottom = ay < by ? by : ay

    // One pass over the bodies answers both questions: does this step go THROUGH a
    // body (forbidden), and how much room does it leave on EITHER SIDE. Both sides
    // matter: the nearest body alone cannot tell "close to something" from "should
    // have been elsewhere" — two classes 15px apart leave a band an edge must run
    // 7px from each side of, with nowhere better to be. So the ideal is what the
    // CHANNEL allows (its middle, or the full clearance, whichever is less): room
    // you never had is free. The same term also balances the route.
    let nearestLo = Infinity
    let nearestHi = Infinity
    for (let i = 0; i < bodyCount; i++) {
      // Strict on every side: a segment running exactly along a body's edge grazes
      // it without entering, which is what lets a stub end ON the border of the
      // node it connects to. Hugging is priced by the clearance term below.
      if (
        left < bodyX2[i] &&
        right > bodyX1[i] &&
        top < bodyY2[i] &&
        bottom > bodyY1[i]
      ) {
        stepCost[slot] = BLOCKED
        return BLOCKED
      }

      const spanLo = horizontal ? bodyX1[i] : bodyY1[i]
      const spanHi = horizontal ? bodyX2[i] : bodyY2[i]
      const lo = horizontal ? left : top
      const hi = horizontal ? right : bottom
      // Only a body this run travels PAST counts; one it runs AT would be crossed,
      // just ruled out above.
      if (hi <= spanLo || lo >= spanHi) continue

      const at = horizontal ? ay : ax
      const near = horizontal ? bodyY1[i] : bodyX1[i]
      const far = horizontal ? bodyY2[i] : bodyX2[i]
      if (at <= near) {
        // Body on the far side of the run.
        const gap = near - at
        if (gap < nearestHi) nearestHi = gap
      } else {
        const gap = at - far
        if (gap < nearestLo) nearestLo = gap
      }
    }

    const length = horizontal ? right - left : bottom - top

    // A container is crossed only when going around is hopeless. Charged over the
    // distance travelled inside it, so a wide package costs more than a narrow one.
    let softCost = 0
    for (const rect of soft) {
      if (
        left < rect.x + rect.width &&
        right > rect.x &&
        top < rect.y + rect.height &&
        bottom > rect.y
      ) {
        const inside = horizontal
          ? Math.min(right, rect.x + rect.width) - Math.max(left, rect.x)
          : Math.min(bottom, rect.y + rect.height) - Math.max(top, rect.y)
        softCost += SOFT_CROSSING_COST_PER_PX * inside
      }
    }

    let proximity = 0
    const nearest = nearestLo < nearestHi ? nearestLo : nearestHi
    if (nearest !== Infinity) {
      // Best any route through this channel could do: full clearance if open on one
      // side, the middle if squeezed between two bodies.
      const half = (nearestLo + nearestHi) / 2
      const achievable = half < idealClearance ? half : idealClearance

      // Room the route had and did not take, over the distance travelled while short
      // of it. Zero in the open, zero down the middle of a tight gap.
      const deficitCells = Math.max(0, Math.ceil((achievable - nearest) / grid))
      if (deficitCells > 0) proximity += deficitCells * clearanceRate * length

      // A steeper charge for the two ways a run is WRONG rather than merely tight:
      //
      //  - DRAWN ON a body: route line and node border are one line, never forgiven.
      //    This is the one hole in the channel rule above — two TOUCHING nodes leave
      //    a zero-width channel, so the shared border would otherwise be free — but
      //    it reads as broken and there is nearly always a way round. (A hair OFF
      //    the border is fine: legible, often the only sane line. Hence zero, not
      //    "under ten".)
      //  - HUGGING with room to spare: closer than the minimum when a clean lane
      //    was available.
      const drawnOnBody = nearest === 0
      const hugsWithRoomToSpare =
        nearest < minClearance && achievable >= minClearance
      if (drawnOnBody || hugsWithRoomToSpare) {
        proximity += HUGGING_COST_PER_PX * length
      }
    }

    const cost =
      length +
      softCost +
      proximity +
      edgePenaltyAt(ax, ay, bx, by, neighborIndex, crowdingClearance)

    stepCost[slot] = cost
    return cost
  }

  // g-scores and the came-from chain, as flat arrays indexed by state rather than
  // Maps: the state id is already a dense integer, so an array IS the hash, sparing
  // a per-neighbour hash lookup. `NaN` reads as "unvisited" — every real g-score is
  // finite and any comparison against NaN is false, so the same test that relaxes
  // an edge rejects an unvisited one with no extra branch.
  const stateCount = cellCount * 4
  const gScore = new Float64Array(stateCount).fill(NaN)
  const cameFrom = new Int32Array(stateCount).fill(-1)
  const closed = new Uint8Array(stateCount)
  const frontier = new MinHeap(Math.min(stateCount, 1024))
  let seq = 0

  // The source is terminal: the first segment must leave along its own side, so the
  // search starts already headed that way.
  const startState = stateId(sourceXi, sourceYi, sourceHeading)
  gScore[startState] = 0
  frontier.push(heuristic(sourceXi, sourceYi), seq++, startState)

  const unpack = (state: number): { xi: number; yi: number; h: Heading } => {
    const h = (state & 3) as Heading
    const cell = (state - h) / 4
    return { xi: Math.floor(cell / stride), yi: cell % stride, h }
  }

  const isTarget = (xi: number, yi: number): boolean =>
    targetCells.has(xi * stride + yi)
  const isSource = (xi: number, yi: number): boolean =>
    xi === sourceXi && yi === sourceYi

  let expansions = 0

  while (frontier.size > 0) {
    const current = frontier.pop()
    // A state improved after queueing is in the heap more than once (no decrease-key
    // — re-pushing and ignoring the stale copy is simpler and faster). Skipping a
    // closed state outright is sound because the heuristic is CONSISTENT, not just
    // admissible: h is Manhattan distance and every step costs at least the distance
    // it covers, so A* pops each state already holding its final g and never
    // improves it afterwards. (This is also why no penalty may enter h: the
    // bend/hug/crossing terms would let h fall faster than a short step's cost and
    // break this guarantee.)
    if (closed[current]) continue
    closed[current] = 1

    // Counted here, not at the pop: a stale pop is a heap operation, not a search
    // step, and every state closes at most once — so this measures real work and
    // bounds the loop by the state space.
    if (++expansions > MAX_EXPANSIONS) {
      recordRouterSearch(expansions, true)
      return null
    }

    // Unpacked inline, not via a helper returning an object: this runs millions of
    // times per drag, and a per-expansion object is GC pressure.
    const h = (current & 3) as Heading
    const cell = (current - h) / 4
    const xi = (cell / stride) | 0
    const yi = cell - xi * stride

    if (isTarget(xi, yi)) {
      const raw: IPoint[] = []
      let state = current
      while (state !== -1) {
        const p = unpack(state)
        raw.push(nodeAt(p.xi, p.yi))
        state = cameFrom[state]
      }
      raw.reverse()
      recordRouterSearch(expansions, false)
      return {
        route: simplifyCollinear(raw),
        targetIndex: targetCells.get(xi * stride + yi)!.index,
      }
    }

    const g = gScore[current]
    // Leaving the source, only the declared side is legal; everywhere else all four
    // directions are open. Iterated rather than collected into an array to save an
    // allocation per expansion.
    const leavingSource = isSource(xi, yi)

    for (let nh: Heading = Heading.Up; nh <= Heading.Left; nh++) {
      if (leavingSource && nh !== sourceHeading) continue

      const nxi =
        nh === Heading.Left ? xi - 1 : nh === Heading.Right ? xi + 1 : xi
      const nyi = nh === Heading.Up ? yi - 1 : nh === Heading.Down ? yi + 1 : yi
      if (nxi < 0 || nxi >= xs.length || nyi < 0 || nyi >= ys.length) continue

      // Endpoints are terminal: never route back into the source, and enter the
      // target only along its declared side. This forbids tunnelling through the
      // route's own node bodies.
      if (isSource(nxi, nyi)) continue
      const targetHere = targetCells.get(nxi * stride + nyi)
      if (targetHere && nh !== targetHere.requiredArrival) continue

      const step = priceStep(xi, yi, nxi, nyi, nh)
      if (step === BLOCKED) continue

      // A bend costs more when it lands on a neighbouring edge, where a crossing's
      // jump arc has no straight run to be drawn on. Crowding is cached per cell.
      let bend = 0
      if (nh !== h) {
        bend = bendPenalty
        const cell = xi * stride + yi
        let crowded = cornerCrowding[cell]
        if (crowded === UNKNOWN_CORNER) {
          crowded = cornerCrowded(
            xs[xi],
            ys[yi],
            neighborIndex,
            CROSSING_CORNER_CLEARANCE
          )
            ? 1
            : 0
          cornerCrowding[cell] = crowded
        }
        if (crowded === 1) bend += CROSSING_NEAR_CORNER_PENALTY
      }
      const tentative = g + step + bend

      const neighbourState = stateId(nxi, nyi, nh)
      const known = gScore[neighbourState]
      const unvisited = Number.isNaN(known)
      if (!unvisited && tentative >= known) continue

      gScore[neighbourState] = tentative
      cameFrom[neighbourState] = current
      frontier.push(tentative + heuristic(nxi, nyi), seq++, neighbourState)
    }
  }

  // Walled off by hard obstacles: no route exists.
  recordRouterSearch(expansions, false)
  return null
}

/**
 * Point-to-point orthogonal route (the classic single-target case), kept as the
 * shared primitive for every caller that already knows both endpoints. A thin
 * shim over {@link routeAroundObstaclesToTargets} with one target, so the two can
 * never diverge.
 */
export const routeAroundObstacles = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position,
  obstacles: readonly ObstacleRect[],
  sourceStubLength: number,
  targetStubLength: number,
  neighborEdges: readonly IPoint[][] = []
): IPoint[] | null => {
  const result = routeAroundObstaclesToTargets(
    sourcePoint,
    sourcePosition,
    sourceStubLength,
    [
      {
        point: targetPoint,
        position: targetPosition,
        stubLength: targetStubLength,
      },
    ],
    obstacles,
    neighborEdges
  )
  return result ? result.route : null
}

/**
 * Drop interior points that lie on a straight line *between* their neighbours — a
 * genuine pass-through, neighbours on opposite sides. A point where the path
 * reverses on the same line (both neighbours to one side) is an apex, not a
 * pass-through; removing it would collapse the turn into a retrace, so it is kept.
 */
const simplifyCollinear = (points: IPoint[]): IPoint[] => {
  if (points.length < 3) return points
  const result: IPoint[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1]
    const curr = points[i]
    const next = points[i + 1]
    const passThroughX =
      prev.x === curr.x &&
      curr.x === next.x &&
      (prev.y - curr.y) * (next.y - curr.y) < 0
    const passThroughY =
      prev.y === curr.y &&
      curr.y === next.y &&
      (prev.x - curr.x) * (next.x - curr.x) < 0
    if (!passThroughX && !passThroughY) result.push(curr)
  }
  result.push(points[points.length - 1])
  return result
}

const advance = (point: IPoint, heading: Heading, distance: number): IPoint => {
  switch (heading) {
    case Heading.Up:
      return { x: point.x, y: point.y - distance }
    case Heading.Right:
      return { x: point.x + distance, y: point.y }
    case Heading.Down:
      return { x: point.x, y: point.y + distance }
    case Heading.Left:
    default:
      return { x: point.x - distance, y: point.y }
  }
}
