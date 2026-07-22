import type { Node, Rect } from "@xyflow/react"
import { EDGES } from "@/constants"
import { getPositionOnCanvas, isParentNodeType } from "@/utils/nodeUtils"
import type { IPoint } from "@/edges/Connection"

/**
 * A node body the router should try not to route through, in absolute flow
 * space.
 *
 * `soft` marks a container (package, BPMN pool, swimlane) that edges legitimately
 * live inside — a diagram whose nodes all sit in one pool would be unroutable if
 * the pool were solid — so the router prefers to avoid it but may cross it; a
 * solid obstacle it refuses to cross.
 */
export type ObstacleRect = {
  id: string
  x: number
  y: number
  width: number
  height: number
  soft: boolean
}

const contains = (rect: ObstacleRect, point: IPoint): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height

/** Every ancestor id of `node`, walking `parentId` to the root. */
const getAncestorIds = (node: Node, byId: Map<string, Node>): Set<string> => {
  const ancestors = new Set<string>()
  let current = node.parentId ? byId.get(node.parentId) : undefined
  while (current && !ancestors.has(current.id)) {
    ancestors.add(current.id)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return ancestors
}

const nodeSize = (node: Node): { width: number; height: number } => ({
  width: node.width ?? node.measured?.width ?? 0,
  height: node.height ?? node.measured?.height ?? 0,
})

/**
 * The borders of the containers this edge lives inside, as closed polylines.
 *
 * An edge from a class inside a package must CROSS that package to get out, so the
 * package can never be an obstacle — but it must not run ALONG the border either.
 * The border is handed over as one more line not to lie on: crossing it stays
 * cheap, tracing it does not.
 */
export const getContainerBorderPolylines = (
  nodes: readonly Node[],
  sourceId: string,
  targetId: string,
  nodeIndex: NodeIndex = createNodeIndex(nodes)
): IPoint[][] => {
  const { byId, entries } = nodeIndex
  const containers = new Set<string>()
  for (const endpoint of [sourceId, targetId]) {
    const node = byId.get(endpoint)
    if (!node) continue
    for (const id of getAncestorIds(node, byId)) containers.add(id)
  }

  const borders: IPoint[][] = []
  for (const id of containers) {
    const entry = entries.get(id)
    if (!entry) continue
    const { x, y, width, height } = entry.body
    borders.push([
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
      { x, y },
    ])
  }
  return borders
}

/**
 * The nodes indexed for one render frame: id → node, and id → its absolute body
 * and ancestor set. Body geometry and ancestry depend only on the node set, not on
 * which edge is routed, so computing them per edge is O(edges × nodes) of waste.
 *
 * A frame's edges all read the same `nodes` array, so the central solver creates this
 * index once instead of paying O(edges × nodes). Its lifetime must stay explicit:
 * React Flow mutates node objects in place and can retain the array reference while
 * measuring. A module-level identity cache therefore lets a node that was unmeasured
 * on the first pass stay missing after it measures, and edges route through stale
 * geometry.
 *
 * The bodies handed out are SHARED, read-only; the one place a body is altered (an
 * endpoint's soft→solid) takes a copy.
 */
type NodeEntry = { body: ObstacleRect; ancestors: Set<string> }
export type NodeIndex = {
  byId: Map<string, Node>
  entries: Map<string, NodeEntry>
}

/**
 * Snapshot the node facts obstacle queries share during one synchronous solve.
 *
 * The lifetime is deliberately explicit. React Flow may mutate node geometry and
 * measurement in place while retaining the `nodes` array identity, so a module-level
 * identity cache can return an index from an older render. The central solver creates
 * exactly one snapshot per invocation and passes it to every edge query. Standalone
 * callers that omit the optional index receive a fresh, exact snapshot per call.
 */
export const createNodeIndex = (nodes: readonly Node[]): NodeIndex => {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const entries = new Map<string, NodeEntry>()
  for (const node of nodes) {
    if (node.hidden) continue
    const { width, height } = nodeSize(node)
    if (!width || !height) continue
    const { x, y } = getPositionOnCanvas(node, nodes as Node[])
    entries.set(node.id, {
      body: {
        id: node.id,
        x,
        y,
        width,
        height,
        // A container is soft: an edge may cut through a package it is not part of
        // when going around would mean circling the diagram.
        soft: isParentNodeType(node.type),
      },
      ancestors: getAncestorIds(node, byId),
    })
  }

  return { byId, entries }
}

/**
 * The nodes an edge from `sourceId` to `targetId` should route around.
 *
 * Solid means the node and nothing but the node: every leaf body is handed over
 * exactly, with no inflated ring. Clearance is not geometry here — the router
 * prices it (see `CLEARANCE_COST_PER_PX_AT_FULL_DEFICIT` in `orthogonalRouter`).
 *
 * Nesting decides WHICH nodes are solid, and each rule is load-bearing:
 * - Every ANCESTOR of either endpoint is skipped: the edge lives inside it (covers
 *   packages, pools, swimlanes, subsystems, deployment nodes at any depth).
 * - Every DESCENDANT of either endpoint is skipped: a child can never legitimately
 *   be in the way of an edge anchored on its container's border.
 * - An endpoint that ENCLOSES the other is not made solid: the route must reach
 *   inside it.
 * - Anything already overlapping an endpoint is skipped: it makes the problem
 *   unsolvable.
 */
export const getEdgeObstacles = (
  nodes: readonly Node[],
  sourceId: string,
  targetId: string,
  sourcePoint: IPoint,
  targetPoint: IPoint,
  nodeIndex: NodeIndex = createNodeIndex(nodes),
  /** Union of every endpoint candidate. When omitted, the two resolved points
   * retain the classic fixed-end corridor. */
  candidateBounds?: Rect
): ObstacleRect[] => {
  const { byId, entries } = nodeIndex
  const source = byId.get(sourceId)
  const target = byId.get(targetId)

  // Ancestors of either endpoint are the containers the edge lives inside; they
  // are never obstacles.
  const excluded = new Set<string>()
  if (source) for (const id of getAncestorIds(source, byId)) excluded.add(id)
  if (target) for (const id of getAncestorIds(target, byId)) excluded.add(id)

  const obstacles: ObstacleRect[] = []

  // The endpoints' own bodies are solid too: the edge attaches at a point ON the
  // border and its stub leaves perpendicular, so a terminating segment does not
  // enter the body, while the route is forbidden from cutting back across the node
  // it just left. Exception: an endpoint that encloses the other, which the route
  // must be free to reach inside.
  for (const [id, otherPoint] of [
    [sourceId, targetPoint],
    [targetId, sourcePoint],
  ] as const) {
    const entry = entries.get(id)
    if (!entry || contains(entry.body, otherPoint)) continue
    obstacles.push({ ...entry.body, soft: false })
  }

  const candidates: ObstacleRect[] = []
  for (const [id, entry] of entries) {
    if (id === sourceId || id === targetId) continue
    if (excluded.has(id)) continue

    // A descendant of either endpoint: its ancestry runs through the endpoint.
    if (entry.ancestors.has(sourceId) || entry.ancestors.has(targetId)) continue

    // A node already sitting on top of a connection point cannot be routed around.
    if (contains(entry.body, sourcePoint) || contains(entry.body, targetPoint))
      continue

    candidates.push(entry.body)
  }

  // Only the nodes NEAR this edge are its obstacles. The router's search is
  // quadratic in obstacle count, so handing it every node makes routing ONE edge
  // scale with the whole diagram — per edge, per frame of a drag.
  //
  // A route stays within reach of its own endpoints, so nodes far from both cannot
  // be in its way. The window GROWS to swallow what it catches: a node the edge must
  // detour around is itself part of the region the edge travels, and may push it
  // into the node beyond.
  const pad = 2 * EDGES.STUB_LENGTH + EDGES.NODE_CLEARANCE_PX
  let left =
    (candidateBounds?.x ?? Math.min(sourcePoint.x, targetPoint.x)) - pad
  let right =
    (candidateBounds
      ? candidateBounds.x + candidateBounds.width
      : Math.max(sourcePoint.x, targetPoint.x)) + pad
  let top = (candidateBounds?.y ?? Math.min(sourcePoint.y, targetPoint.y)) - pad
  let bottom =
    (candidateBounds
      ? candidateBounds.y + candidateBounds.height
      : Math.max(sourcePoint.y, targetPoint.y)) + pad

  // Admit a node whose body comes within `pad`, then stretch to cover that body —
  // the body ONLY, not another pad's worth (stretching by a full pad each time would
  // walk across a dense diagram and admit everything). Two passes: the blockers in
  // the way, and the nodes those blockers would push a detour into.
  const included = new Set<ObstacleRect>()
  for (let pass = 0; pass < 2; pass++) {
    const admitted: ObstacleRect[] = []
    for (const rect of candidates) {
      if (included.has(rect)) continue
      const near =
        rect.x - pad < right &&
        rect.x + rect.width + pad > left &&
        rect.y - pad < bottom &&
        rect.y + rect.height + pad > top
      if (near) admitted.push(rect)
    }
    if (admitted.length === 0) break

    for (const rect of admitted) {
      included.add(rect)
      left = Math.min(left, rect.x)
      right = Math.max(right, rect.x + rect.width)
      top = Math.min(top, rect.y)
      bottom = Math.max(bottom, rect.y + rect.height)
    }
  }
  obstacles.push(...candidates.filter((rect) => included.has(rect)))

  return obstacles
}
