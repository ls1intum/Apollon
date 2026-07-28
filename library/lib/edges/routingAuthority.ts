import type { Edge } from "@xyflow/react"
import { isFreeformEdgeAnchor } from "@/utils/edgeUtils"

/**
 * Whether an edge contains user-authored routing authority.
 *
 * This is the shared contract for the edge toolbar and whole-diagram layout.
 */
export const hasManualEdgeRouting = (
  edge: Pick<Edge, "data"> | undefined
): boolean => {
  const points = edge?.data?.points
  return (
    (Array.isArray(points) && points.length > 0) ||
    isFreeformEdgeAnchor(edge?.data?.sourceAnchor) ||
    isFreeformEdgeAnchor(edge?.data?.targetAnchor)
  )
}

/**
 * Return the durable automatic-routing representation of an edge.
 *
 * All unrelated edge data survives. Keeping an explicit empty `points` array
 * matches freshly created automatic orthogonal edges and the edge toolbar's
 * reset command.
 */
export const resetManualEdgeRouting = <T extends Edge>(edge: T): T => {
  if (!hasManualEdgeRouting(edge)) return edge
  const data = { ...(edge.data ?? {}), points: [] } as Record<string, unknown>
  delete data.sourceAnchor
  delete data.targetAnchor
  return { ...edge, data } as T
}
