import type { FreeformEdgeAnchor } from "@/utils/edgeUtils"
import type { IPoint } from "@/edges/Connection"

/**
 * The canonical routing objective, expressed entirely in pixels of travel.
 *
 * Keeping these weights in one public (within the library) value is deliberate:
 * endpoint selection and A* must compare the same objective. A caller may add
 * non-negative endpoint costs, but must not invent a second bend/crossing scale.
 */
export const ROUTING_COST = Object.freeze({
  bendInGridCells: 8,
  edgeCrossing: 400,
  crossingNearCorner: 600,
  crossingCornerClearance: 15,
  parallelCrowdingClearanceInGridCells: 2,
  crowdingPerPx: 3,
  overlapPerPx: 25,
  softCrossingPerPx: 50,
  clearancePerPxAtFullDeficit: 1,
  huggingPerPx: 8,
  // A tiny secondary preference inside bounded channels. It cannot buy even one
  // pixel of detour in ordinary diagrams; it only resolves otherwise equal lanes
  // toward the visual medial axis.
  channelImbalanceTieBreakPerPx: 0.000001,
  // Node-local coordination is guidance, not another hard constraint. Changing
  // side costs less than one bend, so the exact route can overrule an approximate
  // side assignment as soon as it saves a corner or a real conflict.
  preferredSideChangeInGridCells: 7,
  // Holding a coordinated n+1 seat must cover both competing local terms: moving
  // toward the singleton midpoint changes two gaps by d (2d), and can shorten the
  // route by at most d. The cost adds one deterministic unit beyond this exact 3d
  // bound below; side changes retain their separate sub-bend cap.
  preferredPortDisplacementPerPx: 3,
})

export type SideGapBalance = Readonly<{
  cost: number
  maxGapErrorPx: number
  totalGapErrorPx: number
}>

/** Grid-constrained port offsets whose n+1 stretches are as equal as possible.
 * Mirrored pairs share one rounding decision, so half-grid ties cannot bias the
 * complete group toward the positive end of the side. */
export const balancedPortOffsets = (
  count: number,
  sideLength: number,
  gridSize: number
): number[] => {
  if (count <= 0) return []
  const length = Math.max(0, sideLength)
  const grid = Math.max(1, gridSize)
  const result = new Array<number>(count)
  for (let leftIndex = 0; leftIndex < Math.ceil(count / 2); leftIndex++) {
    const rightIndex = count - 1 - leftIndex
    const left = Math.max(
      0,
      Math.min(
        length,
        Math.round((length * (leftIndex + 1)) / (count + 1) / grid) * grid
      )
    )
    result[leftIndex] = left
    if (rightIndex !== leftIndex) result[rightIndex] = length - left
  }
  return result
}

/**
 * Compare the `n + 1` stretches made by `n` ports with the most even placement
 * available on the canvas grid. This sees both defects a centroid misses:
 *
 * - one lone port away from the midpoint makes its two stretches unequal;
 * - a symmetric group can still have unequal outer/inner stretches.
 *
 * The L1 difference between the actual and balanced gap vectors is already in
 * route pixels. Moving a lone port `d` pixels changes both adjacent stretches,
 * so it costs `2d`; that is exactly the visual imbalance being introduced, not
 * an arbitrary multiplier. Sorting makes the result independent of edge order.
 */
export const sideGapBalance = (
  ratios: readonly number[],
  sideLength: number,
  gridSize: number
): SideGapBalance => {
  const length = Math.max(0, sideLength)
  const grid = Math.max(1, gridSize)
  if (ratios.length === 0 || length === 0)
    return { cost: 0, maxGapErrorPx: 0, totalGapErrorPx: 0 }

  const snap = (value: number): number =>
    Math.max(0, Math.min(length, Math.round(value / grid) * grid))
  const positions = ratios
    .map((ratio) => snap(Math.max(0, Math.min(1, ratio)) * length))
    .sort((a, b) => a - b)
  const balanced = balancedPortOffsets(ratios.length, length, grid)
  const gaps = (values: readonly number[]): number[] => [
    values[0],
    ...values.slice(1).map((value, index) => value - values[index]),
    length - values[values.length - 1],
  ]
  const actualGaps = gaps(positions)
  const balancedGaps = gaps(balanced)
  const errors = actualGaps.map((gap, index) =>
    Math.abs(gap - balancedGaps[index])
  )
  const totalGapErrorPx = errors.reduce((sum, error) => sum + error, 0)
  const maxGapErrorPx = Math.max(...errors)
  return {
    cost: Math.round(totalGapErrorPx),
    maxGapErrorPx,
    totalGapErrorPx,
  }
}

/** Cost of the two side stretches created by one freely-selected port. */
export const endpointPlacementCost = (
  anchor: FreeformEdgeAnchor,
  sideLength: number,
  gridSize: number
): number => sideGapBalance([anchor.ratio], sideLength, gridSize).cost

/** Cost of departing from a node-local side/seat proposal. A side change stays
 * below one bend because the approximate side pass is soft. Along the same side,
 * displacement is uncapped: it must preserve the shared gap seat against both the
 * singleton midpoint regularizer and ordinary path-length savings. */
export const endpointPreferenceCost = (
  anchor: FreeformEdgeAnchor,
  preferred: FreeformEdgeAnchor | undefined,
  sideLength: number,
  gridSize: number
): number => {
  if (!preferred) return 0
  const maximum = Math.max(
    0,
    ROUTING_COST.preferredSideChangeInGridCells * gridSize
  )
  if (anchor.side !== preferred.side) return maximum
  const displacement = Math.round(
    Math.abs(anchor.ratio - preferred.ratio) *
      Math.max(0, sideLength) *
      ROUTING_COST.preferredPortDisplacementPerPx
  )
  return displacement === 0 ? 0 : displacement + 1
}

export type WeightedRoutingMetrics = {
  lengthPx?: number
  bends?: number
  crossings?: number
  overlapPx?: number
  crowdingPx?: number
}

/** The shared additive path objective. Keeping the arithmetic here prevents
 * side assignment, dense fallbacks and whole-route refinement from silently
 * translating a crossing or a crowded run onto a different scale. */
export const weightedRoutingCost = (
  metrics: WeightedRoutingMetrics,
  gridSize: number
): number =>
  (metrics.lengthPx ?? 0) +
  (metrics.bends ?? 0) * ROUTING_COST.bendInGridCells * gridSize +
  (metrics.crossings ?? 0) * ROUTING_COST.edgeCrossing +
  (metrics.overlapPx ?? 0) * ROUTING_COST.overlapPerPx +
  (metrics.crowdingPx ?? 0) * ROUTING_COST.crowdingPerPx

export type PolylineConflictCost = {
  crossings: number
  overlapPx: number
  crowdingPx: number
  cost: number
}

type Segment = { a: IPoint; b: IPoint }

const segmentsOf = (polyline: readonly IPoint[]): Segment[] =>
  polyline.slice(1).flatMap((point, index) => {
    const previous = polyline[index]
    return point.x === previous.x && point.y === previous.y
      ? []
      : [{ a: previous, b: point }]
  })

const cross = (a: IPoint, b: IPoint, c: IPoint): number =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

/** Strict interior crossing. Endpoint touches are attachment/junction geometry,
 * not open-canvas crossings. This works for arbitrary segment slopes. */
const segmentsCrossOpen = (left: Segment, right: Segment): boolean => {
  const l1 = cross(left.a, left.b, right.a)
  const l2 = cross(left.a, left.b, right.b)
  const r1 = cross(right.a, right.b, left.a)
  const r2 = cross(right.a, right.b, left.b)
  return l1 * l2 < 0 && r1 * r2 < 0
}

/** Parallel overlap and line gap measured on the segment's dominant axis. It is
 * an exact, deterministic L-infinity estimate: no `hypot`/`atan2` enters a route
 * decision, yet diagonal authored lines still reserve visible crowding space. */
const parallelOverlap = (
  left: Segment,
  right: Segment
): { overlap: number; gap: number } | null => {
  const ldx = left.b.x - left.a.x
  const ldy = left.b.y - left.a.y
  const rdx = right.b.x - right.a.x
  const rdy = right.b.y - right.a.y
  if (ldx * rdy - ldy * rdx !== 0) return null

  const useX = Math.abs(ldx) >= Math.abs(ldy)
  const leftLo = Math.min(
    useX ? left.a.x : left.a.y,
    useX ? left.b.x : left.b.y
  )
  const leftHi = Math.max(
    useX ? left.a.x : left.a.y,
    useX ? left.b.x : left.b.y
  )
  const rightLo = Math.min(
    useX ? right.a.x : right.a.y,
    useX ? right.b.x : right.b.y
  )
  const rightHi = Math.max(
    useX ? right.a.x : right.a.y,
    useX ? right.b.x : right.b.y
  )
  const overlap = Math.min(leftHi, rightHi) - Math.max(leftLo, rightLo)
  if (overlap <= 0) return null
  const dominantLength = Math.max(Math.abs(ldx), Math.abs(ldy))
  if (dominantLength === 0) return null
  const gap = Math.abs(cross(left.a, left.b, right.a)) / dominantLength
  return { overlap, gap }
}

const coordinateAt = (
  segment: Segment,
  primary: "x" | "y",
  at: number
): number => {
  const primaryStart = segment.a[primary]
  const primaryDelta = segment.b[primary] - primaryStart
  const secondary = primary === "x" ? "y" : "x"
  return (
    segment.a[secondary] +
    ((at - primaryStart) / primaryDelta) *
      (segment.b[secondary] - segment.a[secondary])
  )
}

/** Weighted span for two non-crossing segments that remain inside the visible
 * crowding band. Parameterising both lines on a shared axis makes the gap linear,
 * so the clipped triangular/trapezoidal deficit is exact without sampling or
 * engine-dependent trigonometry. */
export const segmentCrowdingPx = (
  leftA: IPoint,
  leftB: IPoint,
  rightA: IPoint,
  rightB: IPoint,
  clearancePx: number
): number => {
  if (clearancePx <= 0) return 0
  const left = { a: leftA, b: leftB }
  const right = { a: rightA, b: rightB }
  if (segmentsCrossOpen(left, right)) return 0

  const ldx = leftB.x - leftA.x
  const ldy = leftB.y - leftA.y
  const rdx = rightB.x - rightA.x
  const rdy = rightB.y - rightA.y
  const canUseX = ldx !== 0 && rdx !== 0
  const canUseY = ldy !== 0 && rdy !== 0
  if (!canUseX && !canUseY) return 0
  const primary: "x" | "y" =
    canUseX &&
    (!canUseY ||
      Math.min(Math.abs(ldx), Math.abs(rdx)) >=
        Math.min(Math.abs(ldy), Math.abs(rdy)))
      ? "x"
      : "y"
  const lo = Math.max(
    Math.min(leftA[primary], leftB[primary]),
    Math.min(rightA[primary], rightB[primary])
  )
  const hi = Math.min(
    Math.max(leftA[primary], leftB[primary]),
    Math.max(rightA[primary], rightB[primary])
  )
  const span = hi - lo
  if (span <= 0) return 0

  const d0 = coordinateAt(left, primary, lo) - coordinateAt(right, primary, lo)
  const d1 = coordinateAt(left, primary, hi) - coordinateAt(right, primary, hi)
  // A sign change is a crossing (or an endpoint touch), not a parallel smudge.
  if (d0 * d1 <= 0) return 0
  const gap0 = Math.abs(d0)
  const gap1 = Math.abs(d1)
  if (gap0 >= clearancePx && gap1 >= clearancePx) return 0
  if (gap0 < clearancePx && gap1 < clearancePx)
    return (span * (clearancePx - (gap0 + gap1) / 2)) / clearancePx

  const lowGap = Math.min(gap0, gap1)
  const highGap = Math.max(gap0, gap1)
  const crowdedFraction = (clearancePx - lowGap) / (highGap - lowGap)
  return (span * crowdedFraction * (clearancePx - lowGap)) / (2 * clearancePx)
}

/** General polyline conflict estimate used outside the router's optimized H/V
 * index. In particular, straight-hook and legacy customized segments may be
 * diagonal; they must still influence side choice and fallback ranking. */
export const polylineConflictCost = (
  route: readonly IPoint[],
  neighbors: readonly (readonly IPoint[])[],
  crowdingClearancePx: number
): PolylineConflictCost => {
  let crossings = 0
  let overlapPx = 0
  let crowdingPx = 0
  const routeSegments = segmentsOf(route)
  for (const neighbor of neighbors) {
    const neighborSegments = segmentsOf(neighbor)
    for (const left of routeSegments) {
      for (const right of neighborSegments) {
        const parallel = parallelOverlap(left, right)
        if (parallel) {
          if (parallel.gap === 0) overlapPx += parallel.overlap
          else if (parallel.gap < crowdingClearancePx)
            crowdingPx +=
              (parallel.overlap * (crowdingClearancePx - parallel.gap)) /
              crowdingClearancePx
          continue
        }
        if (segmentsCrossOpen(left, right)) crossings++
        else
          crowdingPx += segmentCrowdingPx(
            left.a,
            left.b,
            right.a,
            right.b,
            crowdingClearancePx
          )
      }
    }
  }
  overlapPx = Math.round(overlapPx)
  crowdingPx = Math.round(crowdingPx)
  return {
    crossings,
    overlapPx,
    crowdingPx,
    cost: weightedRoutingCost({ crossings, overlapPx, crowdingPx }, 1),
  }
}

/** Validate a terminal cost before it enters A*. Invalid costs would poison the
 * heap ordering and can otherwise turn an unreachable candidate into a winner. */
export const validateEndpointCost = (cost: number | undefined): number => {
  const value = cost ?? 0
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError("Route endpoint cost must be finite and non-negative")
  return value
}
