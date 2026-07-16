import { Position, type Rect } from "@xyflow/react"
import { CANVAS, EDGES } from "@/constants"
import type { IPoint } from "@/edges/Connection"
import { getConnectionMode, getEdgeAnchorPoint } from "@/utils/connectionModes"
import { type FreeformEdgeAnchor } from "@/utils/edgeUtils"
import { routeStepEdge } from "@/utils/geometry/edgeRoute"
import type { ObstacleRect } from "@/utils/geometry/obstacles"
import type { ResolvedEdgeEndpoints } from "@/utils/geometry/edgeGeometrySolver"

/**
 * Endpoint-anchor selection: instead of pinning an edge to whatever side React
 * Flow's centre-to-centre guess lands on, pick the SIDE and the OFFSET along it
 * that route to the fewest bends around the same obstacles the router already
 * avoids. A user-dragged (custom) anchor is authoritative and never re-chosen;
 * only free ends are optimised.
 *
 * The choice is MEMORYLESS — a pure function of the current geometry — on
 * purpose. A remembered "last frame's side" would make the same diagram render
 * differently on two Yjs peers (each with its own drag history) and after a
 * reload; auto anchors are derived every solve and never persisted, so they must
 * stay a function of the shared model alone. Determinism instead comes from
 * grid-quantised candidates and a strict integer/enum tie-break: at a given
 * geometry the winner is always the same, so a continuous drag crosses each
 * cost boundary once and cannot chatter.
 */

/** Order sides deterministically for the final tie-break: an integer, never a
 * float, so two candidates can never be left equal. */
const SIDE_ORDER: Record<Position, number> = {
  [Position.Top]: 0,
  [Position.Right]: 1,
  [Position.Bottom]: 2,
  [Position.Left]: 3,
}

const GRID = CANVAS.SNAP_TO_GRID_PX
/** Anchor SELECTION scores the IDEAL geometry between the two nodes — obstacle-
 * and neighbour-free — so the pick reflects the clean shape an edge WANTS, not a
 * detour the router will add around whatever happens to be in the way. Those live
 * only in the final commit route. (Also: with no obstacles the step router never
 * searches, so scoring every candidate this way is free.) */
const NO_OBSTACLES: readonly ObstacleRect[] = []
const NO_NEIGHBORS: readonly IPoint[][] = []

/** What one bend (step) costs, in the same grid units as the off-centre and
 * length terms it is weighed against. Anchors are chosen to MINIMISE
 * `bends·BEND_COST_GU + offCentre + length`, so a straight edge is preferred
 * whenever going straight does not push its anchors more than ~this far off the
 * side's centre — "straight where possible, unless the off-centre cost outweighs
 * it". Tuned so an edge straightens onto a moderately offset partner but bends
 * back to a centred anchor rather than crawl into a corner. */
const BEND_COST_GU = 12
/** What one grid cell of "hug" — an ideal-route point run inside the endpoint
 * clearance — costs. Far above a bend so avoiding a graze always wins over saving
 * a corner; a hug is a defect, not a trade-off. */
const HUG_COST_GU = 50
/** Parallel edges between the same node pair fan out along the side by this much
 * per lane, so an optimiser that would otherwise hand them all the same best
 * anchor spreads them into visibly separate lines. */
const SIBLING_SPREAD_PX = 3 * GRID

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v))

const centerOf = (r: Rect): IPoint => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
})

const isVerticalSide = (side: Position): boolean =>
  side === Position.Left || side === Position.Right

const OPPOSITE_SIDE: Record<Position, Position> = {
  [Position.Top]: Position.Bottom,
  [Position.Bottom]: Position.Top,
  [Position.Left]: Position.Right,
  [Position.Right]: Position.Left,
}

/** The side of `rect` that faces `toward` — the one a bend-free run would leave
 * from. Whichever axis the partner is more strongly displaced along wins. */
const facingSide = (rect: Rect, toward: IPoint): Position => {
  const c = centerOf(rect)
  const dx = toward.x - c.x
  const dy = toward.y - c.y
  return Math.abs(dx) / (rect.width / 2 || 1) >=
    Math.abs(dy) / (rect.height / 2 || 1)
    ? dx >= 0
      ? Position.Right
      : Position.Left
    : dy >= 0
      ? Position.Bottom
      : Position.Top
}

/** One concrete anchor choice: the stored `{side, ratio}`, its shape-projected
 * pixel, and the side the router must exit/enter along. */
type AnchorChoice = {
  anchor: FreeformEdgeAnchor
  point: IPoint
  position: Position
}

/**
 * The ≤3 sides worth trying for one endpoint: the side facing the partner plus
 * the two perpendicular sides. The side pointing directly AWAY from the partner
 * is dropped — it can only ever add a U-turn's worth of bends.
 */
const candidateSides = (rect: Rect, toward: IPoint): Position[] => {
  const primary = facingSide(rect, toward)
  const perpendicular = isVerticalSide(primary)
    ? [Position.Top, Position.Bottom]
    : [Position.Left, Position.Right]
  return [primary, ...perpendicular]
}

/**
 * Where along a side to place the anchor: aligned with the partner's centre so
 * the connecting run is straight (or a single clean bend), nudged by the sibling
 * lane offset, kept clear of the corners, and snapped to the grid so a sub-grid
 * node move cannot shift it (stability).
 */
const alignedRatio = (
  side: Position,
  rect: Rect,
  toward: IPoint,
  laneOffsetPx: number
): number => {
  const axisLength = isVerticalSide(side) ? rect.height : rect.width
  if (axisLength <= 0) return 0.5
  const along = isVerticalSide(side) ? toward.y - rect.y : toward.x - rect.x
  // Stay at least this far from either corner — a corner anchor forces the first
  // segment to graze the node it just left.
  const margin = Math.min(2 * GRID, axisLength * 0.3)
  let offset = clamp(along + laneOffsetPx, margin, axisLength - margin)
  offset = Math.round(offset / GRID) * GRID
  offset = clamp(offset, margin, axisLength - margin)
  return offset / axisLength
}

/** The signed lane displacement for one edge within its parallel set, centred so
 * the fan is symmetric about the aligned anchor. Zero for a lone edge. */
const laneOffsetPx = (laneIndex: number, laneCount: number): number =>
  laneCount <= 1 ? 0 : (laneIndex - (laneCount - 1) / 2) * SIBLING_SPREAD_PX

const toAnchorChoice = (
  nodeType: string | undefined,
  rect: Rect,
  anchor: FreeformEdgeAnchor
): AnchorChoice => {
  const { point, position } = getEdgeAnchorPoint(nodeType, rect, anchor)
  return { anchor, point, position }
}

/** The auto candidates for a free endpoint (a single fixed choice for a custom
 * one), deduplicated on the rounded `{side, ratio}`. */
const generateCandidates = (
  nodeType: string | undefined,
  rect: Rect,
  toward: IPoint,
  laneOffset: number
): AnchorChoice[] => {
  const mode = getConnectionMode(nodeType)
  const fourCenter = mode === "four-center"
  const seen = new Set<string>()
  const choices: AnchorChoice[] = []
  for (const side of candidateSides(rect, toward)) {
    const ratio = fourCenter
      ? 0.5
      : alignedRatio(side, rect, toward, laneOffset)
    const key = `${side}:${Math.round(ratio * 1000)}`
    if (seen.has(key)) continue
    seen.add(key)
    choices.push(toAnchorChoice(nodeType, rect, { side, ratio }))
  }
  return choices
}

/**
 * The candidate pair that connects the two facing sides with a STRAIGHT run: both
 * anchors placed on one line through where the nodes overlap perpendicular to the
 * facing axis, so the edge needs no bend at all. `generateCandidates` aims each
 * anchor at its partner's centre independently, which for offset-but-overlapping
 * nodes lands them on different lines and forces a Z — this recovers the straight
 * option the weighed cost then prefers.
 *
 * Returns null when the nodes do not face each other on one axis, do not overlap
 * enough to fit both corner margins, or use a fixed-centre connection mode (which
 * cannot slide an anchor). The lane offset shifts the shared line, so parallel
 * siblings still fan into separate lines rather than all going straight onto each
 * other.
 */
const straightAlignedPair = (
  sourceRect: Rect,
  targetRect: Rect,
  sourceType: string | undefined,
  targetType: string | undefined,
  laneOffset: number
): { source: AnchorChoice; target: AnchorChoice } | null => {
  if (
    getConnectionMode(sourceType) === "four-center" ||
    getConnectionMode(targetType) === "four-center"
  )
    return null
  const sSide = facingSide(sourceRect, centerOf(targetRect))
  const tSide = facingSide(targetRect, centerOf(sourceRect))
  // The two anchors can share one line only if their sides directly oppose on the
  // same axis (Right↔Left or Bottom↔Top).
  if (OPPOSITE_SIDE[sSide] !== tSide) return null

  const vertical = isVerticalSide(sSide) // left/right sides ⇒ a straight run shares Y
  const sLo = vertical ? sourceRect.y : sourceRect.x
  const sHi = vertical
    ? sourceRect.y + sourceRect.height
    : sourceRect.x + sourceRect.width
  const tLo = vertical ? targetRect.y : targetRect.x
  const tHi = vertical
    ? targetRect.y + targetRect.height
    : targetRect.x + targetRect.width
  const sAxis = vertical ? sourceRect.height : sourceRect.width
  const tAxis = vertical ? targetRect.height : targetRect.width
  const margin = Math.min(2 * GRID, Math.min(sAxis, tAxis) * 0.3)
  const lo = Math.max(sLo, tLo) + margin
  const hi = Math.min(sHi, tHi) - margin
  if (lo > hi) return null // overlap too small to seat both anchors clear of corners

  const midpointOfCenters = ((sLo + sHi) / 2 + (tLo + tHi) / 2) / 2
  const snapped =
    Math.round(clamp(midpointOfCenters + laneOffset, lo, hi) / GRID) * GRID
  const v = clamp(snapped, lo, hi)
  return {
    source: toAnchorChoice(sourceType, sourceRect, {
      side: sSide,
      ratio: (v - sLo) / sAxis,
    }),
    target: toAnchorChoice(targetType, targetRect, {
      side: tSide,
      ratio: (v - tLo) / tAxis,
    }),
  }
}

const routeLength = (route: readonly IPoint[]): number => {
  let total = 0
  for (let i = 1; i < route.length; i++) {
    total += Math.abs(route[i].x - route[i - 1].x)
    total += Math.abs(route[i].y - route[i - 1].y)
  }
  return total
}

/** How far an anchor sits from the middle of its side, in pixels — the "off-
 * centre" cost. A corner attachment is ugly and a centred one is legible, so this
 * is weighed directly against bends: sliding an anchor off centre to go straight
 * is only worth it while the slide stays small. */
const offCenterPx = (choice: AnchorChoice, rect: Rect): number => {
  const axisLength = isVerticalSide(choice.position) ? rect.height : rect.width
  return Math.abs(choice.anchor.ratio - 0.5) * axisLength
}

/** Distance between an axis-aligned segment and a rect (0 if they touch/overlap).
 * Both are boxes — the segment a degenerate one — so this is the gap between two
 * rectangles. */
const segToRectDist = (a: IPoint, b: IPoint, r: Rect): number => {
  const dx = Math.max(
    0,
    Math.min(a.x, b.x) - (r.x + r.width),
    r.x - Math.max(a.x, b.x)
  )
  const dy = Math.max(
    0,
    Math.min(a.y, b.y) - (r.y + r.height),
    r.y - Math.max(a.y, b.y)
  )
  return Math.hypot(dx, dy)
}

/** How far inside the endpoint clearance the IDEAL route runs alongside its own
 * source or target node — a route that has to wrap tight around an endpoint
 * grazes its side, which the committed route then renders as an edge drawn on the
 * node. Measured per SEGMENT (a run parallel to a node's edge grazes it along its
 * whole length while its endpoints stay clear, so a vertex check would miss it),
 * skipping the stub that legitimately leaves the source and the one that arrives
 * at the target. Obstacle-free like the rest of the score: the only nodes it must
 * clear are its OWN two, known without any search. */
const hugPenaltyPx = (
  route: readonly IPoint[],
  sourceRect: Rect,
  targetRect: Rect
): number => {
  let total = 0
  const lastSeg = route.length - 2
  for (let i = 0; i <= lastSeg; i++) {
    const a = route[i]
    const b = route[i + 1]
    const toSource = i === 0 ? Infinity : segToRectDist(a, b, sourceRect)
    const toTarget = i === lastSeg ? Infinity : segToRectDist(a, b, targetRect)
    const clearance = Math.min(toSource, toTarget)
    if (clearance < EDGES.MIN_NODE_CLEARANCE_PX)
      total += EDGES.MIN_NODE_CLEARANCE_PX - clearance
  }
  return total
}

/**
 * The memoryless ranking key for one candidate, scored on its IDEAL (obstacle-
 * free) route. NOT strictly lexicographic on bends: the primary term is a WEIGHED
 * cost — `bends·BEND_COST_GU + offCentre` — so a straight edge (no bends) is
 * preferred only while going straight does not drag its anchors too far off the
 * side's centre; past that the centred one-bend attachment wins. Length breaks
 * ties, then side/ratio enums make the order TOTAL, so two candidates are never
 * left equal — which is what keeps the pick deterministic and identical across
 * Yjs peers.
 *
 * Scored obstacle- and neighbour-blind on purpose: attachment is a function of
 * the two nodes' clean geometry, not of what the router must detour around. That
 * also lets the choice be cached against a stable, intrinsic key — a neighbour or
 * obstacle moving elsewhere re-routes without re-picking the anchor, which is
 * what stops a one-node drag from re-searching the whole graph.
 */
const scoreKey = (
  route: readonly IPoint[],
  source: AnchorChoice,
  target: AnchorChoice,
  sourceRect: Rect,
  targetRect: Rect
): number[] => {
  const bends = Math.max(0, route.length - 2)
  const offCenter = Math.round(
    (offCenterPx(source, sourceRect) + offCenterPx(target, targetRect)) / GRID
  )
  // A hug is a defect, not a preference: weight it far above any bend so a
  // clear-but-more-bent attachment always beats one that grazes its own node.
  const hug = Math.round(hugPenaltyPx(route, sourceRect, targetRect) / GRID)
  const weightedCost = bends * BEND_COST_GU + offCenter + hug * HUG_COST_GU
  const length = Math.round(routeLength(route) / GRID)
  return [
    weightedCost,
    length,
    SIDE_ORDER[source.position],
    SIDE_ORDER[target.position],
    Math.round(source.anchor.ratio * 1000),
    Math.round(target.anchor.ratio * 1000),
  ]
}

const lexLess = (a: readonly number[], b: readonly number[]): boolean => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i]
  }
  return false
}

/** Turn a resolved-endpoint pair into the router's input, mirroring the solver's
 * own `routeStepEdge` call so an auto edge and a hand-anchored one route through
 * the exact same primitive. */
const toRouteParams = (
  endpoints: ResolvedEdgeEndpoints,
  obstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][],
  enableStraightPath: boolean
) => ({
  enableStraightPath,
  adjustedSource: endpoints.adjustedSource,
  adjustedTarget: endpoints.adjustedTarget,
  sourcePosition: endpoints.sourcePosition,
  targetPosition: endpoints.targetPosition,
  padding: endpoints.padding,
  rounded: endpoints.rounded,
  sourceAbsolutePosition: endpoints.sourceAbsolutePosition,
  targetAbsolutePosition: endpoints.targetAbsolutePosition,
  sourceSize: endpoints.sourceSize,
  targetSize: endpoints.targetSize,
  obstacles,
  neighborEdges,
})

/**
 * Route ONE fixed endpoint pair for real — the single primitive that produces a
 * committed auto route. Used for the winning candidate in `selectEdgeAnchors` and
 * for the solver's cheap fixed-anchor re-route when an obstacle or neighbour
 * moved, so preview, commit, and cache re-route can never draw the pair
 * differently. This is the SAME `routeStepEdge` a hand-anchored or straight-hook
 * edge routes through — smooth-step when the run is clear, A* only when it must
 * detour — so an auto edge is never drawn by a different, worse-cornered path
 * than an otherwise identical fixed one.
 */
export const routeChosenAnchors = (
  endpoints: ResolvedEdgeEndpoints,
  obstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][],
  enableStraightPath: boolean
): IPoint[] =>
  routeStepEdge(
    toRouteParams(endpoints, obstacles, neighborEdges, enableStraightPath)
  )

/** Resolve one endpoint pair (source anchor + target anchor) to router-ready
 * endpoints via the injected resolver. `undefined` for an end means "custom —
 * use the anchor already stored on the edge". */
export type ResolveWithAnchors = (overrides: {
  sourceAnchor?: FreeformEdgeAnchor
  targetAnchor?: FreeformEdgeAnchor
}) => ResolvedEdgeEndpoints | null

export type AutoAnchorInput = {
  sourceRect: Rect
  targetRect: Rect
  sourceType?: string
  targetType?: string
  /** Present ⇒ that end is a locked user override, not optimised. */
  sourceCustom?: FreeformEdgeAnchor
  targetCustom?: FreeformEdgeAnchor
  resolve: ResolveWithAnchors
  obstacles: readonly ObstacleRect[]
  neighborEdges: readonly IPoint[][]
  enableStraightPath: boolean
  /** Rank of this edge within its parallel set (edges sharing the node pair). */
  laneIndex: number
  laneCount: number
}

export type AutoAnchorResult = {
  endpoints: ResolvedEdgeEndpoints
  route: IPoint[]
  /** Set only for a freely-chosen end; absent when that end was custom. */
  sourceAnchor?: FreeformEdgeAnchor
  targetAnchor?: FreeformEdgeAnchor
}

/**
 * Choose the best source/target anchors for one edge and return the route they
 * produce, or `null` when no candidate is routable (the caller then falls back
 * to the plain resolve). Runs entirely on the injected resolver and the shared
 * router, so it is a pure function of the frame's geometry — the preview during
 * a drag and the committed edge take the identical path.
 */
export const selectEdgeAnchors = (
  input: AutoAnchorInput
): AutoAnchorResult | null => {
  const lane = laneOffsetPx(input.laneIndex, input.laneCount)
  const sourceOptions = input.sourceCustom
    ? [toAnchorChoice(input.sourceType, input.sourceRect, input.sourceCustom)]
    : generateCandidates(
        input.sourceType,
        input.sourceRect,
        centerOf(input.targetRect),
        lane
      )
  const targetOptions = input.targetCustom
    ? [toAnchorChoice(input.targetType, input.targetRect, input.targetCustom)]
    : generateCandidates(
        input.targetType,
        input.targetRect,
        centerOf(input.sourceRect),
        lane
      )

  // When both ends are free, add the straight-aligned pair — anchors on one line
  // through the nodes' overlap. Per-side candidates aim at the partner's centre
  // and so miss a straight run for offset nodes; this recovers it, and the weighed
  // cost keeps it only while its off-centre stays cheaper than the bend it saves.
  if (!input.sourceCustom && !input.targetCustom) {
    const straight = straightAlignedPair(
      input.sourceRect,
      input.targetRect,
      input.sourceType,
      input.targetType,
      lane
    )
    if (straight) {
      sourceOptions.push(straight.source)
      targetOptions.push(straight.target)
    }
  }

  let best: {
    endpoints: ResolvedEdgeEndpoints
    idealRoute: IPoint[]
    source: AnchorChoice
    target: AnchorChoice
    key: number[]
  } | null = null

  // Score every (source, target) pair on its IDEAL route — obstacle- and
  // neighbour-free, so free of any A* search. This is where the weighed cost
  // trades bends against off-centre; the winner alone pays for a real route.
  for (const source of sourceOptions) {
    for (const target of targetOptions) {
      const endpoints = input.resolve({
        sourceAnchor: input.sourceCustom ? undefined : source.anchor,
        targetAnchor: input.targetCustom ? undefined : target.anchor,
      })
      if (!endpoints) continue
      const idealRoute = routeStepEdge(
        toRouteParams(
          endpoints,
          NO_OBSTACLES,
          NO_NEIGHBORS,
          input.enableStraightPath
        )
      )
      const key = scoreKey(
        idealRoute,
        source,
        target,
        input.sourceRect,
        input.targetRect
      )
      if (!best || lexLess(key, best.key)) {
        best = { endpoints, idealRoute, source, target, key }
      }
    }
  }

  if (!best) return null
  const sourceAnchor = input.sourceCustom ? undefined : best.source.anchor
  const targetAnchor = input.targetCustom ? undefined : best.target.anchor
  // Route the winning anchors for real — obstacle- AND neighbour-aware. With
  // nothing to avoid the ideal route already IS that route, so skip the search.
  // This is the committed route; the solver reuses it and, when an obstacle or
  // neighbour later moves, reproduces it via the same `routeChosenAnchors`.
  const route =
    input.obstacles.length === 0 && input.neighborEdges.length === 0
      ? best.idealRoute
      : (routeChosenAnchors(
          best.endpoints,
          input.obstacles,
          input.neighborEdges,
          input.enableStraightPath
        ) ?? best.idealRoute)
  return { endpoints: best.endpoints, route, sourceAnchor, targetAnchor }
}
