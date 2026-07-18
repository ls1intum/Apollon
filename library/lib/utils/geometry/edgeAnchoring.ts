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
 * The choice is MEMORYLESS — a pure function of the current geometry — on purpose. A
 * remembered "last frame's side" would render the same diagram differently on two Yjs
 * peers (each with its own drag history) and after a reload. Determinism comes from
 * grid-quantised candidates and an integer tie-break, so a given geometry always picks
 * the same winner. Note that is determinism, not stability: it guarantees every peer
 * agrees, not that the anchor moves smoothly under a drag.
 */

/** Final, geometry-blind tie-break: an integer per side, so the order is stable across
 * peers. Fully-tied keys are possible (duplicate candidates); first-seen then wins,
 * which is deterministic because candidate order is. */
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

/** What one bend costs, in the grid units the off-centre term is weighed against:
 * `weightedCost = bends·BEND_COST_GU + offCentre + …` (length is a tie-break below
 * it, not a traded term). Sets the crossover in `OFF_CENTRE_DIVISOR`: straight where
 * possible, unless staying straight drags the anchors too far off centre. */
const BEND_COST_GU = 12
/** Divides the convex (sum-of-squares) off-centre term. Chosen so a symmetric
 * straight edge — both anchors the same fraction off centre — costs exactly one
 * bend at ~0.30 off centre: below that going straight is preferred, past it the
 * centred one-bend attachment wins. Ratio-based, so this crossover is the same for
 * a small node and a large one (the old pixel term crossed at a size-dependent
 * ratio, bending big nodes too eagerly and small ones never). */
const OFF_CENTRE_DIVISOR = 15_000
/** What one grid cell of "hug" — an ideal-route point run inside the endpoint
 * clearance — costs. Far above a bend so avoiding a graze always wins over saving
 * a corner; a hug is a defect, not a trade-off. */
const HUG_COST_GU = 50
/** What one grid cell of THIRD-PARTY graze costs — an ideal-route run that grazes,
 * crosses, or crowds a node that is NEITHER endpoint. As bad as hugging its own
 * node: an edge drawn on top of a third node reads as broken just the same. Above a
 * bend so a clean-but-more-bent attachment always beats one that grazes a bystander,
 * and graduated (see `thirdPartyGrazePx`) so it also breaks a cost-tie toward the
 * side whose route drops cleanly away from a nearby node. */
const THIRD_PARTY_GRAZE_COST_GU = 50
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

const axisLengthOf = (side: Position, rect: Rect): number =>
  isVerticalSide(side) ? rect.height : rect.width

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
    axisLengthOf(side, rect)
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
      ratioAt(axisLengthOf(side, rect) / 2, axisLengthOf(side, rect))
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
  const margin = Math.min(2 * GRID, Math.min(sAxis, tAxis) * 0.3)
  const lo = Math.max(sLo, tLo) + margin
  const hi = Math.min(sHi, tHi) - margin
  if (lo > hi) return null // overlap too small to seat both anchors clear of corners

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

const routeLength = (route: readonly IPoint[]): number => {
  let total = 0
  for (let i = 1; i < route.length; i++) {
    total += Math.abs(route[i].x - route[i - 1].x)
    total += Math.abs(route[i].y - route[i - 1].y)
  }
  return total
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

/** The outward unit normal of a node side. */
const OUTWARD_NORMAL: Record<Position, IPoint> = {
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 },
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
}

/** How squarely `side` of `from` points at `to`: the side's outward normal dotted with
 * the RAW centre-to-centre direction. Higher = the side faces the partner more
 * directly. Unnormalised on purpose — |d| is shared by an edge's candidates, so
 * dividing is order-preserving and would only add a `hypot` (implementation-defined
 * across JS engines) to a comparison every peer must agree on; axis-aligned normals ⇒
 * ±dx/±dy, exact in doubles. Raw, NOT `facingSide`, which divides by the node's
 * half-extent and so can name a side the pair is less displaced along. */
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
 * is a lexicographic tail of tie-breaks. All-integer, so peers compare identically.
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
  thirdParty: readonly Rect[]
): number[] => {
  const bends = Math.max(0, route.length - 2)
  // Off-centre is measured from the side CENTRE. Multi-edge spacing is handled up
  // front by the geometric port band (see `portAssignment.ts`), so the anchor cost
  // no longer needs a per-sibling slot reference.
  const ds = Math.round(1000 * Math.abs(source.anchor.ratio - 0.5))
  const dt = Math.round(1000 * Math.abs(target.anchor.ratio - 0.5))
  // CONVEX (sum of squares) so the cost penalises CONCENTRATION, not just level: a
  // pair jammed as (corner, centre) costs more than a balanced (mild, mild) pair
  // the old linear sum rated exactly equal, so the balanced attachment wins on
  // cost rather than falling to the geometry-blind tie-break.
  const offCenter = Math.round((ds * ds + dt * dt) / OFF_CENTRE_DIVISOR)
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
  const weightedCost =
    bends * BEND_COST_GU +
    offCenter +
    hug * HUG_COST_GU +
    graze * THIRD_PARTY_GRAZE_COST_GU
  const length = Math.round(routeLength(route) / GRID)
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
  /** Obstacles that are NEITHER endpoint node (already reach-windowed by
   * `getEdgeObstacles`), used to price an ideal route that grazes a bystander.
   * Empty/absent ⇒ selection stays purely obstacle-blind. */
  thirdPartyObstacles?: readonly ObstacleRect[]
  neighborEdges: readonly IPoint[][]
  enableStraightPath: boolean
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
        // Always resolve the chosen anchor explicitly. For a free end it is the
        // candidate; for a PINNED end (a user anchor OR a solver-assigned band port)
        // it is that fixed anchor — and a band port is NOT stored on the edge, so it
        // must be passed here or the resolve would fall back to the default point.
        sourceAnchor: source.anchor,
        targetAnchor: target.anchor,
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
        input.targetRect,
        sourceFacing,
        targetFacing,
        thirdParty
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
