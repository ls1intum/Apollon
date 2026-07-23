import { Position, type Rect } from "@xyflow/system"
import { CANVAS, EDGES } from "@/utils/geometry/routingConstants"
import type { IPoint } from "@/edges/Connection"
import { getConnectionMode, getEdgeAnchorPoint } from "@/utils/connectionModes"
import { type FreeformEdgeAnchor } from "@/utils/edgeUtils"
import { routeStepEdge } from "@/utils/geometry/edgeRoute"
import { clamp, lexLess } from "@/utils/geometry/scalar"
import {
  routeAroundObstaclesBetweenCandidates,
  routeConflictScore,
  type RouteEndpointCandidate,
} from "@/utils/geometry/orthogonalRouter"
import type { ObstacleRect } from "@/utils/geometry/obstacles"
import {
  endpointPlacementCost,
  endpointPreferenceCost,
  polylineConflictCost,
  ROUTING_COST,
  weightedRoutingCost,
} from "@/utils/geometry/routingCost"
import type { ResolvedEdgeEndpoints } from "@/utils/geometry/edgeGeometrySolver"
import {
  OPPOSITE_SIDE,
  OUTWARD_NORMAL,
  SIDE_ORDER,
  centerOf,
  facingSide,
  isVerticalSide,
  sideAxisLength,
  canRunStraight,
  cornerMargin,
} from "@/utils/geometry/rectSides"

/**
 * Endpoint-anchor selection: instead of pinning an edge to whatever side React
 * Flow's centre-to-centre guess lands on, pick the SIDE and the OFFSET along it
 * that minimise one shared endpoint-and-path objective against the same obstacles
 * and neighbouring routes the router avoids. A user-dragged (custom) anchor is
 * authoritative and never re-chosen; only free ends are optimised.
 *
 * The choice is MEMORYLESS — a pure function of the current geometry — on purpose. A
 * remembered "last frame's side" would render the same diagram differently on two Yjs
 * peers (each with its own drag history) and after a reload. Determinism comes from
 * grid-quantised candidates and an integer tie-break, so a given geometry always picks
 * the same winner. Note that is determinism, not stability: it guarantees every peer
 * agrees, not that the anchor moves smoothly under a drag.
 */

const GRID = CANVAS.SNAP_TO_GRID_PX
/** Inputs used only by the bounded-lattice fallback. Normal solves use joint A*
 * over real obstacles and neighbours. */
const NO_OBSTACLES: readonly ObstacleRect[] = []
const NO_NEIGHBORS: readonly IPoint[][] = []

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
  // Away-facing ports are uncommon but necessary when a blocker or an already
  // committed route makes the apparent U-turn globally cheaper. The old selector
  // discarded them before seeing the real route, which made joint optimisation
  // impossible by construction.
  return [primary, ...perpendicular, OPPOSITE_SIDE[primary]]
}

/** Snap a target offset ALONG a side (px from the side's low corner) to a grid-
 * aligned ratio, kept at least `margin` from either corner — a corner anchor
 * forces the first segment to graze the node it just left. Grid-snapping keeps the
 * ratio stable under a sub-grid node move (stability). */
const ratioAt = (alongTargetPx: number, axisLength: number): number => {
  if (axisLength <= 0) return 0.5
  const margin = Math.min(2 * GRID, axisLength * 0.3)
  let offset = clamp(alongTargetPx, margin, axisLength - margin)
  offset = Math.round(offset / GRID) * GRID
  return clamp(offset, margin, axisLength - margin) / axisLength
}

/**
 * Where along a side to place an anchor that AIMS at the partner's centre, so the
 * connecting run is straight (or a single clean bend). When the partner is strongly
 * displaced perpendicular to the side this clamps against the corner margin — which
 * is why `generateCandidates` also offers the CENTRED anchor: a displaced partner is
 * better served by a centred attachment and one bend than by an anchor in the corner.
 */
const alignedRatio = (side: Position, rect: Rect, toward: IPoint): number =>
  ratioAt(
    isVerticalSide(side) ? toward.y - rect.y : toward.x - rect.x,
    sideAxisLength(side, rect)
  )

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
  toward: IPoint
): AnchorChoice[] => {
  const mode = getConnectionMode(nodeType)
  const fourCenter = mode === "four-center"
  const seen = new Set<string>()
  const choices: AnchorChoice[] = []
  const pushRatio = (side: Position, ratio: number) => {
    const key = `${side}:${Math.round(ratio * 1000)}`
    if (seen.has(key)) return
    seen.add(key)
    choices.push(toAnchorChoice(nodeType, rect, { side, ratio }))
  }
  for (const side of candidateSides(rect, toward)) {
    if (fourCenter) {
      pushRatio(side, 0.5)
      continue
    }
    // Two candidates per side: one AIMED at the partner (best when the nodes line
    // up — a straight or single clean run) and one CENTRED (best when the partner
    // is displaced, where aiming clamps the anchor into a corner). The cost picks
    // between them; dedup drops the centred one when aiming already centres.
    pushRatio(side, alignedRatio(side, rect, toward))
    pushRatio(
      side,
      ratioAt(sideAxisLength(side, rect) / 2, sideAxisLength(side, rect))
    )
  }
  return choices
}

const straightAlignedPair = (
  sourceRect: Rect,
  targetRect: Rect,
  sourceType: string | undefined,
  targetType: string | undefined
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
  if (!canRunStraight(vertical, sourceRect, targetRect)) return null
  const margin = cornerMargin(sAxis, tAxis)
  const lo = Math.max(sLo, tLo) + margin
  const hi = Math.min(sHi, tHi) - margin

  const midpointOfCenters = ((sLo + sHi) / 2 + (tLo + tHi) / 2) / 2
  const snapped = Math.round(clamp(midpointOfCenters, lo, hi) / GRID) * GRID
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

/**
 * An anchor for the FREE end that lines up with an already-PINNED end (a user anchor
 * OR a solver band port) so the edge can run STRAIGHT. `straightAlignedPair` handles
 * both-free edges; this is its partially-pinned counterpart — without it, an edge with
 * one fixed end never gets a straight candidate and steps (the "cost model ignores
 * edges that aren't 100% auto-layouted" defect). `null` when no straight shot lands on
 * the free node's facing side (the pinned point falls outside its extent).
 */
const alignedToPinned = (
  freeType: string | undefined,
  freeRect: Rect,
  pinnedPoint: IPoint,
  pinnedSide: Position
): AnchorChoice | null => {
  if (getConnectionMode(freeType) === "four-center") return null
  const freeSide = OPPOSITE_SIDE[pinnedSide]
  const vertical = isVerticalSide(freeSide) // left/right ⇒ the straight run shares Y
  const axisLen = sideAxisLength(freeSide, freeRect)
  if (axisLen <= 0) return null
  const lo = vertical ? freeRect.y : freeRect.x
  const coord = vertical ? pinnedPoint.y : pinnedPoint.x
  const margin = Math.min(2 * GRID, axisLen * 0.3)
  // Only when the pinned point projects onto the free side clear of its corners — else
  // the "aligned" anchor clamps to a corner and is no longer straight.
  if (coord < lo + margin || coord > lo + axisLen - margin) return null
  // Match the pinned point EXACTLY (no grid snap): the pinned/band port may sit off the
  // grid (a straight-lane centre), so snapping the free end would re-introduce the very
  // step this candidate exists to remove.
  return toAnchorChoice(freeType, freeRect, {
    side: freeSide,
    ratio: (coord - lo) / axisLen,
  })
}

const routeLength = (route: readonly IPoint[]): number => {
  let total = 0
  for (let i = 1; i < route.length; i++) {
    total += Math.abs(route[i].x - route[i - 1].x)
    total += Math.abs(route[i].y - route[i - 1].y)
  }
  return total
}

/** Gap between an axis-aligned segment and a rect (0 if they touch/overlap), as a
 * MANHATTAN distance. Both are boxes — the segment a degenerate one.
 *
 * Manhattan, not Euclidean, because this feeds `weightedCost`: `Math.hypot` is
 * implementation-APPROXIMATED by ECMA-262, so two engines may return values differing
 * in the last bits, and the `Math.round(total / GRID)` downstream turns that into a
 * whole-unit difference whenever the sum lands near a .5 boundary — which flips the
 * chosen anchor. Every term here is a correctly-rounded add/subtract, so the result is
 * bit-identical everywhere. The two agree exactly for axis-aligned separations (one of
 * dx/dy is 0); they differ only diagonally, where either is a fine clearance measure.
 */
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
  return dx + dy
}

/** How far the ideal route runs inside its OWN endpoints' clearance — a route that
 * wraps tight around an endpoint renders as an edge drawn on the node. Per SEGMENT: a
 * run parallel to a side grazes along its whole length while its vertices stay clear.
 * The stubs are skipped; they leave/arrive legitimately. */
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

/** How many BYSTANDER node bodies the ideal route is driven THROUGH. Unlike the
 * graduated graze below this is unambiguous — the route enters a node it does not
 * belong to — and it applies whatever the bend count, because the router cannot make
 * it disappear: it has to detour, which costs corners the ideal never showed. Scoring
 * only the straight case (as the graze does) let a "1-bend" attachment win over a
 * 2-bend one and then land as a 3-corner detour around whatever was in the way. */
const routeThroughNodes = (
  route: readonly IPoint[],
  rects: readonly Rect[]
): number => {
  let n = 0
  for (const r of rects) {
    const loX = r.x + 1
    const hiX = r.x + r.width - 1
    const loY = r.y + 1
    const hiY = r.y + r.height - 1
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i]
      const b = route[i + 1]
      if (
        Math.min(a.x, b.x) < hiX &&
        Math.max(a.x, b.x) > loX &&
        Math.min(a.y, b.y) < hiY &&
        Math.max(a.y, b.y) > loY
      ) {
        n++
        break
      }
    }
  }
  return n
}

/** How close the ideal route runs to a BYSTANDER node. Graduated by distance to the
 * router's ideal clearance, so it both rejects grazes and breaks ties toward the side
 * that drops cleanly away. No segment is exempt — a bystander is never this edge's own
 * node. Search-free: measured on the obstacle-blind ideal polyline. */
const thirdPartyGrazePx = (
  route: readonly IPoint[],
  rects: readonly Rect[]
): number => {
  if (rects.length === 0) return 0
  let total = 0
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i]
    const b = route[i + 1]
    for (const rect of rects) {
      const dist = segToRectDist(a, b, rect)
      if (dist < EDGES.NODE_CLEARANCE_PX)
        total += EDGES.NODE_CLEARANCE_PX - dist
    }
  }
  return total
}

/** How many of a candidate's FOUR-CENTRE ends sit on a side not facing the partner
 * (0-2). A four-centre anchor cannot slide, so two of its edges picking the same side
 * collapse onto one midpoint; the only cure is to send them to different sides, which
 * this does among `weightedCost` ties. `null` for a freeform end — there the
 * continuous off-centre cost already handles it, and this nudge must not perturb it. */
const offFacingCount = (
  source: AnchorChoice,
  target: AnchorChoice,
  sourceFacing: Position | null,
  targetFacing: Position | null
): number =>
  (sourceFacing !== null && source.position !== sourceFacing ? 1 : 0) +
  (targetFacing !== null && target.position !== targetFacing ? 1 : 0)

/** How squarely `side` of `from` points at `to`: the side's outward normal dotted with
 * the RAW centre-to-centre direction. Unnormalised on purpose — |d| is shared by an
 * edge's candidates, so dividing is order-preserving and would only add a `hypot`
 * (implementation-defined across engines) to a comparison every peer must agree on.
 * Raw, unlike `facingSide`, which weighs by the node's half-extent and so can name a
 * side the pair is less displaced along. */
const sideAim = (side: Position, from: Rect, to: Rect): number => {
  const a = centerOf(from)
  const b = centerOf(to)
  const n = OUTWARD_NORMAL[side]
  return n.x * (b.x - a.x) + n.y * (b.y - a.y)
}

/**
 * The ranking key for one candidate, scored on its IDEAL (obstacle-free) route. The
 * head is a WEIGHED cost — bends traded against off-centre — so an edge goes straight
 * only while staying straight does not drag its anchors too far off centre. The rest
 * is a lexicographic tail of tie-breaks. Every term is exactly representable — the
 * costs are integers, and `sideAim` is a centre difference — so peers compare
 * identically.
 */
const scoreKey = (
  route: readonly IPoint[],
  source: AnchorChoice,
  target: AnchorChoice,
  sourceRect: Rect,
  targetRect: Rect,
  /** The side each FOUR-CENTRE end should prefer among cost-ties (its facing
   * side); `null` for a freeform end, which takes no facing nudge. */
  sourceFacing: Position | null,
  targetFacing: Position | null,
  /** Node bodies that are NEITHER endpoint, so a candidate whose ideal route grazes
   * a bystander loses to one that clears it. Empty ⇒ no third-party term. */
  thirdParty: readonly Rect[],
  /** The polylines of already-committed (lower-id) edges, so a candidate that CROSSES
   * or runs ON a neighbour is priced against one that does not. Empty ⇒ no cross-edge
   * term (first edge, or a diagram with none placed yet). This is the unified cost's
   * cross-edge coupling: crossing avoidance, bundle nesting and no-fork-collapse all
   * emerge from it, in id order. */
  committed: readonly IPoint[][],
  sourcePreferred?: FreeformEdgeAnchor,
  targetPreferred?: FreeformEdgeAnchor
): number[] => {
  const bends = Math.max(0, route.length - 2)
  // Off-centre is measured from the side CENTRE. Multi-edge spacing is handled up
  // front by the geometric port band (see `portAssignment.ts`), so the anchor cost
  // no longer needs a per-sibling slot reference.
  const ds = Math.round(1000 * Math.abs(source.anchor.ratio - 0.5))
  const dt = Math.round(1000 * Math.abs(target.anchor.ratio - 0.5))
  const placement =
    endpointPlacementCost(
      source.anchor,
      sideAxisLength(source.anchor.side, sourceRect),
      GRID
    ) +
    endpointPlacementCost(
      target.anchor,
      sideAxisLength(target.anchor.side, targetRect),
      GRID
    )
  const preference =
    endpointPreferenceCost(
      source.anchor,
      sourcePreferred,
      sideAxisLength(source.anchor.side, sourceRect),
      GRID
    ) +
    endpointPreferenceCost(
      target.anchor,
      targetPreferred,
      sideAxisLength(target.anchor.side, targetRect),
      GRID
    )
  // A hug is a defect, not a preference: weight it far above any bend so a
  // clear-but-more-bent attachment always beats one that grazes its own node.
  const hug = Math.round(hugPenaltyPx(route, sourceRect, targetRect) / GRID)
  // The same, against BYSTANDER nodes — but ONLY for a STRAIGHT (0-bend) ideal. A
  // straight lane between two aligned anchors that grazes/crosses a third node has no
  // way to dodge it except by RETURNING to the same lane, so the committed route is
  // an ugly there-and-back (or a graze the router can't price away): the straight
  // attachment must lose to a bending one that clears the node. A BENDING ideal that
  // merely crosses a node is left alone — the router detours it cleanly on one turn
  // (penalising it would trade a good centred side for a worse one). This is also why
  // the anchors stop sliding off-centre just to keep a grazing straight line.
  const graze =
    bends === 0 ? Math.round(thirdPartyGrazePx(route, thirdParty) / GRID) : 0
  // Counted for EVERY candidate, not just straight ones: the router has to detour
  // around a node in the way, and that detour costs corners the ideal never showed.
  const through = routeThroughNodes(route, thirdParty)
  // Cross-edge coupling against the committed lower-id routes: a candidate that
  // crosses or runs on a neighbour costs more, so the winner avoids them where it
  // cheaply can (id-order greedy, the libavoid/yFiles model).
  const conflict =
    committed.length === 0
      ? { crossings: 0, proximityPx: 0 }
      : routeConflictScore(route, committed)
  const generalConflict = polylineConflictCost(
    route,
    committed,
    ROUTING_COST.parallelCrowdingClearanceInGridCells * GRID
  )
  const lengthPx = routeLength(route)
  const weightedCost =
    weightedRoutingCost(
      {
        lengthPx,
        bends,
        crossings: conflict.crossings,
        overlapPx: generalConflict.overlapPx,
        crowdingPx: generalConflict.crowdingPx,
      },
      GRID
    ) +
    placement +
    preference +
    hug * ROUTING_COST.huggingPerPx +
    graze * ROUTING_COST.huggingPerPx +
    through * ROUTING_COST.edgeCrossing
  const length = Math.round(lengthPx / GRID)
  return [
    weightedCost,
    // A four-centre end cannot slide, so two of its edges picking one side collapse
    // onto the same midpoint; among cost-ties, send them to different sides instead.
    // Zero for freeform-only pairs, which the continuous off-centre cost handles.
    offFacingCount(source, target, sourceFacing, targetFacing),
    length,
    // Prefer the more BALANCED pair (smaller worst end). `offCenter` rounds to an
    // integer, so within one of its buckets this still separates a lopsided pair from
    // an even one — which is what holds parallel siblings a full lane apart rather
    // than letting them settle a grid step closer.
    Math.max(ds, dt),
    // Leave from the side that POINTS at the partner, SOURCE aim first then target.
    // Among cost-tied 1-bend routes an edge can exit its facing side or a perpendicular
    // one at equal price with equal length and balance; a SUMMED source+target aim ties
    // too (one route faces well at the source, the other at the target), so the choice
    // fell to the SIDE_ORDER enum — and TWO edges leaving one node then made the SAME
    // arbitrary choice, piling onto one side and crossing. Ranking the SOURCE aim first
    // breaks that tie and spreads a fork: each edge exits the side facing its own
    // partner. Ties for same-partner siblings (identical sides), already separated
    // above. Mirror-symmetric, exact (see `sideAim`).
    -(
      sideAim(source.position, sourceRect, targetRect) +
      sideAim(target.position, targetRect, sourceRect)
    ),
    SIDE_ORDER[source.position],
    SIDE_ORDER[target.position],
    Math.round(source.anchor.ratio * 1000),
    Math.round(target.anchor.ratio * 1000),
  ]
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
  /** Node-local coordinator suggestions. Unlike user anchors these are merely
   * candidates: the joint route may choose another side or slot. */
  sourcePreferred?: FreeformEdgeAnchor
  targetPreferred?: FreeformEdgeAnchor
  resolve: ResolveWithAnchors
  obstacles: readonly ObstacleRect[]
  /** Obstacles that are NEITHER endpoint node (already reach-windowed by
   * `getEdgeObstacles`), used to price an ideal route that grazes a bystander.
   * Empty/absent ⇒ selection stays purely obstacle-blind. */
  thirdPartyObstacles?: readonly ObstacleRect[]
  neighborEdges: readonly IPoint[][]
  enableStraightPath: boolean
  /** Previously proven route for this edge. When its endpoints still occur in
   * the current candidate set, A* may use its freshly re-priced cost as an exact
   * upper bound. The route is never accepted on memory alone: the current graph
   * still proves that no cheaper or canonically earlier result exists. */
  incumbentRoute?: readonly IPoint[]
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
  const thirdParty = input.thirdPartyObstacles ?? NO_OBSTACLES

  // A FOUR-CENTRE end can only sit on a side-midpoint, so two of its edges that pick
  // the same side collapse onto one point. The scorer breaks a cost-tie toward the
  // side FACING the partner so they land on DIFFERENT sides instead; a freeform end
  // gets `null` and keeps the continuous off-centre régime untouched. A pinned
  // (custom) end has a single fixed candidate, so its facing preference is moot.
  const sourceFacing =
    !input.sourceCustom && getConnectionMode(input.sourceType) === "four-center"
      ? facingSide(input.sourceRect, centerOf(input.targetRect))
      : null
  const targetFacing =
    !input.targetCustom && getConnectionMode(input.targetType) === "four-center"
      ? facingSide(input.targetRect, centerOf(input.sourceRect))
      : null
  const sourceOptions = input.sourceCustom
    ? [toAnchorChoice(input.sourceType, input.sourceRect, input.sourceCustom)]
    : generateCandidates(
        input.sourceType,
        input.sourceRect,
        centerOf(input.targetRect)
      )
  const targetOptions = input.targetCustom
    ? [toAnchorChoice(input.targetType, input.targetRect, input.targetCustom)]
    : generateCandidates(
        input.targetType,
        input.targetRect,
        centerOf(input.sourceRect)
      )

  const addPreferred = (
    options: AnchorChoice[],
    preferred: FreeformEdgeAnchor | undefined,
    type: string | undefined,
    rect: Rect
  ): void => {
    if (!preferred) return
    const add = (anchor: FreeformEdgeAnchor): void => {
      const key = `${anchor.side}:${Math.round(anchor.ratio * 1000)}`
      if (
        options.some(
          (option) =>
            `${option.anchor.side}:${Math.round(option.anchor.ratio * 1000)}` ===
            key
        )
      )
        return
      options.push(toAnchorChoice(type, rect, anchor))
    }
    add(preferred)
    // Opposite ends observe a side in opposite rotational order. Offering the
    // mirrored seat lets the real route decide between nesting and parallel lanes
    // instead of forcing the coordinator's local ordering onto both nodes.
    if (getConnectionMode(type) !== "four-center")
      add({ side: preferred.side, ratio: 1 - preferred.ratio })
  }
  if (!input.sourceCustom)
    addPreferred(
      sourceOptions,
      input.sourcePreferred,
      input.sourceType,
      input.sourceRect
    )
  if (!input.targetCustom)
    addPreferred(
      targetOptions,
      input.targetPreferred,
      input.targetType,
      input.targetRect
    )

  // When both ends are free, add the straight-aligned pair — anchors on one line
  // through the nodes' overlap. Per-side candidates aim at the partner's centre
  // and so miss a straight run for offset nodes; this recovers it, and the weighed
  // cost keeps it only while its off-centre stays cheaper than the bend it saves.
  const straight =
    !input.sourceCustom && !input.targetCustom
      ? straightAlignedPair(
          input.sourceRect,
          input.targetRect,
          input.sourceType,
          input.targetType
        )
      : null
  if (straight) {
    sourceOptions.push(straight.source)
    targetOptions.push(straight.target)
  }

  const addChoice = (options: AnchorChoice[], choice: AnchorChoice | null) => {
    if (!choice) return
    const key = `${choice.anchor.side}:${Math.round(choice.anchor.ratio * 1000)}`
    if (
      !options.some(
        (option) =>
          `${option.anchor.side}:${Math.round(option.anchor.ratio * 1000)}` ===
          key
      )
    )
      options.push(choice)
  }

  // A coordinated seat is soft, but the opposite free end must be offered the
  // aligned mate or accepting that seat would manufacture a bend. This is also
  // what makes a newly-added sibling reflow an existing straight edge live.
  if (!input.sourceCustom && input.targetPreferred) {
    const preferred = toAnchorChoice(
      input.targetType,
      input.targetRect,
      input.targetPreferred
    )
    addChoice(
      sourceOptions,
      alignedToPinned(
        input.sourceType,
        input.sourceRect,
        preferred.point,
        preferred.position
      )
    )
  }
  if (!input.targetCustom && input.sourcePreferred) {
    const preferred = toAnchorChoice(
      input.sourceType,
      input.sourceRect,
      input.sourcePreferred
    )
    addChoice(
      targetOptions,
      alignedToPinned(
        input.targetType,
        input.targetRect,
        preferred.point,
        preferred.position
      )
    )
  }

  // Exactly ONE end pinned (a user anchor or a solver band port): offer the free end an
  // anchor ALIGNED with the pinned one, so a partially-pinned edge can still be STRAIGHT
  // instead of stepping. The weighed cost keeps it only when it is genuinely straighter.
  if (input.sourceCustom && !input.targetCustom) {
    const aligned = alignedToPinned(
      input.targetType,
      input.targetRect,
      sourceOptions[0].point,
      sourceOptions[0].position
    )
    if (aligned) targetOptions.push(aligned)
  } else if (input.targetCustom && !input.sourceCustom) {
    const aligned = alignedToPinned(
      input.sourceType,
      input.sourceRect,
      targetOptions[0].point,
      targetOptions[0].position
    )
    if (aligned) sourceOptions.push(aligned)
  }

  // Endpoint resolution is separable: a source anchor determines only the source
  // half of ResolvedEdgeEndpoints, and likewise for the target. Resolve each choice
  // once, then compose pairs. The former Cartesian loop repeated identical shape
  // projection/marker work sourceOptions × targetOptions times (up to 64 resolves
  // for eight choices per end) on every cache miss.
  const combineEndpoints = (
    source: ResolvedEdgeEndpoints,
    target: ResolvedEdgeEndpoints
  ): ResolvedEdgeEndpoints => ({
    adjustedSource: source.adjustedSource,
    adjustedTarget: target.adjustedTarget,
    sourcePosition: source.sourcePosition,
    targetPosition: target.targetPosition,
    rounded: {
      sourceX: source.rounded.sourceX,
      sourceY: source.rounded.sourceY,
      targetX: target.rounded.targetX,
      targetY: target.rounded.targetY,
    },
    sourceAbsolutePosition: source.sourceAbsolutePosition,
    targetAbsolutePosition: target.targetAbsolutePosition,
    sourceSize: source.sourceSize,
    targetSize: target.targetSize,
    padding: source.padding,
  })
  const resolvedSources: Array<ResolvedEdgeEndpoints | undefined> = new Array(
    sourceOptions.length
  )
  const resolvedTargets: Array<ResolvedEdgeEndpoints | undefined> = new Array(
    targetOptions.length
  )
  const sourceCandidates: Array<RouteEndpointCandidate | undefined> = new Array(
    sourceOptions.length
  )
  const targetCandidates: Array<RouteEndpointCandidate | undefined> = new Array(
    targetOptions.length
  )
  const forceStubTurn = (anchor: FreeformEdgeAnchor, rect: Rect): boolean => {
    const axis = sideAxisLength(anchor.side, rect)
    return (
      Math.min(anchor.ratio * axis, (1 - anchor.ratio) * axis) <=
      EDGES.MIN_NODE_CLEARANCE_PX
    )
  }
  const balancedPinnedStubLengths = (() => {
    if (!input.sourceCustom || !input.targetCustom) return null
    const source = sourceOptions[0]
    const target = targetOptions[0]
    const sourcePoint = source.point
    const targetPoint = target.point
    const vertical =
      (source.position === Position.Top &&
        target.position === Position.Bottom &&
        sourcePoint.y > targetPoint.y) ||
      (source.position === Position.Bottom &&
        target.position === Position.Top &&
        sourcePoint.y < targetPoint.y)
    const horizontal =
      (source.position === Position.Left &&
        target.position === Position.Right &&
        sourcePoint.x > targetPoint.x) ||
      (source.position === Position.Right &&
        target.position === Position.Left &&
        sourcePoint.x < targetPoint.x)
    if (!vertical && !horizontal) return null

    const sourceCoordinate = vertical ? sourcePoint.y : sourcePoint.x
    const targetCoordinate = vertical ? targetPoint.y : targetPoint.x
    const lane =
      Math.round((sourceCoordinate + targetCoordinate) / 2 / GRID) * GRID
    const sourceLength = Math.abs(sourceCoordinate - lane)
    const targetLength = Math.abs(targetCoordinate - lane)
    if (sourceLength < GRID || targetLength < GRID) return null
    return {
      sourceLength,
      targetLength,
      requiresTurn: vertical
        ? sourcePoint.x !== targetPoint.x
        : sourcePoint.y !== targetPoint.y,
    }
  })()
  const referenceSource = sourceOptions[0]
  const referenceTarget = targetOptions[0]
  for (let sourceIndex = 0; sourceIndex < sourceOptions.length; sourceIndex++) {
    const source = sourceOptions[sourceIndex]
    const endpoints = input.resolve({
      sourceAnchor: source.anchor,
      targetAnchor: referenceTarget.anchor,
    })
    if (!endpoints) continue
    resolvedSources[sourceIndex] = endpoints
    sourceCandidates[sourceIndex] = {
      point: endpoints.adjustedSource,
      position: endpoints.sourcePosition,
      stubLength: balancedPinnedStubLengths?.sourceLength ?? EDGES.STUB_LENGTH,
      cost: input.sourceCustom
        ? 0
        : endpointPlacementCost(
            source.anchor,
            sideAxisLength(source.anchor.side, input.sourceRect),
            GRID
          ) +
          endpointPreferenceCost(
            source.anchor,
            input.sourcePreferred,
            sideAxisLength(source.anchor.side, input.sourceRect),
            GRID
          ),
      forceStubTurn:
        (Boolean(input.sourceCustom) &&
          forceStubTurn(source.anchor, input.sourceRect)) ||
        (balancedPinnedStubLengths?.requiresTurn ?? false),
    }
  }
  for (let targetIndex = 0; targetIndex < targetOptions.length; targetIndex++) {
    const target = targetOptions[targetIndex]
    const endpoints = input.resolve({
      sourceAnchor: referenceSource.anchor,
      targetAnchor: target.anchor,
    })
    if (!endpoints) continue
    resolvedTargets[targetIndex] = endpoints
    targetCandidates[targetIndex] = {
      point: endpoints.adjustedTarget,
      position: endpoints.targetPosition,
      stubLength: balancedPinnedStubLengths?.targetLength ?? EDGES.STUB_LENGTH,
      cost: input.targetCustom
        ? 0
        : endpointPlacementCost(
            target.anchor,
            sideAxisLength(target.anchor.side, input.targetRect),
            GRID
          ) +
          endpointPreferenceCost(
            target.anchor,
            input.targetPreferred,
            sideAxisLength(target.anchor.side, input.targetRect),
            GRID
          ),
      forceStubTurn:
        (Boolean(input.targetCustom) &&
          forceStubTurn(target.anchor, input.targetRect)) ||
        (balancedPinnedStubLengths?.requiresTurn ?? false),
    }
  }

  const sourceMap: number[] = []
  const targetMap: number[] = []
  const jointSources = sourceCandidates.flatMap((candidate, index) => {
    if (!candidate) return []
    sourceMap.push(index)
    return [candidate]
  })
  const jointTargets = targetCandidates.flatMap((candidate, index) => {
    if (!candidate) return []
    targetMap.push(index)
    return [candidate]
  })
  const joint = routeAroundObstaclesBetweenCandidates(
    jointSources,
    jointTargets,
    input.obstacles,
    input.neighborEdges,
    input.incumbentRoute,
    { source: input.sourceRect, target: input.targetRect }
  )
  if (joint) {
    const sourceIndex = sourceMap[joint.sourceIndex]
    const targetIndex = targetMap[joint.targetIndex]
    const resolvedSource = resolvedSources[sourceIndex]
    const resolvedTarget = resolvedTargets[targetIndex]
    if (resolvedSource && resolvedTarget) {
      return {
        endpoints: combineEndpoints(resolvedSource, resolvedTarget),
        route: joint.route,
        sourceAnchor: input.sourceCustom
          ? undefined
          : sourceOptions[sourceIndex].anchor,
        targetAnchor: input.targetCustom
          ? undefined
          : targetOptions[targetIndex].anchor,
      }
    }
  }

  // The bounded lattice can decline an exceptionally dense candidate graph. Keep
  // the established ideal-route selector as a deterministic degradation path.
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
  for (let sourceIndex = 0; sourceIndex < sourceOptions.length; sourceIndex++) {
    const source = sourceOptions[sourceIndex]
    for (
      let targetIndex = 0;
      targetIndex < targetOptions.length;
      targetIndex++
    ) {
      const target = targetOptions[targetIndex]
      const resolvedSource = resolvedSources[sourceIndex]
      const resolvedTarget = resolvedTargets[targetIndex]
      if (!resolvedSource || !resolvedTarget) continue
      const endpoints = combineEndpoints(resolvedSource, resolvedTarget)
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
        input.targetRect,
        sourceFacing,
        targetFacing,
        thirdParty,
        input.neighborEdges,
        input.sourcePreferred,
        input.targetPreferred
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
      : routeChosenAnchors(
          best.endpoints,
          input.obstacles,
          input.neighborEdges,
          input.enableStraightPath
        )
  return { endpoints: best.endpoints, route, sourceAnchor, targetAnchor }
}
