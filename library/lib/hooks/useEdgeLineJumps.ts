import { useMemo } from "react"
import { useShallow } from "zustand/shallow"
import { EDGES } from "@/constants"
import { useDiagramStore } from "@/store/context"
import { IPoint, pointsToSvgPath } from "../edges/Connection"
import {
  LineJumpHit,
  buildPathWithLineJumps,
  computeLineJumpsForEdge,
  getEdgeGeometryMap,
} from "@/utils/edgeUtils"

const pointsKey = (points: IPoint[]): string =>
  points.map((point) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`).join("|")

/**
 * Returns where this edge should bridge over the edges it crosses, using the
 * stable horizontal-hops-vertical convention (see `computeLineJumpsForEdge`).
 * Pass `enabled: false` to skip the scan entirely (e.g. mid-drag or while
 * reconnecting), keeping the quadratic pairwise work off hot paths.
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
    return computeLineJumpsForEdge(id, basePoints, edges, edgeGeometryMap)
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
