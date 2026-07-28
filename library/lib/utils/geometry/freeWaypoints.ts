/**
 * Free-2D waypoint geometry for straight (diagonal) edges.
 *
 * Unlike the orthogonal `bendHandles.ts` (H/V staircase jogs), a straight-hook
 * edge bends at arbitrary 2D points. Following the JointJS "vertices" model, the
 * persisted `data.points` for these edges holds INTERIOR waypoints ONLY; the
 * rendered route is `[source, ...interior, target]`. This module owns the pure,
 * deterministic math for editing that interior list.
 *
 * These are document data (authored, persisted), not memoryless auto-geometry, so
 * they need not be byte-identical across engines — but we still keep the math
 * integer/grid-snapped and use integer cross-products (never `atan2`) to match the
 * rest of the geometry kernel and to snap cleanly onto the canvas grid.
 */
import { IPoint } from "@/edges/Connection"
import { EDGES } from "@/utils/geometry/routingConstants"

export interface SegmentGhostHandle {
  /** Index of the route segment this ghost sits on: route[i] → route[i+1]. */
  segmentIndex: number
  /** Integer midpoint of the segment. */
  position: IPoint
  /** Squared length of the segment, so the renderer can hide a ghost on a stub. */
  segmentLengthSq: number
}

const snap = (value: number, grid: number): number =>
  grid > 0 ? Math.round(value / grid) * grid : Math.round(value)

/** Snap a free 2D point to the bend grid. */
export const snapPoint = (
  point: IPoint,
  grid: number = EDGES.BEND_SNAP_GRID_PX
): IPoint => ({ x: snap(point.x, grid), y: snap(point.y, grid) })

/**
 * A faint ghost handle at the midpoint of every route segment. Dragging one past
 * `exceedsDragThreshold` materialises a new interior waypoint (see `insertWaypoint`).
 * Segments shorter than `WAYPOINT_GHOST_MIN_SEGMENT_PX` are skipped so a ghost never
 * fuses with an endpoint or an adjacent waypoint handle.
 */
export const getSegmentGhostHandles = (
  route: readonly IPoint[]
): SegmentGhostHandle[] => {
  const handles: SegmentGhostHandle[] = []
  const minLenSq =
    EDGES.WAYPOINT_GHOST_MIN_SEGMENT_PX * EDGES.WAYPOINT_GHOST_MIN_SEGMENT_PX
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i]
    const b = route[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lengthSq = dx * dx + dy * dy
    if (lengthSq < minLenSq) continue
    handles.push({
      segmentIndex: i,
      position: {
        x: Math.round((a.x + b.x) / 2),
        y: Math.round((a.y + b.y) / 2),
      },
      segmentLengthSq: lengthSq,
    })
  }
  return handles
}

/**
 * Materialise a new interior waypoint on route segment `segmentIndex`. Because the
 * route is `[source, ...interior, target]`, segment `i` lies between `route[i]` and
 * `route[i+1]`, so the new interior index is exactly `segmentIndex` (segment 0 →
 * before the current first interior point; the last segment → appended).
 */
export const insertWaypoint = (
  interior: readonly IPoint[],
  segmentIndex: number,
  point: IPoint,
  grid: number = EDGES.BEND_SNAP_GRID_PX
): IPoint[] => {
  const index = Math.max(0, Math.min(segmentIndex, interior.length))
  const next = interior.slice()
  next.splice(index, 0, snapPoint(point, grid))
  return next
}

/** Move interior waypoint `index` to a new (snapped) 2D point. */
export const moveWaypoint = (
  interior: readonly IPoint[],
  index: number,
  point: IPoint,
  grid: number = EDGES.BEND_SNAP_GRID_PX
): IPoint[] => {
  if (index < 0 || index >= interior.length) return interior.slice()
  const next = interior.slice()
  next[index] = snapPoint(point, grid)
  return next
}

/**
 * Shift-drag angle lock, matching the 15° increments used by established canvas
 * editors. `reference` remains the stable pivot for the whole gesture.
 */
export const snapPointToAngle = (
  point: IPoint,
  reference: IPoint,
  divisions: number = 24
): IPoint => {
  const dx = point.x - reference.x
  const dy = point.y - reference.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  if (distance === 0 || divisions <= 0) return { ...reference }
  const increment = (Math.PI * 2) / divisions
  const angle = Math.round(Math.atan2(dy, dx) / increment) * increment
  return {
    x: Math.round(reference.x + Math.cos(angle) * distance),
    y: Math.round(reference.y + Math.sin(angle) * distance),
  }
}

/**
 * Whether moving route vertex `routeIndex` to `point` would put it inside the
 * magnetic straightening band around the finite chord between its neighbours.
 * Projection is clamped to the segment so pulling beyond an endpoint cannot
 * unexpectedly remove the waypoint.
 */
export const isWaypointCollapseCandidate = (
  route: readonly IPoint[],
  routeIndex: number,
  point: IPoint,
  tolerancePx: number
): boolean => {
  if (routeIndex <= 0 || routeIndex >= route.length - 1) return false
  const before = route[routeIndex - 1]
  const after = route[routeIndex + 1]
  const dx = after.x - before.x
  const dy = after.y - before.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return true
  const projection =
    ((point.x - before.x) * dx + (point.y - before.y) * dy) / lengthSq
  if (projection < 0 || projection > 1) return false
  const distanceX = point.x - (before.x + projection * dx)
  const distanceY = point.y - (before.y + projection * dy)
  return (
    distanceX * distanceX + distanceY * distanceY <= tolerancePx * tolerancePx
  )
}

/** Remove interior waypoint `index`. */
export const removeWaypoint = (
  interior: readonly IPoint[],
  index: number
): IPoint[] => {
  if (index < 0 || index >= interior.length) return interior.slice()
  const next = interior.slice()
  next.splice(index, 1)
  return next
}

/**
 * Continuous redundancy removal: drop any interior waypoint whose perpendicular
 * distance from the line through its two route-neighbours is within tolerance
 * (near-collinear). Uses an integer cross-product — no `atan2`/`hypot`: a point `c`
 * is collinear with `a`,`b` when `cross(a,b,c)² <= tol² · |b-a|²`.
 *
 * Takes the full route `[source, ...interior, target]` so terminal waypoints are
 * measured against the fixed endpoints; returns the pruned interior list.
 */
export const pruneCollinearWaypoints = (
  route: readonly IPoint[],
  tolerancePx: number = EDGES.WAYPOINT_COLLINEAR_TOLERANCE_PX
): IPoint[] => {
  if (route.length <= 2) return []
  const tolSq = tolerancePx * tolerancePx
  const kept: IPoint[] = [route[0]]
  for (let i = 1; i < route.length - 1; i++) {
    const a = kept[kept.length - 1]
    const b = route[i]
    const c = route[i + 1]
    const abx = c.x - a.x
    const aby = c.y - a.y
    const spanSq = abx * abx + aby * aby
    const cross = (b.x - a.x) * aby - (b.y - a.y) * abx
    // Collinear (or a as good as on the a→c line): drop b. spanSq === 0 means the
    // two neighbours coincide, so b is redundant regardless.
    if (spanSq === 0 || cross * cross <= tolSq * spanSq) continue
    kept.push(b)
  }
  // `kept` currently begins with the source; interior is everything after it.
  return kept.slice(1)
}

/** Did the pointer travel far enough from a grabbed ghost to materialise a bend? */
export const exceedsDragThreshold = (
  from: IPoint,
  to: IPoint,
  thresholdPx: number = EDGES.WAYPOINT_DRAG_THRESHOLD_PX
): boolean => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return dx * dx + dy * dy > thresholdPx * thresholdPx
}
