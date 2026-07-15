import { useEffect, useLayoutEffect, useMemo } from "react"
import { EDGES } from "@/constants"
import { useEdgeGeometryStore } from "@/store/context"
import { IPoint, pointsToSvgPath } from "../edges/Connection"
import {
  LineJumpHit,
  buildPathWithLineJumps,
  computeLineJumpsForEdge,
} from "@/utils/edgeUtils"

/**
 * Publishes this edge's actual rendered (jump-free) polyline to the shared
 * geometry registry so other edges can route and bridge around it at its real
 * position, and removes it on unmount. `points` should be the edge's live render
 * geometry (`renderPoints` for step edges, source/target for straight ones), which
 * its producer already memoizes, so depending on the array directly is stable.
 *
 * Published in a LAYOUT effect, not a passive one, and that timing is load-bearing.
 * Edges route around each other, so a moved node re-routes its edges, whose new
 * routes re-route THEIR neighbours, and so on — a cascade that settles a layer at a
 * time. In a passive effect each layer lands after paint, so the user watches the
 * layout ripple outward and then catch up when the drag stops. A layout effect
 * publishes before paint: React re-renders the affected neighbours synchronously,
 * they re-route and re-publish, and the whole cascade resolves in that one commit —
 * so every painted frame shows the FINAL, converged layout for the current node
 * positions. What you drag is what you get, with no settling afterwards. It
 * terminates because routing yields only to lower-id edges (a DAG) and the store's
 * `samePoints` guard stops each edge once its route is stable; the store's
 * per-frame budget is the backstop if it somehow does not.
 */
export function usePublishEdgeGeometry(
  id: string | undefined,
  points: IPoint[],
  enabled = true
): void {
  const publish = useEdgeGeometryStore((state) => state.publishEdgeGeometry)
  const remove = useEdgeGeometryStore((state) => state.removeEdgeGeometry)

  useLayoutEffect(() => {
    if (id && enabled) publish(id, points)
  }, [id, points, publish, enabled])

  useEffect(() => {
    // When publishing is disabled (central routing owns the geometry map), this
    // edge never wrote an entry, so there is nothing to clean up on unmount.
    if (!enabled) return
    return () => {
      if (id) remove(id)
    }
  }, [id, remove, enabled])
}

/**
 * Returns where this edge should bridge over the edges it crosses, using the
 * stable horizontal-hops-vertical convention (see `computeLineJumpsForEdge`).
 * Other edges' geometry is read from the shared registry (their actual rendered
 * points), so a bridge always centers on the crossing the user sees. Pass
 * `enabled: false` to skip the scan (e.g. while reconnecting).
 *
 * Shared by both `useStepPathEdge` and `useStraightPathEdge`; the only
 * difference between them is the `basePoints` they feed in.
 */
export function useEdgeLineJumps(
  id: string | undefined,
  basePoints: IPoint[],
  enabled: boolean
): LineJumpHit[] {
  const geometryById = useEdgeGeometryStore((state) => state.geometryById)

  return useMemo(() => {
    if (!enabled || !id) return []
    const geometryMap = new Map<string, IPoint[]>(Object.entries(geometryById))
    const edges = Object.keys(geometryById).map((edgeId) => ({ id: edgeId }))
    return computeLineJumpsForEdge(id, basePoints, edges, geometryMap)
  }, [enabled, id, basePoints, geometryById])
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
