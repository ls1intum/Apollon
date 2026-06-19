import { useEffect, useMemo } from "react"
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
 * geometry registry so other edges can bridge over it at its real position,
 * and removes it on unmount. `points` should be the edge's live render
 * geometry (`renderPoints` for step edges, source/target for straight ones),
 * which its producer already memoizes, so depending on the array directly is
 * stable — no hashing needed.
 */
export function usePublishEdgeGeometry(
  id: string | undefined,
  points: IPoint[]
): void {
  const publish = useEdgeGeometryStore((state) => state.publishEdgeGeometry)
  const remove = useEdgeGeometryStore((state) => state.removeEdgeGeometry)

  useEffect(() => {
    if (id) publish(id, points)
  }, [id, points, publish])

  useEffect(() => {
    return () => {
      if (id) remove(id)
    }
  }, [id, remove])
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
