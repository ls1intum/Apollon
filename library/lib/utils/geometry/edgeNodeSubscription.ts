import type { InternalNode, Node } from "@xyflow/react"
import type { EdgeGeometryNodeSnapshot } from "./edgeGeometryPreview"
import { isRoutingParentNodeType } from "./nodeGeometry"

const NO_EDGE_NODE_SUBSCRIPTION: readonly Node[] = []

/**
 * Auto edges receive their displayed route from the central geometry store, so
 * they must not re-render merely because an unrelated node changed. A freeform
 * endpoint is different: its pinned point is derived from live node geometry.
 */
export const selectEdgeNodeSubscription = (
  nodes: readonly Node[],
  subscribe: boolean
): readonly Node[] => (subscribe ? nodes : NO_EDGE_NODE_SUBSCRIPTION)

/**
 * Not subscribing is not the same as discarding node context. When an auto edge
 * legitimately renders (its own RF endpoints or central route changed), read a
 * current non-reactive snapshot for nested endpoint math and label avoidance.
 */
export const resolveEdgeGeometryNodes = (
  subscribedNodes: readonly Node[],
  getNodes: () => Node[],
  subscribed: boolean
): readonly Node[] => (subscribed ? subscribedNodes : getNodes())

export type EdgeLabelQueryBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * A flat primitive signature lets Zustand's shallow comparator wake an edge only
 * when a node relevant to its label actually enters, leaves, or moves inside the
 * label corridor. Absolute RF positions preserve nesting without a whole-node
 * array subscription.
 */
export const selectNearbyLabelNodeGeometry = (
  nodeLookup: ReadonlyMap<string, InternalNode>,
  edgeBounds: EdgeLabelQueryBounds,
  reach: number,
  isContainer: (type?: string) => boolean
): number[] => {
  const left = edgeBounds.minX - reach
  const top = edgeBounds.minY - reach
  const right = edgeBounds.maxX + reach
  const bottom = edgeBounds.maxY + reach
  const geometry: number[] = []

  for (const node of nodeLookup.values()) {
    const width = node.measured?.width ?? node.width ?? 0
    const height = node.measured?.height ?? node.height ?? 0
    if (!width || !height || isContainer(node.type)) continue
    const { x, y } = node.internals.positionAbsolute
    if (x < right && x + width > left && y < bottom && y + height > top)
      geometry.push(x, y, width, height)
  }
  return geometry
}

export const selectNearbySettledNodeGeometry = (
  nodes: EdgeGeometryNodeSnapshot,
  edgeBounds: EdgeLabelQueryBounds,
  reach: number
): number[] => {
  const left = edgeBounds.minX - reach
  const top = edgeBounds.minY - reach
  const right = edgeBounds.maxX + reach
  const bottom = edgeBounds.maxY + reach
  const geometry: number[] = []

  for (const node of nodes.values()) {
    if (!node.width || !node.height || isRoutingParentNodeType(node.type))
      continue
    if (
      node.x < right &&
      node.x + node.width > left &&
      node.y < bottom &&
      node.y + node.height > top
    )
      geometry.push(node.x, node.y, node.width, node.height)
  }
  return geometry
}

/** Memoize the spatial scan by accepted node-generation identity. Preview
 * writes keep that identity stable, so every edge selector returns in O(1). */
export const createNearbySettledNodeGeometrySelector = (
  edgeBounds: EdgeLabelQueryBounds,
  reach: number
): ((nodes: EdgeGeometryNodeSnapshot) => number[]) => {
  let previousNodes: EdgeGeometryNodeSnapshot | undefined
  let previousSelection: number[] = []
  return (nodes) => {
    if (nodes === previousNodes) return previousSelection
    previousNodes = nodes
    previousSelection = selectNearbySettledNodeGeometry(
      nodes,
      edgeBounds,
      reach
    )
    return previousSelection
  }
}
