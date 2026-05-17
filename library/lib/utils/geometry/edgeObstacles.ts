import type { BBox } from "./OrthogonalVisibilityGraph"

type NodeLike = {
  id: string
  parentId?: string | null
  position: { x: number; y: number }
  width?: number | null
  height?: number | null
  measured?: { width?: number | null; height?: number | null }
}

/**
 * Walks the parent chain summing positions so the result is in canvas
 * absolute coordinates, not local-to-parent. Mirrors getPositionOnCanvas
 * in utils/nodeUtils but tolerates the NodeLike shape used here.
 */
function absolutePosition(
  node: NodeLike,
  byId: Map<string, NodeLike>
): { x: number; y: number } {
  let x = node.position.x
  let y = node.position.y
  let parent = node.parentId ? byId.get(node.parentId) : undefined
  while (parent) {
    x += parent.position.x
    y += parent.position.y
    parent = parent.parentId ? byId.get(parent.parentId) : undefined
  }
  return { x, y }
}

export type EdgeObstacleSet = {
  obstacles: BBox[]
  /** Parallel to `obstacles`; entries left undefined use the default OVG padding. */
  paddings: Array<number | undefined>
}

/**
 * Produces the obstacle list and per-obstacle padding overrides for a
 * single edge's routing query.
 *
 * Source and target nodes are excluded entirely so their bounding boxes
 * cannot trap the route endpoints. The source/target's ancestors (parent
 * groups, etc.) are also excluded so the route can leave its enclosing
 * container. Any remaining group/container node that has at least one
 * child gets zero padding so its bounding box does not inflate over its
 * own inner nodes.
 */
export function buildEdgeObstacleSet(
  nodes: NodeLike[],
  sourceNodeId: string | null | undefined,
  targetNodeId: string | null | undefined
): EdgeObstacleSet {
  // Identify container nodes (anyone who is referenced as a parent).
  const parentIds = new Set<string>()
  for (const n of nodes) {
    if (n.parentId) parentIds.add(n.parentId)
  }

  // Collect ancestor IDs so a route can leave its source/target's parent group.
  const byId = new Map<string, NodeLike>()
  for (const n of nodes) byId.set(n.id, n)
  const excluded = new Set<string>()
  for (const id of [sourceNodeId, targetNodeId]) {
    let cur = id ? byId.get(id) : undefined
    while (cur) {
      excluded.add(cur.id)
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
  }

  const obstacles: BBox[] = []
  const paddings: Array<number | undefined> = []

  for (const n of nodes) {
    if (excluded.has(n.id)) continue
    const width = n.measured?.width ?? n.width ?? 0
    const height = n.measured?.height ?? n.height ?? 0
    if (width <= 0 || height <= 0) continue
    // Use canvas-absolute coordinates: child nodes inside a parent/group
    // store local-to-parent positions, but the router and the route itself
    // live in canvas space. Mixing the two would place phantom obstacles
    // or route through real ones.
    const { x, y } = absolutePosition(n, byId)
    obstacles.push({ x, y, width, height })
    // Container nodes hold other obstacles inside them — padding would
    // overlap their own children. Zero padding lets the route enter the
    // container only if the inner nodes themselves leave a corridor.
    paddings.push(parentIds.has(n.id) ? 0 : undefined)
  }

  return { obstacles, paddings }
}
