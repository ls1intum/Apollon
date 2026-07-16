import { Position, type Rect } from "@xyflow/react"
import { CANVAS, EDGES } from "@/constants"
import type { IPoint } from "@/edges/Connection"
import { getConnectionMode, getEdgeAnchorPoint } from "@/utils/connectionModes"
import {
  getEffectiveStubLength,
  type FreeformEdgeAnchor,
} from "@/utils/edgeUtils"
import {
  routeAroundObstaclesToTargets,
  routeConflictsWithNeighborEdges,
  type RouteTarget,
} from "@/utils/geometry/orthogonalRouter"
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
  const c = centerOf(rect)
  const dx = toward.x - c.x
  const dy = toward.y - c.y
  const primary =
    Math.abs(dx) / (rect.width / 2 || 1) >=
    Math.abs(dy) / (rect.height / 2 || 1)
      ? dx >= 0
        ? Position.Right
        : Position.Left
      : dy >= 0
        ? Position.Bottom
        : Position.Top
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

const routeLength = (route: readonly IPoint[]): number => {
  let total = 0
  for (let i = 1; i < route.length; i++) {
    total += Math.abs(route[i].x - route[i - 1].x)
    total += Math.abs(route[i].y - route[i - 1].y)
  }
  return total
}

/**
 * The strict, memoryless ranking key for one routed candidate. Compared
 * lexicographically; every field is an integer or a fixed enum, so the order is
 * TOTAL — two candidates are never left tied, which is what keeps the pick
 * deterministic (and identical across Yjs peers).
 */
const scoreKey = (
  route: readonly IPoint[],
  source: AnchorChoice,
  target: AnchorChoice,
  neighborEdges: readonly IPoint[][]
): number[] => {
  const conflict = routeConflictsWithNeighborEdges(route, neighborEdges) ? 1 : 0
  const bends = Math.max(0, route.length - 2)
  const length = Math.round(routeLength(route) / GRID)
  // Prefer anchors near the middle of their side: symmetric, legible, and a
  // stable place to sit when several offsets tie on bends and length.
  const centeredness = Math.round(
    (Math.abs(source.anchor.ratio - 0.5) +
      Math.abs(target.anchor.ratio - 0.5)) *
      1000
  )
  return [
    conflict,
    bends,
    length,
    centeredness,
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

  let best: { result: AutoAnchorResult; key: number[] } | null = null

  for (const source of sourceOptions) {
    // Resolve every target option against this source. Target-side geometry is
    // independent of the source anchor, but the resolver returns both ends at
    // once, so one call per target is the simplest correct thing.
    const entries: {
      option: AnchorChoice
      endpoints: ResolvedEdgeEndpoints
      routeTarget: RouteTarget
    }[] = []
    for (const target of targetOptions) {
      const endpoints = input.resolve({
        sourceAnchor: input.sourceCustom ? undefined : source.anchor,
        targetAnchor: input.targetCustom ? undefined : target.anchor,
      })
      if (!endpoints) continue
      entries.push({
        option: target,
        endpoints,
        routeTarget: {
          point: endpoints.adjustedTarget,
          position: endpoints.targetPosition,
          stubLength: getEffectiveStubLength(
            endpoints.adjustedSource,
            endpoints.adjustedTarget,
            endpoints.sourcePosition,
            endpoints.targetPosition
          ),
        },
      })
    }
    if (entries.length === 0) continue

    // One multi-target search picks the cheapest target for this source; the
    // committed route is then produced by the shared `routeStepEdge`, so auto
    // and custom edges are drawn by the same primitive (and straight-capable
    // edge types can still go straight).
    const srcEndpoints = entries[0].endpoints
    const picked = routeAroundObstaclesToTargets(
      srcEndpoints.adjustedSource,
      srcEndpoints.sourcePosition,
      EDGES.STUB_LENGTH,
      entries.map((e) => e.routeTarget),
      input.obstacles,
      input.neighborEdges
    )
    if (!picked) continue

    const chosen = entries[picked.targetIndex]
    const route = routeStepEdge(
      toRouteParams(
        chosen.endpoints,
        input.obstacles,
        input.neighborEdges,
        input.enableStraightPath
      )
    )
    const key = scoreKey(route, source, chosen.option, input.neighborEdges)
    if (!best || lexLess(key, best.key)) {
      best = {
        key,
        result: {
          endpoints: chosen.endpoints,
          route,
          sourceAnchor: input.sourceCustom ? undefined : source.anchor,
          targetAnchor: input.targetCustom ? undefined : chosen.option.anchor,
        },
      }
    }
  }

  return best ? best.result : null
}
