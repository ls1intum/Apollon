import { Position } from "@xyflow/react"
import { CANVAS, EDGES } from "@/constants"
import type { IPoint } from "@/edges/Connection"
import { recordRouterSearch } from "@/sync/perfCounters"
import type { ObstacleRect } from "@/utils/geometry/obstacles"

/**
 * A pure, synchronous orthogonal connector router: A* over a sparse orthogonal
 * (Hanan) visibility graph.
 *
 * Rather than guessing a handful of Z/L candidate shapes and scoring them, it
 * builds the small grid of lines any optimal orthogonal route must turn on — the
 * sides of every obstacle, the endpoints, the stub exits — and searches it. Hard
 * obstacles are never crossed: no segment that would enter one is ever created.
 *
 * Three properties hold by construction:
 *
 *  - **Grid-aligned:** every turning line is snapped when the graph is built, so
 *    no post-hoc snap can shove a segment back into an obstacle.
 *  - **Deterministic:** the frontier breaks ties on a stable insertion counter, so
 *    identical inputs yield an identical route — which is what keeps a
 *    collaborative (Yjs) session from drifting between peers.
 *  - **Stable under motion:** lanes are quantised to the grid and to obstacle
 *    sides, so a blocker dragged a few pixels moves no lane and the route holds
 *    still until it actually crosses a grid line. No sub-pixel shimmer.
 */

/** The most work one route may cost before the search gives up and the caller
 * falls back to a plain step route. Every state is expanded at most once, so this
 * can only bind on a lattice of more than 15_000 cells — which `MAX_CELLS` has
 * already declined. It is the backstop behind the backstop. */
const MAX_EXPANSIONS = 60_000

/** A lattice so large that even a bounded search on it is not worth starting.
 *
 * This is the budget that actually bites, and it bites BEFORE the cost is paid:
 * the search allocates and clears four arrays of `cells * 4` before it expands a
 * single state, so declining up front is the only way to decline cheaply. The
 * lattice is quadratic in the turning lines, and the turning lines come from the
 * obstacles near one edge — the dense-grid benchmark's worst edge builds ~9_000
 * cells, so this leaves several times the headroom a real diagram uses while
 * capping one search's scratch memory at a few megabytes. */
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
 * Cost weights, all quoted in ONE unit: pixels of travel. Each number reads as
 * "worth going this far out of your way to avoid". A weighted sum, not a
 * lexicographic order — minimising bends *before* length buys absurd detours to
 * save a single corner.
 *
 * The split that keeps the model honest:
 *
 *   - EVENT costs — a bend, a crossing — happen once and are charged once.
 *   - STATE costs — hugging a body, running alongside another edge, travelling
 *     inside a container — last for as long as the route stays in that state, and
 *     are charged PER PIXEL travelled in it.
 *
 * Charge a state cost per lattice STEP instead (as this router first did) and its
 * price becomes "how many turning lines happen to subdivide the run" — and those
 * lines come from unrelated geometry, so moving a node across the canvas silently
 * re-prices a route it has nothing to do with. Per pixel, a route's cost is a
 * function of the geometry alone.
 *
 * It also keeps every penalty within an order of magnitude of the distance it is
 * added to, which is what lets the Manhattan heuristic still prune: a term a
 * thousand times larger than the whole remaining distance turns A* into Dijkstra.
 */

/** One corner. The unit the constants below are quoted in: 8 cells = 40px at the
 * default grid, in band with libavoid's `segmentPenalty`. */
const BEND_PENALTY_IN_CELLS = 8
/** Three bends. Two edges crossing with a clean jump arc is ordinary, legible
 * UML; an edge that swings around a whole class to avoid one is not. (libavoid
 * charges four.) */
const EDGE_CROSSING_PENALTY = 120
/** Fifteen bends. A crossing landing on the END of the crossed edge — against a
 * node, where that edge turns — has nowhere to draw its hop, so the two lines
 * merge and it reads as a mistake. Unlike a crossing, that is nearly always
 * avoidable by sliding the crossing along, so it is priced to be slid. */
const CROSSING_NEAR_CORNER_PENALTY = 600
/** Room a crossing needs at either end to draw its hop: half the 16px jump arc
 * (EDGES.EDGE_LINE_JUMP_WIDTH) plus a grid cell of slack. */
const CROSSING_CORNER_CLEARANCE = 15

/** Two parallel lines closer than this read as one. Two grid cells: enough to be
 * visibly separate, and enough for a jump arc to fit between them. */
const PARALLEL_CROWDING_CLEARANCE_CELLS = 2
/** Per pixel run alongside another edge, close enough that the two smudge
 * together. A 160px run costs 480 — a healthy detour, never a lap. */
const CROWDING_COST_PER_PX = 3
/** Per pixel drawn ON another edge. Two associations rendered as one line is the
 * defect users report as a missing edge — worse than hugging a node, because a hug
 * is ugly while this actively hides an edge — so it buys a long way round: 50px of
 * overlap is worth a 1250px detour, and the router will take it. */
const OVERLAP_COST_PER_PX = 25
/** Per pixel travelled INSIDE a container. A package is nearly a wall: crossing
 * even a narrow one outprices any detour a real diagram can offer, so it happens
 * only when there is genuinely no way around. Per pixel rather than flat, a wide
 * package costs more to trespass than a narrow one — which is both true and what
 * makes the price a function of the geometry rather than of the lattice. */
const SOFT_CROSSING_COST_PER_PX = 50

/**
 * The clearance a run wants beside a node, and what it pays for going short. This
 * one term is margins AND balance, and it says both with the same number: cost is
 * proportional to the shortfall against the ideal and to how far the run travels
 * while short of it. So 25px of room is free, and in a 20px gap every lane costs
 * something, the middle costs least, and the gap still beats going around.
 *
 * A margin RECTANGLE can say neither: every lane through a blanketed gap is equally
 * "inside" it, and a segment running exactly ALONG a rectangle's edge never enters
 * it — so the cheapest lane of all turns out to be the node's own border.
 *
 * Quantised to whole grid cells, so a node nudged one pixel cannot make a route
 * twitch, and capped at the ideal, so a route in the open never pays. A run at the
 * full shortfall costs a pixel per pixel: 160px of hug buys a 160px detour to get
 * clear, and no more. Raise it and clearance starts buying corners, which produces
 * 20px doglegs — better spaced, obviously worse.
 */
const CLEARANCE_COST_PER_PX_AT_FULL_DEFICIT = 1
/**
 * Per pixel run right up against a body — closer than MIN_NODE_CLEARANCE_PX, which
 * in practice means on its border. This, not the gradient above, is what buys the
 * big detours: the gradient is capped at a pixel per pixel, cheap enough that the
 * router would hug a node to save itself a crossing, which is the wrong way round.
 * An edge drawn ON a node is the worst thing this router can produce short of
 * cutting through one; a crossing is ordinary and often unavoidable.
 *
 * At 8, a class's width of hug (160px) costs 1280 — several nodes' worth of detour
 * to escape, never a lap of the diagram. Above a badly-placed crossing and above
 * crowding an edge, so all of those are preferable to touching a node; below a
 * container, so a hug is still taken over no route at all.
 */
const HUGGING_COST_PER_PX = 8

/**
 * Room on either side of a run, and the best any run through that channel could
 * do. The same question `priceStep` asks — asked here for a route that already
 * exists, rather than for a step being considered.
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

  // A run only counts as travelling PAST a body if it travels past a real length
  // of it — one it runs AT is heading INTO, which is what a stub does to its own
  // node, and one it clips the corner of by a pixel it is not running alongside at
  // all. Without this, a stub that grazes the corner of a node's span condemns an
  // otherwise perfect route to a full search.
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
 * Does this route keep the clearance the ROUTER would have insisted on? The
 * fitness test for the cheap (plain step) route: keep the clearance a search would
 * have kept — the full `ideal`, or the middle of the channel where `ideal` will not
 * fit — and the route is kept untouched. Fall short and the search takes over.
 *
 * `exemptEndsPx` is the difference between a gate and a trap. A route's stubs run
 * on a line the router does not choose — it is fixed by where the handle is — so if
 * a handle sits 5px from a neighbour's span, EVERY route leaving it runs 5px from
 * that neighbour, the searched one included. Judge the stub and the gate condemns a
 * route for a flaw no search can repair: the cheap route is rejected, a full A* runs
 * and returns the same stub, which is then accepted unchecked. A guaranteed-futile
 * search, on the dense diagrams that can least afford one.
 *
 * One grid cell of tolerance, because a lane can only land on the grid — but the
 * tolerance stops at the floor: a route within `minimum` of a node that could have
 * kept `minimum` is not "a cell off", it is the defect.
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
    // The part of this segment that lies clear of both exempt stubs. Trimming the
    // segment rather than skipping it whole means a first segment that runs on
    // beside a node — which the router COULD have turned away from — is still
    // judged, for the part of it the router had a say in.
    const from = Math.max(0, exemptEndsPx - start)
    const to = Math.min(lengths[i], total - exemptEndsPx - start)
    if (to - from <= 0) continue

    const a = along(points[i], points[i + 1], from)
    const b = along(points[i], points[i + 1], to)
    const { nearest, achievable } = clearanceAlongside(a, b, bodies, ideal)

    if (nearest === Infinity) continue
    // Drawn ON a node. Never acceptable, whatever the channel allows — two nodes
    // that touch allow nothing, and a step route down their shared border is
    // precisely the picture that reads as broken.
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
 * A route is walked as a chain of steps between lattice lines, and a crossing can
 * land exactly on one of them — one step ending where the next begins. The textbook
 * strictly-both-sides test sees each of those steps merely TOUCHING the line and
 * reports no crossing at all, so crossings go unpriced and the router draws through
 * other edges without knowing it.
 *
 * So the test is half-open: `b`'s endpoints must strictly straddle `a`'s line (the
 * meeting point is inside `b`, not at its tip), and `a` must go from strictly one
 * side of `b` to on-or-past it — true for the step that ARRIVES at the crossing,
 * false for the one that leaves. Counted at all, and counted once.
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
 * Zero means one is drawn on top of the other. A few pixels is barely better: two
 * lines a hair apart read as one thick smudge, and a route creeping along a
 * container's frame 4px off it looks welded to the frame. So this measures the gap
 * rather than testing for exact coincidence — "not touching" was never the bar;
 * "visibly apart" is.
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
 * Where two orthogonal segments cross. One runs horizontal and the other vertical
 * (a crossing between two parallel segments is an overlap, not a crossing), so the
 * point is simply the pair of their fixed coordinates.
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
 * point. Turn the route right there and the hop has no straight run to be drawn on:
 * the two lines merge and the crossing reads as a mistake. So a bend landing on top
 * of another edge costs, and the router slides its corner along until the hop fits.
 *
 * Asked of a CORNER, which is a point known at the moment the search decides to
 * turn — not of a step, which cannot answer it (see `edgePenaltyAt`).
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
 * Everything here is axis-aligned, so the general-position `segmentsCross` (four
 * cross-products, read out of an object per segment) is interval arithmetic
 * instead: a horizontal step can only be OVERLAPPED by a horizontal neighbour and
 * can only CROSS a vertical one, so half the neighbours are skipped by
 * construction rather than by test. Running the general version in the innermost
 * loop, against every neighbour, for every step, was the most expensive thing this
 * module did.
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
    // How far the two actually run together. This is the length the state costs
    // below are charged over — not the whole step, and not a flat charge per step:
    // a step that shadows a neighbour for 10px has done a tenth of the damage of
    // one that shadows it for 100px, and should pay a tenth as much.
    const shared = Math.min(hi, pHi[i]) - Math.max(lo, pLo[i])
    if (shared <= 0) continue
    const gap = Math.abs(fixed - pAt[i])
    // Drawn straight on top of it: the worst outcome, and the one users read as a
    // missing edge.
    if (gap === 0) penalty += OVERLAP_COST_PER_PX * shared
    // Close enough to smudge together — and, for a crossing edge, close enough
    // that no jump arc will fit between them.
    else if (gap < crowdingClearance) penalty += CROWDING_COST_PER_PX * shared
  }

  // Crossing a perpendicular neighbour.
  const from = horizontal ? ax : ay
  const to = horizontal ? bx : by
  const cAt = horizontal ? n.vx : n.hy
  const cLo = horizontal ? n.vyLo : n.hxLo
  const cHi = horizontal ? n.vyHi : n.hxHi

  for (let i = 0; i < cAt.length; i++) {
    // The neighbour must genuinely straddle this step's line: the meeting point
    // has to be INSIDE the neighbour, not at its tip.
    if (!(cLo[i] < fixed && fixed < cHi[i])) continue
    // And this step must be the one ARRIVING at the crossing, so it is counted
    // once — not by both the step that reaches it and the step that leaves it.
    const line = cAt[i]
    const arrives =
      to > from ? from < line && line <= to : to <= line && line < from
    if (!arrives) continue

    penalty += EDGE_CROSSING_PENALTY

    // A crossing is drawn as a hop over the other edge, and the hop needs room on
    // both sides. Land it on the END of the crossed edge — against a node, where
    // that edge turns — and there is nowhere to put the arc, so the two lines merge.
    //
    // Only the CROSSED edge's ends are measurable here. The other half of the
    // question — "and not near a corner of the CROSSING edge either" — cannot be
    // asked of a step: a crossing always lands on a lattice line, so the arriving
    // step always ends at it, and the distance from the crossing to the step's end
    // is always zero. Every crossing would read as cramped. A step boundary is not a
    // corner; the route's real corners are priced at the bend (see `cornerCrowding`).
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
 * Whether a route crosses or runs colinear on top of any neighbour edge. Used to
 * decide whether the cheap route has to give way to the edge-aware search — a
 * route that conflicts with no neighbour is left untouched.
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
      // A crossing on its own is fine — often unavoidable, and drawn as a neat
      // hop. Only a crossing with no room for that hop is a conflict worth
      // re-routing for. Treating every crossing as a conflict would drag every edge
      // that merely passes over another through the full search for nothing.
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
 * the frontier is the innermost loop of the search, and one small object per push
 * — thousands per route, tens of thousands per frame of a drag — is allocation the
 * garbage collector has to chase inside the frame budget. Flat arrays make a push
 * three stores, and a sift a handful of numeric swaps.
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

/**
 * The obstacle-avoiding orthogonal route between two connection points, or
 * `null` when no route can be found (walled off by hard obstacles) so the caller
 * can fall back.
 *
 * The two endpoints are terminal nodes in the search graph: the route may leave
 * the source only along its declared side, may enter the target only along its
 * declared side, and may never pass *through* either node body. Because the
 * mandatory stubs are part of the searched path — not appended afterwards — A*
 * costs them in, so a route can never spike out to the target and retrace its
 * own approach; a genuine detour that costs more length correctly beats it.
 *
 * `sourceStubLength` / `targetStubLength` seed a turning lane at stub distance so
 * the route has room to breathe before its first turn; they are lanes to prefer,
 * not hard minimums.
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
  const targetHeading = headingOf(targetPosition)
  // The heading a segment must be travelling in to arrive at the target: into
  // the node, i.e. opposite the side it enters on.
  const requiredArrival = opposite(targetHeading)

  const sourceExit = advance(sourcePoint, sourceHeading, sourceStubLength)
  const targetExit = advance(targetPoint, targetHeading, targetStubLength)
  // A turn lane exactly one grid cell out from each endpoint. The stub-distance
  // lane is where the route turns when there is room; this one guarantees there
  // is *somewhere* to turn even when the endpoints are a single cell apart and
  // the stub would overshoot — without it, a forced first step can land straight
  // on the (blocked) partner node and strand the search.
  const sourceMinExit = advance(sourcePoint, sourceHeading, grid)
  const targetMinExit = advance(targetPoint, targetHeading, grid)

  const hard = obstacles.filter((o) => !o.soft)
  const soft = obstacles.filter((o) => o.soft)

  // Only the neighbouring edges this route can actually reach.
  //
  // A route lives inside the box its endpoints and its obstacles span (that box is
  // literally where its turning lines come from), so an edge outside it can be
  // neither crossed nor lain on top of, and every lane derived from one is a lane
  // no route will ever turn on — paid for in cells, quadratically. Callers hand
  // over what is nearby; "nearby" is generous, because they cannot know the
  // corridor before it is built. Here it is known, so it is applied.
  const reach = 4 * grid + idealClearance
  const routeLeft =
    Math.min(sourcePoint.x, targetPoint.x, ...obstacles.map((o) => o.x)) - reach
  const routeRight =
    Math.max(
      sourcePoint.x,
      targetPoint.x,
      ...obstacles.map((o) => o.x + o.width)
    ) + reach
  const routeTop =
    Math.min(sourcePoint.y, targetPoint.y, ...obstacles.map((o) => o.y)) - reach
  const routeBottom =
    Math.max(
      sourcePoint.y,
      targetPoint.y,
      ...obstacles.map((o) => o.y + o.height)
    ) + reach

  const neighborSegments = toSegments(neighborEdges).filter(
    (s) =>
      Math.min(s.x1, s.x2) <= routeRight &&
      Math.max(s.x1, s.x2) >= routeLeft &&
      Math.min(s.y1, s.y2) <= routeBottom &&
      Math.max(s.y1, s.y2) >= routeTop
  )
  const neighborIndex = indexNeighbors(neighborSegments)

  // Turning lines. Endpoints and their stub exits are kept exact — the route has
  // to reach them; obstacle sides are snapped to the grid, since they are what
  // interior corners land on. A margin ring beyond everything gives U-shaped
  // detours somewhere to turn when a port faces away from its partner.
  const margin = 4 * grid
  const spanXs = [
    sourcePoint.x,
    targetPoint.x,
    sourceExit.x,
    targetExit.x,
    ...obstacles.flatMap((o) => [o.x, o.x + o.width]),
  ]
  const spanYs = [
    sourcePoint.y,
    targetPoint.y,
    sourceExit.y,
    targetExit.y,
    ...obstacles.flatMap((o) => [o.y, o.y + o.height]),
  ]
  const exactXs = [
    sourcePoint.x,
    targetPoint.x,
    sourceExit.x,
    targetExit.x,
    sourceMinExit.x,
    targetMinExit.x,
    Math.min(...spanXs) - margin,
    Math.max(...spanXs) + margin,
  ]
  const exactYs = [
    sourcePoint.y,
    targetPoint.y,
    sourceExit.y,
    targetExit.y,
    sourceMinExit.y,
    targetMinExit.y,
    Math.min(...spanYs) - margin,
    Math.max(...spanYs) + margin,
  ]
  // Neighbour-edge lanes, two per segment and no more — the lattice is quadratic in
  // its lines, so the obvious version (five lanes around each endpoint on both axes)
  // is what turns ten neighbours into a frozen canvas:
  //
  //  - ESCAPE lanes, one crowding-clearance either side of the neighbour's line, so
  //    a route that would be drawn on top of it has somewhere to step aside to. Not
  //    the line itself — that is the overlap being escaped — and not nearer than the
  //    clearance, which would still be priced as a smudge.
  //  - A CROSSING lane, at the segment's MIDPOINT: the furthest point from both ends,
  //    and so the one place a jump arc has room to be drawn.
  //
  // Only on the axis the segment can be escaped or crossed on: a vertical neighbour
  // is escaped by moving in x, and says nothing about where a route should turn in y.
  //
  // The escape lanes snap AWAY from the neighbour, never to the nearest grid line. A
  // neighbour's line need not be on the grid (a freeform anchor rounds to whole
  // pixels), and rounding to nearest can land the lane back INSIDE the band it exists
  // to escape: 8px from a line it must clear by 10, still a smudge, not an escape.
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

  // A price can only pick a lane that EXISTS. The proximity term wants a run to
  // stand 25px off a body, or — where a gap is too narrow for that — to go down
  // the middle of it; neither lane is on the lattice unless it is put there, and
  // the obstacle sides themselves (the only lanes the graph would otherwise
  // offer) are exactly the hugging lanes we are trying to price away from.
  //
  //  - CLEARANCE lanes, one ideal-clearance OUTSIDE each body: the lane a route in
  //    open space should be taking. Outside only — a lane 25px inside a node is a
  //    lane no route can ever use, and every unusable line still costs a full row
  //    of cells, because the search is quadratic in the lattice.
  //  - MID-CHANNEL lanes, down the centre of a gap — but ONLY where the gap is too
  //    narrow to hold clearance lanes. In a wide channel the clearance lanes are
  //    already the answer and the mid-line is a lane nobody wants.
  const clearanceLanes = (rects: readonly ObstacleRect[], axis: "x" | "y") =>
    rects.flatMap((o) =>
      axis === "x"
        ? [o.x - idealClearance, o.x + o.width + idealClearance]
        : [o.y - idealClearance, o.y + o.height + idealClearance]
    )

  /**
   * The centre line of every narrow gap between two node borders that FACE each
   * other — one node's right side and another's left, with overlapping extents, so
   * the gap is one a route can actually travel down.
   *
   * Facing is the point. Sorting every border and putting a lane midway between each
   * ADJACENT pair — the obvious version — is quietly wrong: a border belonging to
   * some third node, sitting anywhere inside the gap, splits the pair and the real
   * channel's centre line is never generated. The route then hugs a node for want of
   * a lane down the middle, and no amount of pricing can pick a lane that does not
   * exist.
   *
   * Only narrow gaps. Wider than two clearances and the clearance lanes are already
   * the answer; a mid-line there is a lane nobody wants, paid for quadratically.
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

        // They must actually face each other: two nodes side by side in x only form
        // a channel where they also overlap in y.
        const aLo = axis === "x" ? a.y : a.x
        const aHi = axis === "x" ? a.y + a.height : a.x + a.width
        const bLo = axis === "x" ? b.y : b.x
        const bHi = axis === "x" ? b.y + b.height : b.x + b.width
        if (Math.min(aHi, bHi) <= Math.max(aLo, bLo)) continue

        // BOTH grid lines flanking the middle, not the nearest one.
        //
        // A narrow gap rarely has its centre ON the grid: a 25px channel is centred
        // at 12.5px, between two lines. Snapping that to the nearest keeps one lane
        // and silently discards the other — and if a neighbouring edge already runs
        // on the one that survives, the route is left choosing between lying on top
        // of that edge and hugging the node, because the perfectly good lane one
        // cell over was never offered. Both are cheap (one extra line per facing
        // pair) and the cost model is what should be choosing between them.
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
  const targetXi = xIndex.get(targetPoint.x)!
  const targetYi = yIndex.get(targetPoint.y)!

  const heuristic = (xi: number, yi: number): number =>
    Math.abs(xs[xi] - targetPoint.x) + Math.abs(ys[yi] - targetPoint.y)

  // The price of one step, computed ONCE per (cell, direction) and remembered.
  //
  // A step's cost — is it blocked, does it cross a container, does it lie on
  // another edge, how much room does it leave beside a node — depends only on the
  // two points it joins, never on how the search arrived there. But the search
  // arrives at a cell in up to four states (one per heading), and revisits cells
  // as it relaxes them, so pricing on the fly re-runs the same obstacle scan over
  // and over: the dominant cost of the whole search, and quadratic in exactly the
  // thing that grows on a real diagram. Priced once into a flat array, it is a
  // lookup. (BLOCKED is a sentinel rather than a separate array: hard obstacles
  // are the common rejection, and one branch on a number beats a second lookup.)
  const cellCount = xs.length * ys.length
  if (cellCount > MAX_CELLS) {
    recordRouterSearch(0, true)
    return null
  }
  const BLOCKED = -1
  const UNPRICED = -2
  // Indexed by (cell * 4 + heading): the step LEAVING that cell in that heading.
  // Direction matters — a crossing is charged to the step that arrives at it, so
  // the two directions across one crossing are not priced alike.
  const stepCost = new Float64Array(cellCount * 4).fill(UNPRICED)

  // Whether a corner AT each cell would be crowded by a neighbouring edge. One
  // question per cell, asked at most once.
  const UNKNOWN_CORNER = -1
  const cornerCrowding = new Int8Array(cellCount).fill(UNKNOWN_CORNER)

  // The solid bodies, as flat numbers. Blocking and clearance ask about the same
  // rectangles, one step at a time, in the hottest loop there is; reading them out
  // of objects — and walking the list twice to ask the two questions separately —
  // is a cost with no argument behind it.
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

    // One pass over the bodies answers every question this step has: does it go
    // THROUGH a body (it may not), and how much room does it leave on EITHER SIDE.
    //
    // Both sides, and that is the whole of it. The nearest body alone says "you are
    // close to something", which is not "you should have been somewhere else": two
    // classes 15px apart leave a 15px band, an edge crossing it runs 7px from each,
    // and there is nowhere better to be. Price that as a hug and the router pays
    // hundreds of pixels to wrap a node rather than take the only gap there is.
    //
    // So the ideal is what the CHANNEL allows — its middle, or the full clearance,
    // whichever is less. Room you never had is free; room you had and did not take
    // is what you pay for. That is also what makes a route balanced: not a tiebreak
    // bolted on beside the margin, the same term.
    let nearestLo = Infinity
    let nearestHi = Infinity
    for (let i = 0; i < bodyCount; i++) {
      // Strict on every side: a segment running exactly along a body's edge grazes
      // it without entering. That is not a licence to hug — hugging is what the
      // clearance below prices — it is what lets a stub end ON the border of the
      // node it connects to.
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
      // Only a body this run travels PAST counts. One it runs AT would be crossed,
      // and it cannot be — that was just ruled out.
      if (hi <= spanLo || lo >= spanHi) continue

      const at = horizontal ? ay : ax
      const near = horizontal ? bodyY1[i] : bodyX1[i]
      const far = horizontal ? bodyY2[i] : bodyX2[i]
      if (at <= near) {
        // The body lies on the far side of the run.
        const gap = near - at
        if (gap < nearestHi) nearestHi = gap
      } else {
        const gap = at - far
        if (gap < nearestLo) nearestLo = gap
      }
    }

    const length = horizontal ? right - left : bottom - top

    // A container is nearly a wall, but only nearly: it is crossed when going
    // around it is hopeless. Charged over the distance actually travelled inside
    // it, so a wide package costs more to trespass than a narrow one.
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
      // The best any route through this channel could do. Open on one side, that
      // is the full clearance; squeezed between two bodies, it is the middle.
      const half = (nearestLo + nearestHi) / 2
      const achievable = half < idealClearance ? half : idealClearance

      // Room the route had and did not take, over the distance it travels while
      // short of it. Zero in the open, zero down the middle of a tight gap: you are
      // never charged for room that never existed.
      const deficitCells = Math.max(0, Math.ceil((achievable - nearest) / grid))
      if (deficitCells > 0) proximity += deficitCells * clearanceRate * length

      // And a much steeper charge for the two ways a run is WRONG rather than
      // merely tight:
      //
      //  - DRAWN ON a body: the route's line and the node's border are one line.
      //    Never forgiven, however tight the space. This is the one hole in the
      //    channel rule above: two nodes that TOUCH leave a channel of width zero,
      //    so the shared border IS the best line available and a route drawn along
      //    it would be charged nothing. But an edge drawn along a class's border
      //    does not read as "there was no room", it reads as broken, and there is
      //    nearly always a way round at some price. Priced, the way round is bought.
      //    (A hair OFF the border is a different thing — visible, legible, often the
      //    only sane line through a tight gap. Hence zero, not "under ten".)
      //
      //  - HUGGING with room to spare: closer than the minimum when a clean lane was
      //    there for the taking.
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
  // Maps. A hash lookup per neighbour, per expansion, is the kind of constant
  // factor that does not show up in a complexity argument and does show up in a
  // dropped frame; the state id is already a dense integer, so an array IS the
  // hash. `NaN` reads as "unvisited" because every real g-score is finite and any
  // comparison against NaN is false — the same test that relaxes an edge rejects
  // an unvisited one, with no extra branch.
  const stateCount = cellCount * 4
  const gScore = new Float64Array(stateCount).fill(NaN)
  const cameFrom = new Int32Array(stateCount).fill(-1)
  const closed = new Uint8Array(stateCount)
  const frontier = new MinHeap(Math.min(stateCount, 1024))
  let seq = 0

  // The source is terminal: the first segment must leave along its own side, so
  // the search starts already headed that way and refuses to turn until it has
  // taken at least one step.
  const startState = stateId(sourceXi, sourceYi, sourceHeading)
  gScore[startState] = 0
  frontier.push(heuristic(sourceXi, sourceYi), seq++, startState)

  const unpack = (state: number): { xi: number; yi: number; h: Heading } => {
    const h = (state & 3) as Heading
    const cell = (state - h) / 4
    return { xi: Math.floor(cell / stride), yi: cell % stride, h }
  }

  const isTarget = (xi: number, yi: number): boolean =>
    xi === targetXi && yi === targetYi
  const isSource = (xi: number, yi: number): boolean =>
    xi === sourceXi && yi === sourceYi

  let expansions = 0

  while (frontier.size > 0) {
    const current = frontier.pop()
    // A state improved after it was queued is in the heap more than once (the heap
    // has no decrease-key: re-pushing and ignoring the stale copy is both simpler
    // and measurably faster than threading handles through it). Every copy after
    // the first is stale, and expanding it would redo settled work.
    //
    // Skipping it outright — rather than merely re-checking its g — is sound here
    // because the heuristic is CONSISTENT, not just admissible: h is Manhattan
    // distance, every step costs at least the distance it covers, so h can never
    // fall faster than the route accrues. A* with a consistent heuristic pops each
    // state already holding its final g, and a state can never be improved after it
    // is expanded. (This is also why no penalty may enter h: the bend/hug/crossing
    // terms would let h fall faster than a short step's cost and break the
    // guarantee this line depends on.)
    if (closed[current]) continue
    closed[current] = 1

    // Counted here, not at the pop: a stale pop is a heap operation, not a search
    // step, and every state is closed at most once — so this both measures the work
    // the search actually does and bounds the loop by the state space itself.
    if (++expansions > MAX_EXPANSIONS) {
      recordRouterSearch(expansions, true)
      return null
    }

    // Unpacked inline, not through a helper returning an object: this runs
    // millions of times per drag, and a short-lived object per expansion is
    // garbage the collector has to chase inside the frame budget.
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
      return simplifyCollinear(raw)
    }

    const g = gScore[current]
    // Leaving the source, only the declared side is legal; everywhere else all
    // four directions are on the table. Iterated rather than collected into an
    // array — the same order (the enum IS the order), one fewer allocation per
    // expansion.
    const leavingSource = isSource(xi, yi)

    for (let nh: Heading = Heading.Up; nh <= Heading.Left; nh++) {
      if (leavingSource && nh !== sourceHeading) continue

      const nxi =
        nh === Heading.Left ? xi - 1 : nh === Heading.Right ? xi + 1 : xi
      const nyi = nh === Heading.Up ? yi - 1 : nh === Heading.Down ? yi + 1 : yi
      if (nxi < 0 || nxi >= xs.length || nyi < 0 || nyi >= ys.length) continue

      // The endpoints are terminal: never route back into the source, and enter
      // the target only along its declared side. This is what forbids the route
      // from tunnelling through its own node bodies.
      if (isSource(nxi, nyi)) continue
      if (isTarget(nxi, nyi) && nh !== requiredArrival) continue

      const step = priceStep(xi, yi, nxi, nyi, nh)
      if (step === BLOCKED) continue

      // A bend costs a bend — and costs more when it lands on top of a neighbouring
      // edge, where a crossing's jump arc would have no straight run to be drawn on.
      // Cached per cell: a corner's crowding depends only on where it is.
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

  // Walled off by hard obstacles: no route exists. Still a search that ran.
  recordRouterSearch(expansions, false)
  return null
}

/**
 * Drop interior points that lie on a straight line *between* their neighbours.
 * A point is only redundant when it is a genuine pass-through — its neighbours
 * sit on opposite sides of it. A point where the path reverses on the same line
 * (both neighbours to one side) is an apex, not a pass-through, and removing it
 * would collapse the turn into a retrace; it is kept.
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
