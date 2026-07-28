import type { Edge, Node } from "@xyflow/react"
import { LAYOUT_MAX_EDGES, LAYOUT_MAX_NODES } from "./profile"
import type { DiagramLayoutAvailability } from "./types"

export const getVisibleLayoutEdges = (
  nodes: readonly Node[],
  edges: readonly Edge[]
): Edge[] => {
  const visibleIds = new Set(
    nodes.filter((node) => !node.hidden).map((node) => node.id)
  )
  return edges.filter(
    (edge) =>
      !edge.hidden && visibleIds.has(edge.source) && visibleIds.has(edge.target)
  )
}

/**
 * Capability boundary for the first production layout profile.
 *
 * Nested nodes need node-type-specific container padding, resize, lane and
 * handle policies. Until those policies exist, rejecting them is safer than
 * flattening semantic containers or scoring routes against stale handle bounds.
 */
export const getDiagramLayoutAvailability = ({
  nodes,
  edges,
  modifiable = true,
  interactionActive = false,
}: {
  nodes: readonly Node[]
  edges: readonly Edge[]
  modifiable?: boolean
  interactionActive?: boolean
}): DiagramLayoutAvailability => {
  if (!modifiable) return { available: false, reason: "not-modifiable" }
  if (interactionActive)
    return { available: false, reason: "interaction-active" }

  const visibleNodes = nodes.filter((node) => !node.hidden)
  const visibleEdges = getVisibleLayoutEdges(nodes, edges)
  if (visibleNodes.length < 2)
    return { available: false, reason: "not-enough-nodes" }
  if (
    visibleNodes.length > LAYOUT_MAX_NODES ||
    visibleEdges.length > LAYOUT_MAX_EDGES
  )
    return { available: false, reason: "too-large" }
  if (visibleNodes.some((node) => node.parentId))
    return { available: false, reason: "nested-nodes" }
  if (
    visibleNodes.some((node) => {
      const width = node.width ?? node.measured?.width
      const height = node.height ?? node.measured?.height
      return (
        !Number.isFinite(node.position.x) ||
        !Number.isFinite(node.position.y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width! <= 0 ||
        height! <= 0
      )
    })
  )
    return { available: false, reason: "unmeasured-nodes" }
  return { available: true }
}
