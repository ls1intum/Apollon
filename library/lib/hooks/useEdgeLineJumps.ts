import { useMemo } from "react"
import { useShallow } from "zustand/shallow"
import { EDGES } from "@/constants"
import { useEdgeGeometryStore } from "@/store/context"
import { IPoint, pointsToSvgPath } from "../edges/Connection"
import {
  LineJumpHit,
  buildPathWithLineJumps,
  computeLineJumpsForEdge,
} from "@/utils/edgeUtils"
import {
  createDisplayedRouteEntriesSelector,
  polylineBounds,
  selectedRoutesToRecord,
} from "@/utils/geometry/edgeGeometrySubscriptions"

/**
 * Returns where this edge should bridge over the edges it crosses, using the
 * stable horizontal-hops-vertical convention (see `computeLineJumpsForEdge`).
 * Other edges come from the same displayed snapshot as `basePoints`: preview
 * when present, otherwise accepted. Keeping both sides of a crossing on one
 * snapshot prevents floating bridge arcs during both interaction and
 * settlement. Pass `enabled: false` to skip the scan.
 *
 * Shared by both `useStepPathEdge` and `useStraightPathEdge`; the only
 * difference between them is the `basePoints` they feed in.
 */
export function useEdgeLineJumps(
  id: string | undefined,
  basePoints: IPoint[],
  enabled: boolean
): LineJumpHit[] {
  const baseBounds = useMemo(() => polylineBounds(basePoints), [basePoints])
  const selectIntersectingRoutes = useMemo(
    () => createDisplayedRouteEntriesSelector(baseBounds, id),
    [baseBounds, id]
  )
  // A true segment crossing requires the two route bounding boxes to intersect.
  // Subscribe only to those possible crossers: changing a far route leaves this
  // shallow selector equal, while a route entering/leaving the bounds or changing
  // inside them still re-runs the exact line-jump computation below.
  const selectedRouteEntries = useEdgeGeometryStore(
    useShallow((state) =>
      enabled && id
        ? selectIntersectingRoutes(state.geometryById, state.previewById)
        : []
    )
  )

  return useMemo(() => {
    if (!enabled || !id) return []
    const geometryById = selectedRoutesToRecord(selectedRouteEntries)
    const geometryMap = new Map<string, IPoint[]>(Object.entries(geometryById))
    const edges = Object.keys(geometryById).map((edgeId) => ({ id: edgeId }))
    return computeLineJumpsForEdge(id, basePoints, edges, geometryMap)
  }, [enabled, id, basePoints, selectedRouteEntries])
}

/**
 * Builds the SVG path for an edge, drawing bridge arcs at the given crossings.
 * Falls back to a plain polyline when there are no jumps.
 */
export function buildEdgePath(
  points: IPoint[],
  lineJumps: LineJumpHit[]
): string {
  if (lineJumps.length === 0) return pointsToSvgPath(points)

  // Different "other" edges can report the same crossing; collapse duplicates
  // (by segment + whole-pixel point) so only one arc is drawn per crossing.
  const seen = new Set<string>()
  const uniqueJumps = lineJumps.filter((jump) => {
    const key = `${jump.segmentIndex}:${Math.round(jump.point.x)}:${Math.round(
      jump.point.y
    )}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return buildPathWithLineJumps(
    points,
    uniqueJumps,
    EDGES.EDGE_LINE_JUMP_HEIGHT,
    EDGES.EDGE_LINE_JUMP_WIDTH
  )
}
