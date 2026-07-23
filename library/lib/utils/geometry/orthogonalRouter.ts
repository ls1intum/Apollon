import { Position, type Rect } from "@xyflow/system"
import { CANVAS, EDGES } from "@/utils/geometry/routingConstants"
import type { IPoint } from "@/edges/Connection"
import { recordRouterSearch } from "@/sync/perfCounters"
import type { ObstacleRect } from "@/utils/geometry/obstacles"
import {
  ROUTING_COST,
  segmentCrowdingPx,
  validateEndpointCost,
} from "@/utils/geometry/routingCost"

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

/** The three legal successors for each heading, in the same ascending Heading
 * order as the former four-way loop after it rejected the immediate reverse. */
const NEXT_HEADINGS = new Uint8Array([
  Heading.Up,
  Heading.Right,
  Heading.Left,
  Heading.Up,
  Heading.Right,
  Heading.Down,
  Heading.Right,
  Heading.Down,
  Heading.Left,
  Heading.Up,
  Heading.Down,
  Heading.Left,
])

/**
 * Minimum heading changes in an obstacle-free relaxation. A required-direction
 * mask says which cardinal directions must occur somewhere in the walk to cover
 * the target's x/y displacement. Segment lengths may be zero in the relaxation:
 * that can only under-estimate a real route, while retaining the triangle
 * inequality A* needs to settle each state once.
 *
 * Four changes are enough to visit every direction and finish on any required
 * arrival heading. Real displacement masks contain at most one horizontal and
 * one vertical direction, but filling the complete table makes the invariant
 * explicit and keeps the hot heuristic lookup branch-free.
 */
const MIN_BENDS_BY_HEADINGS_AND_DIRECTIONS = (() => {
  const table = new Uint8Array(4 * 4 * 16).fill(255)

  const visit = (
    start: Heading,
    current: Heading,
    visitedDirections: number,
    bends: number
  ): void => {
    const offset = (start * 4 + current) * 16
    for (let required = 0; required < 16; required++) {
      if (
        (visitedDirections & required) === required &&
        bends < table[offset + required]
      )
        table[offset + required] = bends
    }
    if (bends === 4) return

    for (let next = Heading.Up; next <= Heading.Left; next++) {
      if (next === current) continue
      visit(start, next, visitedDirections | (1 << next), bends + 1)
    }
  }

  for (let start = Heading.Up; start <= Heading.Left; start++)
    visit(start, start, 1 << start, 0)
  return table
})()

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
const BEND_PENALTY_IN_CELLS = ROUTING_COST.bendInGridCells
/** Ten bends. A clean jump arc remains a valid last resort, but an ordinary
 * diagram should spend several corners and a moderate detour before introducing
 * an avoidable crossing. */
const EDGE_CROSSING_PENALTY = ROUTING_COST.edgeCrossing
/** Fifteen bends. A crossing on the END of the crossed edge — against a node,
 * where that edge turns — has nowhere to draw its hop, so the two lines merge.
 * Nearly always avoidable by sliding the crossing along, so priced to be slid. */
const CROSSING_NEAR_CORNER_PENALTY = ROUTING_COST.crossingNearCorner
/** Room a crossing needs at either end to draw its hop: half the 16px jump arc
 * (EDGES.EDGE_LINE_JUMP_WIDTH) plus a grid cell of slack. */
const CROSSING_CORNER_CLEARANCE = ROUTING_COST.crossingCornerClearance
const CROSSING_CORNER_CLEARANCE_SQUARED =
  CROSSING_CORNER_CLEARANCE * CROSSING_CORNER_CLEARANCE

/** Two parallel lines closer than this read as one. Two grid cells: visibly
 * separate, and enough for a jump arc to fit between them. */
const PARALLEL_CROWDING_CLEARANCE_CELLS =
  ROUTING_COST.parallelCrowdingClearanceInGridCells
/** Per pixel run alongside another edge close enough to smudge together. A 160px
 * run costs 480 — a healthy detour, never a lap. */
const CROWDING_COST_PER_PX = ROUTING_COST.crowdingPerPx
/** Per pixel drawn ON another edge — the defect users report as a missing edge,
 * worse than hugging a node. Buys a long way round: 50px of overlap is worth a
 * 1250px detour. */
const OVERLAP_COST_PER_PX = ROUTING_COST.overlapPerPx
/** Per pixel travelled INSIDE a container. A package is nearly a wall: crossing
 * even a narrow one outprices any detour a real diagram offers. Per pixel rather
 * than flat, so a wide package costs more to trespass than a narrow one. */
const SOFT_CROSSING_COST_PER_PX = ROUTING_COST.softCrossingPerPx

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
const CLEARANCE_COST_PER_PX_AT_FULL_DEFICIT =
  ROUTING_COST.clearancePerPxAtFullDeficit
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
const HUGGING_COST_PER_PX = ROUTING_COST.huggingPerPx
const CHANNEL_IMBALANCE_TIE_BREAK_PER_PX =
  ROUTING_COST.channelImbalanceTieBreakPerPx

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

/**
 * Whether a candidate STRAIGHT-SHOT route keeps the router's clearance from every
 * hard body — the gate the straight-path shortcut needs so it does not ship a line
 * drawn along a border or through a touching seam (the strict crossing test misses
 * those). Wraps `routeRunsTooCloseToBody` with the router's own constants so the
 * caller (`edgeRoute`) need not import them — which would deepen the
 * `constants ↔ components` import cycle and leave `CANVAS` undefined at init. The
 * endpoint stubs legitimately touch their OWN nodes, so the near-node run is exempt.
 */
export const straightPathClearsBodies = (
  points: readonly IPoint[],
  hardBodies: readonly ObstacleRect[]
): boolean =>
  !routeRunsTooCloseToBody(
    points,
    hardBodies,
    EDGES.NODE_CLEARANCE_PX,
    EDGES.MIN_NODE_CLEARANCE_PX,
    CANVAS.SNAP_TO_GRID_PX,
    EDGES.STUB_LENGTH
  )

type Segment = {
  x1: number
  y1: number
  x2: number
  y2: number
  /** True only for real polyline ends. Internal segment ends are bends, not gaps
   * a different edge can detour around without immediately meeting the adjacent
   * segment. */
  startTerminal?: boolean
  endTerminal?: boolean
}

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
        startTerminal: i === 0,
        endTerminal: i === line.length - 2,
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
 * routing margin. Axis-aligned segments are clipped to that box, and synthetic
 * clip points are not terminals. A remote endpoint or midpoint therefore cannot
 * mint a local turning lane. A neighbour outside the box can be neither crossed
 * nor lain on, so it neither shapes the route nor invalidates its cache key.
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
  const inside = (x: number, y: number): boolean =>
    x >= left && x <= right && y >= top && y <= bottom
  const clamp = (value: number, low: number, high: number): number =>
    Math.max(low, Math.min(high, value))
  return toSegments(neighborEdges).flatMap((segment) => {
    if (
      !(
        Math.min(segment.x1, segment.x2) <= right &&
        Math.max(segment.x1, segment.x2) >= left &&
        Math.min(segment.y1, segment.y2) <= bottom &&
        Math.max(segment.y1, segment.y2) >= top
      )
    )
      return []

    const startTerminal =
      segment.startTerminal && inside(segment.x1, segment.y1)
    const endTerminal = segment.endTerminal && inside(segment.x2, segment.y2)
    if (segment.y1 === segment.y2)
      return [
        {
          ...segment,
          x1: clamp(segment.x1, left, right),
          x2: clamp(segment.x2, left, right),
          startTerminal,
          endTerminal,
        },
      ]
    if (segment.x1 === segment.x2)
      return [
        {
          ...segment,
          y1: clamp(segment.y1, top, bottom),
          y2: clamp(segment.y2, top, bottom),
          startTerminal,
          endTerminal,
        },
      ]
    // Authored diagonal geometry participates in exact crossing/crowding tests.
    // Keeping the full segment is harmless once off-corridor real endpoints lose
    // their terminal flags: diagonals add no midpoint or escape turning lines.
    return [{ ...segment, startTerminal, endTerminal }]
  })
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

/** Exact intersection of two non-parallel segments known to cross. */
const crossingPoint = (a: Segment, b: Segment): IPoint => {
  const determinantA = a.x1 * a.y2 - a.y1 * a.x2
  const determinantB = b.x1 * b.y2 - b.y1 * b.x2
  const denominator =
    (a.x1 - a.x2) * (b.y1 - b.y2) - (a.y1 - a.y2) * (b.x1 - b.x2)
  return {
    x:
      (determinantA * (b.x1 - b.x2) - (a.x1 - a.x2) * determinantB) /
      denominator,
    y:
      (determinantA * (b.y1 - b.y2) - (a.y1 - a.y2) * determinantB) /
      denominator,
  }
}

/** Squared distance from `p` to the nearest end of segment `s`. Routing
 * decisions compare it with a squared threshold, avoiding the engine-dependent
 * rounding permitted for `Math.hypot`. */
const distanceSquaredToEnds = (p: IPoint, s: Segment): number =>
  Math.min(
    (p.x - s.x1) ** 2 + (p.y - s.y1) ** 2,
    (p.x - s.x2) ** 2 + (p.y - s.y2) ** 2
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
  const clearanceSquared = clearance * clearance
  for (let i = 0; i < n.dx1.length; i++) {
    const ax = n.dx1[i]
    const ay = n.dy1[i]
    const vx = n.dx2[i] - ax
    const vy = n.dy2[i] - ay
    const lengthSquared = vx * vx + vy * vy
    const t = Math.max(
      0,
      Math.min(1, ((x - ax) * vx + (y - ay) * vy) / lengthSquared)
    )
    const dx = x - (ax + t * vx)
    const dy = y - (ay + t * vy)
    if (dx * dx + dy * dy < clearanceSquared) return true
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
  /** Non-orthogonal segments are retained exactly. They shape crossing costs but
   * never mint synthetic Hanan lines or proxy corners. */
  dx1: Float64Array
  dy1: Float64Array
  dx2: Float64Array
  dy2: Float64Array
}

const indexNeighbors = (segments: readonly Segment[]): NeighborIndex => {
  const horizontal = segments.filter((s) => s.y1 === s.y2 && s.x1 !== s.x2)
  const vertical = segments.filter((s) => s.x1 === s.x2 && s.y1 !== s.y2)
  const diagonal = segments.filter((s) => s.x1 !== s.x2 && s.y1 !== s.y2)

  const index: NeighborIndex = {
    hy: new Float64Array(horizontal.length),
    hxLo: new Float64Array(horizontal.length),
    hxHi: new Float64Array(horizontal.length),
    vx: new Float64Array(vertical.length),
    vyLo: new Float64Array(vertical.length),
    vyHi: new Float64Array(vertical.length),
    dx1: new Float64Array(diagonal.length),
    dy1: new Float64Array(diagonal.length),
    dx2: new Float64Array(diagonal.length),
    dy2: new Float64Array(diagonal.length),
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
  diagonal.forEach((s, i) => {
    index.dx1[i] = s.x1
    index.dy1[i] = s.y1
    index.dx2[i] = s.x2
    index.dy2[i] = s.y2
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

  // A non-orthogonal neighbour crosses an H/V candidate step at one exact point.
  // Keep the same half-open convention as the orthogonal index so a crossing on a
  // lattice boundary is charged to the arriving step exactly once. Its real
  // endpoints determine whether the jump arc has room; no staircase projection
  // and no synthetic midpoint corner participates in the decision.
  for (let i = 0; i < n.dx1.length; i++) {
    const dx1 = n.dx1[i]
    const dy1 = n.dy1[i]
    const dx2 = n.dx2[i]
    const dy2 = n.dy2[i]
    const straddles =
      orient(ax, ay, bx, by, dx1, dy1) * orient(ax, ay, bx, by, dx2, dy2) < 0
    if (!straddles) {
      penalty +=
        CROWDING_COST_PER_PX *
        segmentCrowdingPx(
          { x: ax, y: ay },
          { x: bx, y: by },
          { x: dx1, y: dy1 },
          { x: dx2, y: dy2 },
          crowdingClearance
        )
      continue
    }
    const fromSide = orient(dx1, dy1, dx2, dy2, ax, ay)
    const toSide = orient(dx1, dy1, dx2, dy2, bx, by)
    if (!((fromSide < 0 && toSide >= 0) || (fromSide > 0 && toSide <= 0))) {
      penalty +=
        CROWDING_COST_PER_PX *
        segmentCrowdingPx(
          { x: ax, y: ay },
          { x: bx, y: by },
          { x: dx1, y: dy1 },
          { x: dx2, y: dy2 },
          crowdingClearance
        )
      continue
    }

    penalty += EDGE_CROSSING_PENALTY
    const t = horizontal ? (ay - dy1) / (dy2 - dy1) : (ax - dx1) / (dx2 - dx1)
    const crossingX = dx1 + t * (dx2 - dx1)
    const crossingY = dy1 + t * (dy2 - dy1)
    const alongNeighborSquared = Math.min(
      (crossingX - dx1) ** 2 + (crossingY - dy1) ** 2,
      (crossingX - dx2) ** 2 + (crossingY - dy2) ** 2
    )
    if (alongNeighborSquared < CROSSING_CORNER_CLEARANCE_SQUARED)
      penalty += CROSSING_NEAR_CORNER_PENALTY
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
      if (!segmentsCross(seg, n)) {
        if (
          segmentCrowdingPx(
            { x: seg.x1, y: seg.y1 },
            { x: seg.x2, y: seg.y2 },
            { x: n.x1, y: n.y1 },
            { x: n.x2, y: n.y2 },
            crowding
          ) > 0
        )
          return true
        continue
      }
      const at = crossingPoint(seg, n)
      if (
        distanceSquaredToEnds(at, seg) < CROSSING_CORNER_CLEARANCE_SQUARED ||
        distanceSquaredToEnds(at, n) < CROSSING_CORNER_CLEARANCE_SQUARED
      ) {
        return true
      }
    }
  }
  return false
}

/** The along-axis overlap length of two PARALLEL segments (0 if not parallel or no
 * overlap). Used to weigh a collinear/near-parallel conflict by how MUCH they share. */
const parallelOverlapLen = (a: Segment, b: Segment): number => {
  if (a.y1 === a.y2 && b.y1 === b.y2)
    return Math.max(
      0,
      Math.min(Math.max(a.x1, a.x2), Math.max(b.x1, b.x2)) -
        Math.max(Math.min(a.x1, a.x2), Math.min(b.x1, b.x2))
    )
  if (a.x1 === a.x2 && b.x1 === b.x2)
    return Math.max(
      0,
      Math.min(Math.max(a.y1, a.y2), Math.max(b.y1, b.y2)) -
        Math.max(Math.min(a.y1, a.y2), Math.min(b.y1, b.y2))
    )
  return 0
}

/**
 * The CROSS-EDGE cost of a candidate route against already-committed neighbour edges,
 * for the unified anchor cost — integer-exact (the router's `orient` cross-product and
 * interval overlap; no float on the decision path):
 *   - `crossings`: the number of true perpendicular crossings.
 *   - `proximityPx`: total px of run drawn ON or too close to a neighbour, weighted by
 *     closeness (a collinear overlap at gap 0 counts full; it fades to 0 at the crowding
 *     clearance). This is what pushes two edges off a shared stub and prices a smudge.
 * Parallel runs at or beyond the crowding clearance (e.g. nested siblings a lane apart)
 * cost nothing.
 */
export const routeConflictScore = (
  points: readonly IPoint[],
  neighborEdges: readonly IPoint[][]
): { crossings: number; proximityPx: number } => {
  const neighbors = toSegments(neighborEdges)
  let crossings = 0
  let proximityPx = 0
  if (neighbors.length === 0) return { crossings, proximityPx }
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
        if (gap < crowding)
          proximityPx +=
            (parallelOverlapLen(seg, n) * (crowding - gap)) / crowding
      } else if (segmentsCross(seg, n)) crossings++
      else
        proximityPx += segmentCrowdingPx(
          { x: seg.x1, y: seg.y1 },
          { x: seg.x2, y: seg.y2 },
          { x: n.x1, y: n.y1 },
          { x: n.x2, y: n.y2 },
          crowding
        )
    }
  }
  return { crossings, proximityPx: Math.round(proximityPx) }
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
 * A minimal deterministic 4-ary min-heap keyed on a numeric priority. Four
 * children halve the depth of the frontier compared with a binary heap while
 * preserving the exact `(priority, insertion sequence)` total order.
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

  push(priority: number, seq: number, state: number): void {
    if (this.count === this.priorities.length) this.grow()
    let i = this.count++
    // Sift a HOLE upward rather than swapping the new tuple at every level. A
    // swap performs six typed-array writes; copying each parent down performs
    // three, then the new tuple is written once at its final position.
    while (i > 0) {
      const parent = (i - 1) >> 2
      const parentPriority = this.priorities[parent]
      const parentSeq = this.seqs[parent]
      if (
        parentPriority < priority ||
        (parentPriority === priority && parentSeq < seq)
      )
        break
      this.priorities[i] = parentPriority
      this.seqs[i] = parentSeq
      this.states[i] = this.states[parent]
      i = parent
    }
    this.priorities[i] = priority
    this.seqs[i] = seq
    this.states[i] = state
  }

  /** The lowest-priority state, or -1 when empty. */
  pop(): number {
    if (this.count === 0) return -1
    const top = this.states[0]
    this.count--
    if (this.count > 0) {
      const priority = this.priorities[this.count]
      const seq = this.seqs[this.count]
      const state = this.states[this.count]
      let i = 0
      // The symmetric hole sift: promote the smaller child until the saved tail
      // tuple belongs, avoiding a six-write swap at every level.
      for (;;) {
        const first = 4 * i + 1
        if (first >= this.count) break
        let child = first
        const end = Math.min(first + 4, this.count)
        for (let candidate = first + 1; candidate < end; candidate++)
          if (this.less(candidate, child)) child = candidate
        const childPriority = this.priorities[child]
        const childSeq = this.seqs[child]
        if (
          priority < childPriority ||
          (priority === childPriority && seq < childSeq)
        )
          break
        this.priorities[i] = childPriority
        this.seqs[i] = childSeq
        this.states[i] = this.states[child]
        i = child
      }
      this.priorities[i] = priority
      this.seqs[i] = seq
      this.states[i] = state
    }
    return top
  }

  /** Priority of the next state without removing it. */
  peekPriority(): number {
    return this.count === 0 ? Infinity : this.priorities[0]
  }

  get size(): number {
    return this.count
  }
}

/** One candidate endpoint for a search. `cost` is a non-negative terminal cost
 * (for example, off-centre placement) paid exactly once when the candidate is
 * used. Keeping endpoint quality in the same units as path quality lets one A*
 * choose side, port and route together. */
export type RouteEndpointCandidate = {
  point: IPoint
  position: Position
  stubLength: number
  cost?: number
  /** A port too close to a corner must turn at the end of its stub; continuing
   * straight would draw the approach along the node's adjacent side. */
  forceStubTurn?: boolean
}

export type RouteTarget = RouteEndpointCandidate

export type CandidateRouteResult = {
  route: IPoint[]
  sourceIndex: number
  targetIndex: number
  cost: number
}

/**
 * The obstacle-avoiding orthogonal route between the CHEAPEST source/target pair,
 * or `null` when none is reachable. One A* pass jointly picks both endpoint ports
 * and the path between them; the returned indices address the caller's original
 * arrays even though candidates are canonicalised internally for determinism.
 *
 * The endpoints are terminal nodes: the route may leave the source only along its
 * declared side, may enter a target only along that target's declared side, and may
 * never pass *through* a node body. Each candidate's preferred stub and its one-cell
 * tight-layout exit are part of the searched lattice, so A* costs the chosen approach
 * in and a route can never spike out to a target and retrace it; a genuine detour
 * that costs more length beats it.
 *
 * Each candidate's `stubLength` seeds a preferred turning lane. It is not a hard
 * minimum: the graph also includes a one-grid-cell exit for tight layouts.
 */
export const routeAroundObstaclesBetweenCandidates = (
  sources: readonly RouteEndpointCandidate[],
  targets: readonly RouteTarget[],
  obstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][] = [],
  incumbentRoute?: readonly IPoint[],
  endpointRects?: Readonly<{ source: Rect; target: Rect }>
): CandidateRouteResult | null => {
  if (sources.length === 0 || targets.length === 0) return null
  const searchStartedAt =
    import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
      ? performance.now()
      : 0
  let searchLoopStartedAt = 0
  let stepPricings = 0
  let heuristicEvaluations = 0
  let heapPushes = 0
  let boundPrunes = 0
  let searchCellCount = 0
  let usesIncumbentBound = false
  const recordSearch = (expansions: number, abandoned: boolean): void => {
    const elapsed =
      import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
        ? performance.now() - searchStartedAt
        : 0
    const setup =
      searchLoopStartedAt > 0 ? searchLoopStartedAt - searchStartedAt : elapsed
    recordRouterSearch(
      expansions,
      abandoned,
      elapsed,
      setup,
      stepPricings,
      heuristicEvaluations,
      heapPushes,
      usesIncumbentBound,
      boundPrunes,
      searchCellCount
    )
  }
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

  const compareCandidateValues = (
    ac: RouteEndpointCandidate,
    bc: RouteEndpointCandidate
  ): number =>
    ac.point.x - bc.point.x ||
    ac.point.y - bc.point.y ||
    (ac.position < bc.position ? -1 : ac.position > bc.position ? 1 : 0) ||
    ac.stubLength - bc.stubLength ||
    validateEndpointCost(ac.cost) - validateEndpointCost(bc.cost) ||
    Number(ac.forceStubTurn ?? false) - Number(bc.forceStubTurn ?? false)
  const compareCandidates = (
    a: { candidate: RouteEndpointCandidate; inputIndex: number },
    b: { candidate: RouteEndpointCandidate; inputIndex: number }
  ): number => {
    return (
      compareCandidateValues(a.candidate, b.candidate) ||
      a.inputIndex - b.inputIndex
    )
  }
  const canonicalSources = sources
    .map((candidate, inputIndex) => ({ candidate, inputIndex }))
    .sort(compareCandidates)
  const canonicalTargets = targets
    .map((candidate, inputIndex) => ({ candidate, inputIndex }))
    .sort(compareCandidates)

  // Search a fixed-endpoint undirected connection from one canonical geometric
  // end. Without this, equal-cost obstacle detours inherit the frontier's source
  // direction and place their bends near whichever endpoint happened to be stored
  // as `source`. Multi-candidate searches deliberately keep their semantic source:
  // reversing those also reverses candidate tie-breaking and can sacrifice a
  // straight-eligible connection while choosing ports for the whole diagram.
  const compareCollections = (
    a: readonly { candidate: RouteEndpointCandidate }[],
    b: readonly { candidate: RouteEndpointCandidate }[]
  ): number => {
    const length = Math.min(a.length, b.length)
    for (let i = 0; i < length; i++) {
      const compared = compareCandidateValues(a[i].candidate, b[i].candidate)
      if (compared !== 0) return compared
    }
    return a.length - b.length
  }
  if (
    canonicalSources.length === 1 &&
    canonicalTargets.length === 1 &&
    compareCollections(canonicalSources, canonicalTargets) > 0
  ) {
    const reversed = routeAroundObstaclesBetweenCandidates(
      targets,
      sources,
      obstacles,
      neighborEdges,
      incumbentRoute ? [...incumbentRoute].reverse() : undefined,
      endpointRects
        ? { source: endpointRects.target, target: endpointRects.source }
        : undefined
    )
    return reversed
      ? {
          route: [...reversed.route].reverse(),
          sourceIndex: reversed.targetIndex,
          targetIndex: reversed.sourceIndex,
          cost: reversed.cost,
        }
      : null
  }

  const sourceInfos = canonicalSources.map(({ candidate: s, inputIndex }) => {
    const heading = headingOf(s.position)
    return {
      inputIndex,
      point: s.point,
      heading,
      exit: advance(s.point, heading, s.stubLength),
      // A turn lane one grid cell out from the source, guaranteeing somewhere to
      // turn even when the preferred stub overshoots the partner.
      minExit: advance(s.point, heading, grid),
      cost: validateEndpointCost(s.cost),
      forceStubTurn: s.forceStubTurn ?? false,
    }
  })

  // Per-target terminal geometry: the entry heading, the arrival heading (into the
  // body, opposite the entry side), and the stub / min-turn exits that seed room
  // before the final approach — one set per candidate landing point.
  const targetInfos = canonicalTargets.map(({ candidate: t, inputIndex }) => {
    const heading = headingOf(t.position)
    return {
      inputIndex,
      point: t.point,
      requiredArrival: opposite(heading),
      exit: advance(t.point, heading, t.stubLength),
      minExit: advance(t.point, heading, grid),
      cost: validateEndpointCost(t.cost),
      forceStubTurn: t.forceStubTurn ?? false,
    }
  })
  const hard = obstacles.filter((o) => !o.soft)
  const soft = obstacles.filter((o) => o.soft)

  // Proven-optimal straight path. `endpoint costs + Manhattan distance` is a lower
  // bound for every candidate pair because every other routing term is non-negative.
  // If a pair attaining the global bound can travel straight in its declared
  // headings with every additional term exactly zero, no A* route can beat it.
  // This keeps the holistic candidate choice while avoiding a lattice for the most
  // common adjacent-node case.
  let lowerBound = Infinity
  for (const source of sourceInfos)
    for (const target of targetInfos)
      lowerBound = Math.min(
        lowerBound,
        source.cost +
          target.cost +
          Math.abs(source.point.x - target.point.x) +
          Math.abs(source.point.y - target.point.y)
      )

  const straightHeading = (a: IPoint, b: IPoint): Heading | null => {
    if (a.x === b.x) {
      if (a.y === b.y) return null
      return b.y > a.y ? Heading.Down : Heading.Up
    }
    if (a.y === b.y) return b.x > a.x ? Heading.Right : Heading.Left
    return null
  }
  const segmentEnters = (a: IPoint, b: IPoint, rect: ObstacleRect): boolean =>
    Math.min(a.x, b.x) < rect.x + rect.width &&
    Math.max(a.x, b.x) > rect.x &&
    Math.min(a.y, b.y) < rect.y + rect.height &&
    Math.max(a.y, b.y) > rect.y
  const sameRect = (left: ObstacleRect, right: Rect): boolean =>
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  const isEndpointBody = (rect: ObstacleRect): boolean =>
    endpointRects !== undefined &&
    (sameRect(rect, endpointRects.source) ||
      sameRect(rect, endpointRects.target))
  const straightHard = hard.filter((rect) => !isEndpointBody(rect))

  for (let sourceRank = 0; sourceRank < sourceInfos.length; sourceRank++) {
    const source = sourceInfos[sourceRank]
    for (let targetRank = 0; targetRank < targetInfos.length; targetRank++) {
      const target = targetInfos[targetRank]
      const distance =
        Math.abs(source.point.x - target.point.x) +
        Math.abs(source.point.y - target.point.y)
      if (source.cost + target.cost + distance !== lowerBound) continue
      if (source.forceStubTurn || target.forceStubTurn) continue

      const heading = straightHeading(source.point, target.point)
      const coincident = distance === 0
      if (
        coincident
          ? source.heading !== target.requiredArrival
          : heading !== source.heading || heading !== target.requiredArrival
      )
        continue
      if (
        straightHard.some((rect) =>
          segmentEnters(source.point, target.point, rect)
        ) ||
        soft.some((rect) => segmentEnters(source.point, target.point, rect))
      )
        continue

      if (!coincident) {
        const { nearest, achievable } = clearanceAlongside(
          source.point,
          target.point,
          straightHard,
          idealClearance
        )
        if (nearest === 0 || (nearest !== Infinity && nearest < achievable))
          continue
        const conflict = routeConflictScore(
          [source.point, target.point],
          neighborEdges
        )
        if (conflict.crossings > 0 || conflict.proximityPx > 0) continue
      }

      return {
        route: coincident ? [source.point] : [source.point, target.point],
        sourceIndex: source.inputIndex,
        targetIndex: target.inputIndex,
        cost: lowerBound,
      }
    }
  }

  // The heuristic touches target geometry once per expanded STATE. Keep its hot,
  // overwhelmingly common non-forced form in flat arrays: candidate objects and a
  // helper call inside that loop cost more than the few integer operations in the
  // lower bound itself. Deliberately below the straight-route return so a proven
  // optimal direct edge allocates no search tables at all.
  const targetCount = targetInfos.length
  const targetX = new Float64Array(targetCount)
  const targetY = new Float64Array(targetCount)
  const targetArrival = new Uint8Array(targetCount)
  const targetCost = new Float64Array(targetCount)
  let hasForcedTarget = false
  for (let i = 0; i < targetCount; i++) {
    const target = targetInfos[i]
    targetX[i] = target.point.x
    targetY[i] = target.point.y
    targetArrival[i] = target.requiredArrival
    targetCost[i] = target.cost
    hasForcedTarget ||= target.forceStubTurn
  }

  // Only the neighbouring edges this route can reach: an edge outside the box its
  // endpoints and obstacles span can be neither crossed nor lain on, and every
  // lane derived from one costs cells quadratically for nothing. Callers
  // over-supply "nearby" because they cannot know the corridor before it is
  // built; `neighborsWithinReach` is the box, shared with the solver's route key.
  const neighborSegments = neighborsWithinReach(
    sourceInfos[0].point,
    [
      ...sourceInfos.slice(1).map((s) => s.point),
      ...targetInfos.map((t) => t.point),
    ],
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
    ...sourceInfos.flatMap((s) => [s.point.x, s.exit.x]),
    ...targetInfos.flatMap((t) => [t.point.x, t.exit.x]),
    ...obstacles.flatMap((o) => [o.x, o.x + o.width]),
  ]
  const spanYs = [
    ...sourceInfos.flatMap((s) => [s.point.y, s.exit.y]),
    ...targetInfos.flatMap((t) => [t.point.y, t.exit.y]),
    ...obstacles.flatMap((o) => [o.y, o.y + o.height]),
  ]
  const exactXs = [
    ...sourceInfos.flatMap((s) => [s.point.x, s.exit.x, s.minExit.x]),
    ...targetInfos.flatMap((t) => [t.point.x, t.exit.x, t.minExit.x]),
    Math.min(...spanXs) - margin,
    Math.max(...spanXs) + margin,
  ]
  const exactYs = [
    ...sourceInfos.flatMap((s) => [s.point.y, s.exit.y, s.minExit.y]),
    ...targetInfos.flatMap((t) => [t.point.y, t.exit.y, t.minExit.y]),
    Math.min(...spanYs) - margin,
    Math.max(...spanYs) + margin,
  ]
  // Neighbour-edge lanes are bounded per segment — the lattice is quadratic in its
  // lines, so an open-ended fan around every endpoint would freeze dense diagrams:
  //
  //  - ESCAPE lanes, one crowding-clearance either side of the neighbour's line, so
  //    a route that would overlap it has somewhere to step aside. Not the line
  //    itself, and not nearer than the clearance (still priced as a smudge).
  //  - A CROSSING lane at an orthogonal segment's MIDPOINT: furthest from both
  //    ends, the one place a jump arc has room to be drawn. The midpoint is snapped
  //    to the grid and can move half a cell, so a segment needs two clearances PLUS
  //    one cell before that lane is guaranteed clean. Otherwise the midpoint cannot
  //    remove the near-corner price and is not allowed to inflate the lattice.
  //  - END-CLEARANCE lanes just outside real POLYLINE terminals, so paying the
  //    crossing cost is a choice rather than an inevitability. Internal segment
  //    ends are bends backed by another segment, not openings; treating every bend
  //    as a terminal minted most of the dense benchmark's useless lattice. Diagonals
  //    get only true-terminal lanes: exact pricing needs no synthetic midpoint.
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
  const terminalDetourLanes = (
    start: number,
    end: number,
    startTerminal: boolean,
    endTerminal: boolean
  ): number[] => {
    const lanes: number[] = []
    if (startTerminal)
      lanes.push(start < end ? escapeLow(start) : escapeHigh(start))
    if (endTerminal) lanes.push(end < start ? escapeLow(end) : escapeHigh(end))
    return lanes
  }
  const neighborXs = neighborSegments.flatMap((s) => {
    if (s.x1 === s.x2) return [escapeLow(s.x1), escapeHigh(s.x1)]
    if (s.y1 === s.y2) {
      const lanes = [
        ...terminalDetourLanes(
          s.x1,
          s.x2,
          s.startTerminal ?? false,
          s.endTerminal ?? false
        ),
      ]
      if (Math.abs(s.x2 - s.x1) >= 2 * CROSSING_CORNER_CLEARANCE + grid)
        lanes.push((s.x1 + s.x2) / 2)
      return lanes
    }
    return terminalDetourLanes(
      s.x1,
      s.x2,
      s.startTerminal ?? false,
      s.endTerminal ?? false
    )
  })
  const neighborYs = neighborSegments.flatMap((s) => {
    if (s.y1 === s.y2) return [escapeLow(s.y1), escapeHigh(s.y1)]
    if (s.x1 === s.x2) {
      const lanes = [
        ...terminalDetourLanes(
          s.y1,
          s.y2,
          s.startTerminal ?? false,
          s.endTerminal ?? false
        ),
      ]
      if (Math.abs(s.y2 - s.y1) >= 2 * CROSSING_CORNER_CLEARANCE + grid)
        lanes.push((s.y1 + s.y2) / 2)
      return lanes
    }
    return terminalDetourLanes(
      s.y1,
      s.y2,
      s.startTerminal ?? false,
      s.endTerminal ?? false
    )
  })
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
        // Narrow channels need a midpoint for clearance; moderately wide channels
        // need it as a visual tie-break between equally clear wall-offset lanes.
        // Keep the bound finite so distant obstacle pairs do not mint quadratic
        // numbers of irrelevant lattice lines.
        if (gap <= 0 || gap >= 4 * idealClearance) continue

        // They must face each other: nodes side by side in x form a channel only
        // where they also overlap in y.
        const aLo = axis === "x" ? a.y : a.x
        const aHi = axis === "x" ? a.y + a.height : a.x + a.width
        const bLo = axis === "x" ? b.y : b.x
        const bHi = axis === "x" ? b.y + b.height : b.x + b.width
        // Touching spans still form one continuous wall for a route travelling
        // past the join: below the join one body is nearest, above it the other
        // is. Include that equality case so a 20px gap receives its 10px medial
        // lane instead of forcing the route 5px from one of the two bodies.
        if (Math.min(aHi, bHi) < Math.max(aLo, bLo)) continue

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
  const cellCount = xs.length * ys.length
  searchCellCount = cellCount
  // Decline before allocating or filling any cell/state-sized tables.
  if (cellCount > MAX_CELLS) {
    recordSearch(0, true)
    return null
  }
  const stateCount = cellCount * 4
  const stateId = (xi: number, yi: number, h: Heading): number =>
    (xi * stride + yi) * 4 + h

  // Targets are keyed by the complete dense arrival STATE, not only their cell:
  // two candidates may share a corner point but require different headings. Flat
  // arrays make the millions of target/source membership checks below direct
  // indexed reads rather than Map/Set hashing.
  const targetInputByState = new Int32Array(stateCount).fill(-1)
  const targetCanonicalByState = new Int32Array(stateCount).fill(-1)
  const targetCostByState = new Float64Array(stateCount)
  const targetForceTurnByState = new Uint8Array(stateCount)
  const targetCellMask = new Uint8Array(cellCount)
  const sourceCellMask = new Uint8Array(cellCount)
  sourceInfos.forEach((source) => {
    const xi = xIndex.get(source.point.x)
    const yi = yIndex.get(source.point.y)
    if (xi !== undefined && yi !== undefined)
      sourceCellMask[xi * stride + yi] = 1
  })
  targetInfos.forEach((t, canonicalIndex) => {
    const cell = xIndex.get(t.point.x)! * stride + yIndex.get(t.point.y)!
    const state = cell * 4 + t.requiredArrival
    const existing = targetInputByState[state]
    if (
      existing === -1 ||
      t.cost < targetCostByState[state] ||
      (t.cost === targetCostByState[state] &&
        targetForceTurnByState[state] === 1 &&
        !t.forceStubTurn)
    ) {
      targetInputByState[state] = t.inputIndex
      targetCanonicalByState[state] = canonicalIndex
      targetCostByState[state] = t.cost
      targetForceTurnByState[state] = t.forceStubTurn ? 1 : 0
    }
    targetCellMask[cell] = 1
  })

  // Admissible AND consistent: this is the exact cost in a relaxation with no
  // obstacles or edge penalties and with zero-length heading changes allowed.
  // Manhattan covers unavoidable travel; the heading table covers unavoidable
  // bends needed to visit the displacement directions and finish on the target's
  // arrival heading. Taking the minimum over terminal states preserves the
  // triangle inequality. This is materially tighter than Manhattan alone on a
  // candidate lattice, where almost every target requires at least one bend.
  // Cache it per STATE: evaluating every target on every relaxation was
  // O(expansions × candidates).
  const relaxedCostTo = (
    x: number,
    y: number,
    heading: Heading,
    point: IPoint,
    arrival: Heading
  ): number => {
    const dx = point.x - x
    const dy = point.y - y
    let requiredDirections = 0
    if (dx > 0) requiredDirections |= 1 << Heading.Right
    else if (dx < 0) requiredDirections |= 1 << Heading.Left
    if (dy > 0) requiredDirections |= 1 << Heading.Down
    else if (dy < 0) requiredDirections |= 1 << Heading.Up

    const bends =
      MIN_BENDS_BY_HEADINGS_AND_DIRECTIONS[
        (heading * 4 + arrival) * 16 + requiredDirections
      ]
    return Math.abs(dx) + Math.abs(dy) + bends * bendPenalty
  }
  // Most lattice cells are never expanded. Cache the exact obstacle-free heading
  // relaxation per state; it is substantially cheaper than rescanning bodies and
  // neighbouring edges for every state/target. Those scans reduced expansion
  // counts but took more wall time than the states they avoided.
  const heuristicByState = new Float64Array(cellCount * 4).fill(NaN)
  const heuristicTargetRankByState = new Uint16Array(cellCount * 4)
  const heuristic = (xi: number, yi: number, heading: Heading): number => {
    const state = stateId(xi, yi, heading)
    const cached = heuristicByState[state]
    if (!Number.isNaN(cached)) return cached

    heuristicEvaluations++
    let best = Infinity
    let bestTargetRank = 0
    if (!hasForcedTarget) {
      const x = xs[xi]
      const y = ys[yi]
      for (let targetRank = 0; targetRank < targetCount; targetRank++) {
        const dx = targetX[targetRank] - x
        const dy = targetY[targetRank] - y
        let requiredDirections = 0
        if (dx > 0) requiredDirections |= 1 << Heading.Right
        else if (dx < 0) requiredDirections |= 1 << Heading.Left
        if (dy > 0) requiredDirections |= 1 << Heading.Down
        else if (dy < 0) requiredDirections |= 1 << Heading.Up
        const bends =
          MIN_BENDS_BY_HEADINGS_AND_DIRECTIONS[
            (heading * 4 + targetArrival[targetRank]) * 16 + requiredDirections
          ]
        const cost =
          Math.abs(dx) +
          Math.abs(dy) +
          bends * bendPenalty +
          targetCost[targetRank]
        if (cost < best) {
          best = cost
          bestTargetRank = targetRank
        }
      }
      heuristicByState[state] = best
      heuristicTargetRankByState[state] = bestTargetRank
      return best
    }
    for (let targetRank = 0; targetRank < targetInfos.length; targetRank++) {
      const target = targetInfos[targetRank]
      let pathCost: number
      if (
        target.forceStubTurn &&
        !(
          xs[xi] === target.point.x &&
          ys[yi] === target.point.y &&
          heading === target.requiredArrival
        )
      ) {
        pathCost = Infinity
        for (let arrival = Heading.Up; arrival <= Heading.Left; arrival++) {
          if (arrival === target.requiredArrival) continue
          pathCost = Math.min(
            pathCost,
            relaxedCostTo(xs[xi], ys[yi], heading, target.exit, arrival) +
              bendPenalty +
              Math.abs(target.exit.x - target.point.x) +
              Math.abs(target.exit.y - target.point.y)
          )
        }
      } else {
        pathCost = relaxedCostTo(
          xs[xi],
          ys[yi],
          heading,
          target.point,
          target.requiredArrival
        )
      }

      const cost = pathCost + target.cost
      if (cost < best) {
        best = cost
        bestTargetRank = targetRank
      }
    }
    heuristicByState[state] = best
    heuristicTargetRankByState[state] = bestTargetRank
    return best
  }

  // The price of one step, computed ONCE per (cell, direction) and memoized. A
  // step's cost depends only on the two points it joins, never on how the search
  // arrived; but the search reaches a cell in up to four states and revisits cells
  // as it relaxes them, so on-the-fly pricing re-runs the same obstacle scan — the
  // dominant cost of the search. Priced once into a flat array, it is a lookup.
  // (BLOCKED is a sentinel rather than a separate array: hard obstacles are the
  // common rejection, and one branch on a number beats a second lookup.)
  const BLOCKED = -1
  const UNPRICED = -2
  // Indexed by (cell * 4 + heading): the step LEAVING that cell in that heading.
  // Direction matters — a crossing is charged to the arriving step, so the two
  // directions across one crossing are not priced alike.
  const stepCost = new Float64Array(cellCount * 4).fill(UNPRICED)
  // Blocking, body clearance and container traversal are symmetric: the same
  // lattice segment has the same cost left→right as right→left. Cache that base
  // once per undirected horizontal/vertical adjacency. `stepCost` above remains
  // directional because a crossing is deliberately charged only to the step
  // ARRIVING at it.
  const symmetricStepCost = new Float64Array(cellCount * 2).fill(UNPRICED)

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
    stepPricings++

    const ax = xs[xi]
    const ay = ys[yi]
    const bx = xs[nxi]
    const by = ys[nyi]

    const horizontal = ay === by
    const left = ax < bx ? ax : bx
    const right = ax < bx ? bx : ax
    const top = ay < by ? ay : by
    const bottom = ay < by ? by : ay

    const baseCell = horizontal
      ? Math.min(xi, nxi) * stride + yi
      : xi * stride + Math.min(yi, nyi)
    const baseSlot = baseCell * 2 + (horizontal ? 0 : 1)
    let baseCost = symmetricStepCost[baseSlot]

    // One pass over the bodies answers both questions: does this step go THROUGH a
    // body (forbidden), and how much room does it leave on EITHER SIDE. Both sides
    // matter: the nearest body alone cannot tell "close to something" from "should
    // have been elsewhere" — two classes 15px apart leave a band an edge must run
    // 7px from each side of, with nowhere better to be. So the ideal is what the
    // CHANNEL allows (its middle, or the full clearance, whichever is less): room
    // you never had is free. The same term also balances the route.
    if (baseCost === UNPRICED) {
      let nearestLo = Infinity
      let nearestHi = Infinity
      let touchesBodyBoundary = false
      for (let i = 0; i < bodyCount; i++) {
        // Hard obstacles here are exclusively THIRD-PARTY bodies: endpoint bodies
        // were removed by the caller, and containers are soft. Their interior is
        // solid. Boundary-only contact stays technically routable for degenerate
        // tight layouts, but is remembered and charged below: a zero-length touch at
        // a corner otherwise escapes both this strict test and the alongside price.
        if (
          left < bodyX2[i] &&
          right > bodyX1[i] &&
          top < bodyY2[i] &&
          bottom > bodyY1[i]
        ) {
          symmetricStepCost[baseSlot] = BLOCKED
          stepCost[slot] = BLOCKED
          return BLOCKED
        }
        const boundaryOverlap = horizontal
          ? Math.min(right, bodyX2[i]) - Math.max(left, bodyX1[i])
          : Math.min(bottom, bodyY2[i]) - Math.max(top, bodyY1[i])
        const crossesOtherAxis = horizontal
          ? ay >= bodyY1[i] && ay <= bodyY2[i]
          : ax >= bodyX1[i] && ax <= bodyX2[i]
        if (boundaryOverlap === 0 && crossesOtherAxis)
          touchesBodyBoundary = true

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
        const deficitCells = Math.max(
          0,
          Math.ceil((achievable - nearest) / grid)
        )
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

        // Once both walls are at least the ideal clearance away, the main objective
        // intentionally ties. Resolve only that plateau toward the channel's medial
        // axis. The epsilon is too small to buy a pixel or a bend; it merely replaces
        // insertion-order bias with a geometric, reflection-symmetric preference.
        if (
          nearestLo !== Infinity &&
          nearestHi !== Infinity &&
          nearestLo + nearestHi < 4 * idealClearance
        ) {
          const imbalance =
            Math.abs(nearestLo - nearestHi) / (nearestLo + nearestHi)
          proximity += CHANNEL_IMBALANCE_TIE_BREAK_PER_PX * imbalance * length
        }
      }

      baseCost =
        length +
        softCost +
        proximity +
        (touchesBodyBoundary ? HUGGING_COST_PER_PX * length : 0)
      symmetricStepCost[baseSlot] = baseCost
    }

    if (baseCost === BLOCKED) {
      stepCost[slot] = BLOCKED
      return BLOCKED
    }
    const cost =
      baseCost + edgePenaltyAt(ax, ay, bx, by, neighborIndex, crowdingClearance)

    stepCost[slot] = cost
    return cost
  }

  /**
   * Re-price the last proven route on the CURRENT graph. This is an incremental
   * shortest-path repair bound, not a history-dependent preference: every step,
   * bend, endpoint and terminal rule is evaluated again against the new obstacle
   * and neighbour field. A valid result can only remove states whose admissible
   * lower bound is already strictly worse than a feasible current route; the
   * equality plateau remains untouched, so canonical cold-search tie-breaking is
   * preserved byte-for-byte.
   */
  const incumbentUpperBound = (() => {
    if (!incumbentRoute || incumbentRoute.length === 0) return Infinity
    const route = incumbentRoute.filter(
      (point, index) =>
        index === 0 ||
        point.x !== incumbentRoute[index - 1].x ||
        point.y !== incumbentRoute[index - 1].y
    )
    if (route.length === 0) return Infinity

    const headingBetween = (a: IPoint, b: IPoint): Heading | null => {
      if (a.x === b.x)
        return a.y < b.y ? Heading.Down : a.y > b.y ? Heading.Up : null
      if (a.y === b.y) return a.x < b.x ? Heading.Right : Heading.Left
      return null
    }
    const samePoint = (a: IPoint, b: IPoint): boolean =>
      a.x === b.x && a.y === b.y
    const firstHeading =
      route.length > 1 ? headingBetween(route[0], route[1]) : null
    const lastHeading =
      route.length > 1
        ? headingBetween(route[route.length - 2], route[route.length - 1])
        : null
    let best = Infinity

    for (const source of sourceInfos) {
      if (!samePoint(route[0], source.point)) continue
      if (firstHeading !== null && firstHeading !== source.heading) continue
      if (
        source.forceStubTurn &&
        (route.length < 3 || !samePoint(route[1], source.exit))
      )
        continue

      for (const target of targetInfos) {
        if (!samePoint(route[route.length - 1], target.point)) continue
        if (route.length === 1) {
          if (source.heading !== target.requiredArrival) continue
          best = Math.min(best, source.cost + target.cost)
          continue
        }
        if (lastHeading !== target.requiredArrival) continue
        if (
          target.forceStubTurn &&
          (route.length < 3 || !samePoint(route[route.length - 2], target.exit))
        )
          continue

        let total = source.cost
        let priorHeading: Heading | null = null
        let valid = true
        for (
          let segmentIndex = 0;
          segmentIndex < route.length - 1;
          segmentIndex++
        ) {
          const from = route[segmentIndex]
          const to = route[segmentIndex + 1]
          const heading = headingBetween(from, to)
          const fromXi = xIndex.get(from.x)
          const fromYi = yIndex.get(from.y)
          const toXi = xIndex.get(to.x)
          const toYi = yIndex.get(to.y)
          if (
            heading === null ||
            fromXi === undefined ||
            fromYi === undefined ||
            toXi === undefined ||
            toYi === undefined ||
            (priorHeading !== null && heading === opposite(priorHeading))
          ) {
            valid = false
            break
          }

          if (priorHeading !== null && heading !== priorHeading) {
            total += bendPenalty
            const cornerCell = fromXi * stride + fromYi
            let crowded = cornerCrowding[cornerCell]
            if (crowded === UNKNOWN_CORNER) {
              crowded = cornerCrowded(
                from.x,
                from.y,
                neighborIndex,
                CROSSING_CORNER_CLEARANCE
              )
                ? 1
                : 0
              cornerCrowding[cornerCell] = crowded
            }
            if (crowded === 1) total += CROSSING_NEAR_CORNER_PENALTY
          }

          let xi = fromXi
          let yi = fromYi
          while (xi !== toXi || yi !== toYi) {
            const nxi =
              heading === Heading.Left
                ? xi - 1
                : heading === Heading.Right
                  ? xi + 1
                  : xi
            const nyi =
              heading === Heading.Up
                ? yi - 1
                : heading === Heading.Down
                  ? yi + 1
                  : yi
            if (nxi < 0 || nxi >= xs.length || nyi < 0 || nyi >= ys.length) {
              valid = false
              break
            }
            const step = priceStep(xi, yi, nxi, nyi, heading)
            if (step === BLOCKED) {
              valid = false
              break
            }
            total += step
            xi = nxi
            yi = nyi

            const atRouteEnd =
              segmentIndex === route.length - 2 && xi === toXi && yi === toYi
            const cell = xi * stride + yi
            if (
              sourceCellMask[cell] === 1 ||
              (targetCellMask[cell] === 1 &&
                (!atRouteEnd ||
                  stateId(xi, yi, heading) !==
                    stateId(toXi, toYi, target.requiredArrival)))
            ) {
              valid = false
              break
            }
          }
          if (!valid) break
          priorHeading = heading
        }
        if (valid) best = Math.min(best, total + target.cost)
      }
    }
    return best
  })()
  usesIncumbentBound = incumbentUpperBound !== Infinity

  // g-scores and the came-from chain, as flat arrays indexed by state rather than
  // Maps: the state id is already a dense integer, so an array IS the hash, sparing
  // a per-neighbour hash lookup. `NaN` reads as "unvisited" — every real g-score is
  // finite and any comparison against NaN is false, so the same test that relaxes
  // an edge rejects an unvisited one with no extra branch.
  const gScore = new Float64Array(stateCount).fill(NaN)
  const cameFrom = new Int32Array(stateCount).fill(-1)
  const sourceOf = new Int32Array(stateCount).fill(-1)
  const sourceRankOf = new Int32Array(stateCount).fill(-1)
  const closed = new Uint8Array(stateCount)
  const frontier = new MinHeap(Math.min(stateCount, 1024))
  let seq = 0

  // Seed one start state per source candidate. The state's initial heading makes
  // its first segment leave along the declared node side. Candidate cost is paid
  // here exactly once. Identical states keep the cheaper candidate, then the
  // earlier index as the deterministic tie-break.
  const sourceStateMask = new Uint8Array(stateCount)
  sourceInfos.forEach((source, canonicalIndex) => {
    const xi = xIndex.get(source.point.x)!
    const yi = yIndex.get(source.point.y)!
    const cell = xi * stride + yi
    const state = stateId(xi, yi, source.heading)
    sourceCellMask[cell] = 1
    sourceStateMask[state] = 1
    const known = gScore[state]
    if (!Number.isNaN(known) && known <= source.cost) return
    gScore[state] = source.cost
    sourceOf[state] = source.inputIndex
    sourceRankOf[state] = canonicalIndex

    // A source state has exactly one legal first direction. Look through that
    // mandatory step when ordering the frontier: the generic relaxed heuristic
    // permits an immediate bend, which is deliberately illegal at a node port and
    // makes outward-facing candidates look much cheaper than they can be. This is
    // still an admissible/consistent lower bound because the real first step costs
    // at least its priced lattice edge, followed by the ordinary state heuristic.
    let sourceHeuristic = heuristic(xi, yi, source.heading)
    if (targetInputByState[state] === -1) {
      const nxi =
        source.heading === Heading.Left
          ? xi - 1
          : source.heading === Heading.Right
            ? xi + 1
            : xi
      const nyi =
        source.heading === Heading.Up
          ? yi - 1
          : source.heading === Heading.Down
            ? yi + 1
            : yi
      if (nxi < 0 || nxi >= xs.length || nyi < 0 || nyi >= ys.length) return
      const firstStep = priceStep(xi, yi, nxi, nyi, source.heading)
      if (firstStep === BLOCKED) return
      sourceHeuristic = firstStep + heuristic(nxi, nyi, source.heading)
    }
    const priority = source.cost + sourceHeuristic
    if (priority > incumbentUpperBound) {
      boundPrunes++
      return
    }
    frontier.push(priority, seq++, state)
    heapPushes++
  })

  const unpack = (state: number): { xi: number; yi: number; h: Heading } => {
    const h = (state & 3) as Heading
    const cell = (state - h) / 4
    return { xi: Math.floor(cell / stride), yi: cell % stride, h }
  }

  let expansions = 0
  let bestGoal: {
    state: number
    total: number
    sourceRank: number
    targetInputIndex: number
    targetCanonicalIndex: number
  } | null = null
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
    searchLoopStartedAt = performance.now()

  // Once the canonical-first source/target pair has reached the best numeric cost,
  // no equal-cost frontier state can improve its deterministic tie-break. Otherwise
  // retain the equality plateau until a lower-ranked endpoint pair is ruled out.
  while (
    frontier.size > 0 &&
    frontier.peekPriority() <= incumbentUpperBound &&
    (!bestGoal ||
      frontier.peekPriority() < bestGoal.total ||
      (frontier.peekPriority() === bestGoal.total &&
        (bestGoal.sourceRank > 0 || bestGoal.targetCanonicalIndex > 0)))
  ) {
    const current = frontier.pop()
    // A state improved after queueing is in the heap more than once (no decrease-key
    // — re-pushing and ignoring the stale copy is simpler and faster). Skipping a
    // closed state outright is sound because the heuristic is CONSISTENT, not just
    // admissible: h is Manhattan distance and every step costs at least the distance
    // it covers, so A* pops each state already holding its final g and never
    // improves it afterwards. The relaxed bend term in h is safe because it is a
    // shortest-path cost in a graph that merely removes constraints; arbitrary
    // obstacle/hug/crossing penalties would not have that guarantee.
    if (closed[current]) continue

    // Unpacked inline, not via a helper returning an object: this runs millions of
    // times per drag, and a per-expansion object is GC pressure.
    const h = (current & 3) as Heading
    const cell = (current - h) / 4
    const xi = (cell / stride) | 0
    const yi = cell - xi * stride

    // On the equality plateau, attaining this lower bound is the only way the
    // state can tie the incumbent. Its source provenance is already final, and the
    // cached heuristic records the canonical-first target attaining that bound. If
    // neither endpoint rank can improve the incumbent's deterministic tie-break,
    // expanding the state cannot change the result. This is lexicographic pruning,
    // not weighted A*: every numerically cheaper state is still explored.
    if (bestGoal && gScore[current] + heuristic(xi, yi, h) === bestGoal.total) {
      const sourceRank = sourceRankOf[current]
      const targetRank = heuristicTargetRankByState[current]
      if (
        sourceRank > bestGoal.sourceRank ||
        (sourceRank === bestGoal.sourceRank &&
          targetRank >= bestGoal.targetCanonicalIndex)
      )
        continue
    }

    closed[current] = 1

    // Counted here, not at the pop: a stale pop is a heap operation, not a search
    // step, and every state closes at most once — so this measures real work and
    // bounds the loop by the state space.
    if (++expansions > MAX_EXPANSIONS) {
      recordSearch(expansions, true)
      return null
    }

    const targetInputIndex = targetInputByState[current]
    if (targetInputIndex !== -1) {
      // Target placement is paid here, including the coincident source/target
      // case. Continue through every frontier state whose lower bound can tie or
      // beat this result because the heuristic deliberately omits terminal cost.
      const total = gScore[current] + targetCostByState[current]
      const sourceRank = sourceRankOf[current]
      const targetCanonicalIndex = targetCanonicalByState[current]
      if (
        !bestGoal ||
        total < bestGoal.total ||
        (total === bestGoal.total &&
          (sourceRank < bestGoal.sourceRank ||
            (sourceRank === bestGoal.sourceRank &&
              targetCanonicalIndex < bestGoal.targetCanonicalIndex)))
      ) {
        bestGoal = {
          state: current,
          total,
          sourceRank,
          targetInputIndex,
          targetCanonicalIndex,
        }
      }
      continue
    }

    const g = gScore[current]
    // Leaving the source, only the declared side is legal; everywhere else all four
    // directions are open. Iterated rather than collected into an array to save an
    // allocation per expansion.
    const leavingSource =
      sourceStateMask[current] === 1 && cameFrom[current] === -1
    const rootSource = sourceInfos[sourceRankOf[current]]
    const rootForcesStubTurn = rootSource?.forceStubTurn ?? false
    const atSourceStubExit =
      rootForcesStubTurn &&
      xs[xi] === rootSource.exit.x &&
      ys[yi] === rootSource.exit.y

    const directionCount = leavingSource ? 1 : 3
    const directionOffset = h * 3
    for (
      let directionIndex = 0;
      directionIndex < directionCount;
      directionIndex++
    ) {
      // Leaving a source has exactly its declared direction. Elsewhere the table
      // contains the same ascending headings as the old loop, minus the immediate
      // reverse (an always-costlier invisible out-and-back spike).
      const nh = (
        leavingSource ? h : NEXT_HEADINGS[directionOffset + directionIndex]
      ) as Heading

      const nxi =
        nh === Heading.Left ? xi - 1 : nh === Heading.Right ? xi + 1 : xi
      const nyi = nh === Heading.Up ? yi - 1 : nh === Heading.Down ? yi + 1 : yi
      if (nxi < 0 || nxi >= xs.length || nyi < 0 || nyi >= ys.length) continue

      // Endpoints are terminal: never route back into the source, and enter the
      // target only along its declared side. This forbids tunnelling through the
      // route's own node bodies.
      const nextCell = nxi * stride + nyi
      if (sourceCellMask[nextCell] === 1) continue
      const neighbourState = stateId(nxi, nyi, nh)
      // A consistent heuristic makes a closed state's g-score and canonical source
      // final. In particular, do not let a later equal-cost source rewrite its
      // predecessor: that can point two settled states at each other and make route
      // reconstruction cycle even though the numeric optimum is unchanged.
      if (closed[neighbourState]) continue
      const targetHere = targetInputByState[neighbourState]
      if (targetCellMask[nextCell] === 1 && targetHere === -1) continue
      if (targetForceTurnByState[neighbourState] === 1) {
        const targetInfo = targetInfos[targetCanonicalByState[neighbourState]]
        const atStubExit =
          xs[xi] === targetInfo.exit.x && ys[yi] === targetInfo.exit.y
        // The final stub begins at its seeded exit and must be preceded by a
        // corner, otherwise the approach continues along the adjacent node side.
        if (!atStubExit || nh === h) continue
      }

      if (atSourceStubExit && nh === h) continue

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

      const known = gScore[neighbourState]
      const unvisited = Number.isNaN(known)
      const improvesCanonicalSource =
        !unvisited &&
        tentative === known &&
        sourceRankOf[current] < sourceRankOf[neighbourState]
      if (!unvisited && tentative > known) continue
      if (!unvisited && tentative === known && !improvesCanonicalSource)
        continue

      const priority = tentative + heuristic(nxi, nyi, nh)
      if (priority > incumbentUpperBound) {
        boundPrunes++
        continue
      }
      gScore[neighbourState] = tentative
      cameFrom[neighbourState] = current
      sourceOf[neighbourState] = sourceOf[current]
      sourceRankOf[neighbourState] = sourceRankOf[current]
      frontier.push(priority, seq++, neighbourState)
      heapPushes++
    }
  }

  if (bestGoal) {
    const raw: IPoint[] = []
    let state = bestGoal.state
    let remaining = stateCount
    while (state !== -1) {
      // A predecessor chain in a finite state graph cannot contain more states
      // than the graph. Keep this hard stop even though closed-state settlement
      // prevents cycles: corrupt provenance must degrade to the caller's fallback,
      // never grow an array until the product crashes.
      if (remaining-- === 0) {
        recordSearch(expansions, true)
        return null
      }
      const p = unpack(state)
      raw.push(nodeAt(p.xi, p.yi))
      state = cameFrom[state]
    }
    raw.reverse()
    recordSearch(expansions, false)
    return {
      route: simplifyCollinear(raw),
      sourceIndex: sourceOf[bestGoal.state],
      targetIndex: bestGoal.targetInputIndex,
      cost: bestGoal.total,
    }
  }

  // A successfully re-priced incumbent is represented by this graph, so A* must
  // reach a goal no dearer than its bound. If an unforeseen terminal-topology
  // interaction violates that assumption, discard the optimisation and repeat
  // cold rather than returning a degraded fallback.
  if (incumbentUpperBound !== Infinity)
    return routeAroundObstaclesBetweenCandidates(
      sources,
      targets,
      obstacles,
      neighborEdges
    )

  // Walled off by hard obstacles: no route exists.
  recordSearch(expansions, false)
  return null
}

/** Backwards-compatible one-source form. New endpoint-selection code should use
 * {@link routeAroundObstaclesBetweenCandidates} so both ends remain variable. */
export const routeAroundObstaclesToTargets = (
  sourcePoint: IPoint,
  sourcePosition: Position,
  sourceStubLength: number,
  targets: readonly RouteTarget[],
  obstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][] = []
): { route: IPoint[]; targetIndex: number } | null => {
  const result = routeAroundObstaclesBetweenCandidates(
    [
      {
        point: sourcePoint,
        position: sourcePosition,
        stubLength: sourceStubLength,
      },
    ],
    targets,
    obstacles,
    neighborEdges
  )
  return result
    ? { route: result.route, targetIndex: result.targetIndex }
    : null
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
