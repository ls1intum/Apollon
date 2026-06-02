import { useMemo } from "react"
import { useShallow } from "zustand/shallow"
import { EDGES } from "@/constants"
import { useDiagramStore } from "@/store/context"
import { IPoint, pointsToSvgPath } from "../edges/Connection"
import {
  LineJumpHit,
  buildPathWithLineJumps,
  findLineJumpIntersections,
  getAxisAlignedSegments,
  getEdgeGeometryMap,
} from "@/utils/edgeUtils"

const pointsKey = (points: IPoint[]): string =>
  points.map((point) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`).join("|")

/**
 * Finds where this edge crosses the edges painted beneath it and returns the
 * crossing points so the renderer can bridge over them. "Beneath" is the
 * store's edge order: edges earlier in the array paint first, so only the
 * later (upper) edge of a crossing pair draws a bridge — exactly one arc per
 * crossing. Pass `enabled: false` to skip the scan entirely (e.g. mid-drag or
 * while reconnecting), keeping the quadratic pairwise work off hot paths.
 *
 * Shared by both `useStepPathEdge` and `useStraightPathEdge`; the only
 * difference between them is the `basePoints` they feed in.
 */
export function useEdgeLineJumps(
  id: string | undefined,
  basePoints: IPoint[],
  enabled: boolean
): LineJumpHit[] {
  const { edges, nodes } = useDiagramStore(
    useShallow((state) => ({ edges: state.edges, nodes: state.nodes }))
  )
  const edgeGeometryMap = useMemo(
    () => getEdgeGeometryMap(edges, nodes),
    [edges, nodes]
  )
  const baseKey = pointsKey(basePoints)

  return useMemo(() => {
    if (!enabled || !id) return []

    const currentIndex = edges.findIndex((edge) => edge.id === id)
    if (currentIndex <= 0) return []

    const baseSegments = getAxisAlignedSegments(basePoints)
    if (baseSegments.length === 0) return []

    const hits: LineJumpHit[] = []
    for (let i = 0; i < currentIndex; i += 1) {
      const otherPoints = edgeGeometryMap.get(edges[i].id)
      if (!otherPoints || otherPoints.length < 2) continue
      hits.push(
        ...findLineJumpIntersections(
          baseSegments,
          getAxisAlignedSegments(otherPoints),
          EDGES.EDGE_LINE_JUMP_WIDTH,
          "any"
        )
      )
    }
    return hits
    // basePoints is captured via the stable baseKey string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, id, baseKey, edges, edgeGeometryMap])
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
