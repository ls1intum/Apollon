import type { Node } from "@xyflow/react"
import { EDGES } from "@/constants"
import { type ObstacleRect } from "@/utils/edgeUtils"
import { getPositionOnCanvas, isParentNodeType } from "@/utils/nodeUtils"
import type { IPoint } from "@/edges/Connection"

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
 * An edge from a class inside a package has to CROSS that package to get out, so
 * the package can never be an obstacle — but it must not be allowed to run ALONG
 * the package's border either, which is the shape that reads as an edge welded to
 * the frame. Crossing a line and lying on top of it are already two different
 * things to the router (it prices them apart for edges), so a container border is
 * handed over as one more line not to lie on. Crossing it stays cheap; tracing it
 * does not.
 */
export const getContainerBorderPolylines = (
  nodes: readonly Node[],
  sourceId: string,
  targetId: string
): IPoint[][] => {
  // Reuses the frame index — its `byId` and every container's absolute body are
  // already computed once for the whole frame (see `indexNodes`), so this adds no
  // per-edge O(nodes) scan.
  const { byId, entries } = indexNodes(nodes)
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
 * The nodes an edge from `sourceId` to `targetId` should route around.
 *
 * Solid means the node and nothing but the node: every leaf body is handed over
 * exactly, with no inflated ring and no margin rectangles. Clearance is not
 * geometry here — the router prices it (see `CLEARANCE_COST_PER_PX_AT_FULL_DEFICIT`
 * in `orthogonalRouter`), because a rectangle can say "in" or "out" and the
 * question is "how close".
 *
 * Nesting decides WHICH nodes are solid, and each rule is load-bearing:
 *
 * - Every ANCESTOR of either endpoint is skipped: an edge between two classes
 *   inside a package must live inside that package. One rule covers packages,
 *   pools, swimlanes, subsystems and deployment nodes at any depth.
 * - Every DESCENDANT of either endpoint is skipped: an edge anchored on a
 *   container's border leaves outward, and its own children can never
 *   legitimately be in the way.
 * - An endpoint that ENCLOSES the other endpoint is not made solid: the route has
 *   to be free to reach inside it.
 * - Anything already sitting on top of an endpoint is skipped: an overlapping node
 *   makes the problem unsolvable, and an unsolvable problem churns.
 */
/**
 * The nodes indexed for one render frame: id → node, and id → its absolute body
 * and ancestor set. The body geometry and ancestry of a node depend only on the
 * node set, not on which edge is being routed — so they are the same for every
 * edge in a frame and computing them per edge is O(edges × nodes) of pure waste.
 *
 * A frame's edges all read the SAME `nodes` array (one store snapshot), so a
 * one-entry cache keyed on that array's identity computes the index once and every
 * subsequent edge in the frame reads it. This is correct only because the store
 * replaces `nodes` on every change rather than mutating it in place — a new frame
 * is a new array, and an unchanged frame is the same array. Mutating a node's
 * position while keeping the array reference would read a stale body; nothing in
 * the app does that, and it is the same immutability the React reconciler assumes.
 *
 * The bodies handed out are SHARED, read-only. The router and the callers read
 * their coordinates and never write them; the one place a body is altered (an
 * endpoint's soft→solid) takes a copy.
 */
type NodeEntry = { body: ObstacleRect; ancestors: Set<string> }
type NodeIndex = { byId: Map<string, Node>; entries: Map<string, NodeEntry> }

let frameNodes: readonly Node[] | null = null
let frameIndex: NodeIndex | null = null

const indexNodes = (nodes: readonly Node[]): NodeIndex => {
  if (nodes === frameNodes && frameIndex) return frameIndex

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
        // A container is not quite a wall: an edge may cut through a package it is
        // not part of when going around would mean circling the diagram.
        soft: isParentNodeType(node.type),
      },
      ancestors: getAncestorIds(node, byId),
    })
  }

  frameNodes = nodes
  frameIndex = { byId, entries }
  return frameIndex
}

export const getEdgeObstacles = (
  nodes: readonly Node[],
  sourceId: string,
  targetId: string,
  sourcePoint: IPoint,
  targetPoint: IPoint
): ObstacleRect[] => {
  const { byId, entries } = indexNodes(nodes)
  const source = byId.get(sourceId)
  const target = byId.get(targetId)

  // Ancestors of either endpoint are the containers the edge lives inside; they
  // are never obstacles.
  const excluded = new Set<string>()
  if (source) for (const id of getAncestorIds(source, byId)) excluded.add(id)
  if (target) for (const id of getAncestorIds(target, byId)) excluded.add(id)

  const obstacles: ObstacleRect[] = []

  // The endpoints' own bodies are solid too. The edge attaches at a point ON the
  // border and its stub leaves perpendicular, so a segment that merely terminates
  // there does not enter the body — the connection still gets through, while the
  // route is forbidden from cutting back across the node it just left. (Skipping
  // the endpoints is what once let a route overlap its own source or target.)
  //
  // An endpoint that encloses the other endpoint is the exception: the route has
  // to be free to reach inside it.
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

    // A node already sitting on top of a connection point cannot be routed
    // around — only churned against.
    if (contains(entry.body, sourcePoint) || contains(entry.body, targetPoint))
      continue

    candidates.push(entry.body)
  }

  // Only the nodes NEAR this edge are its obstacles.
  //
  // The router turns its obstacles into a lattice of turning lines and the search is
  // quadratic in those, so handing it every node makes the cost of routing ONE edge
  // grow with the size of the whole diagram — per edge, per frame of a drag. A router
  // too slow to run is one that gets skipped, and that is how edges end up drawn
  // through the nodes it exists to avoid.
  //
  // A route around a node stays within reach of its own endpoints, so nodes far from
  // both cannot be in its way. "Far" is not guessed: the window GROWS to swallow what
  // it catches, because a node the edge must detour around is itself part of the
  // region the edge travels through, and may push it into the node beyond.
  const pad = 2 * EDGES.STUB_LENGTH + EDGES.NODE_CLEARANCE_PX
  let left = Math.min(sourcePoint.x, targetPoint.x) - pad
  let right = Math.max(sourcePoint.x, targetPoint.x) + pad
  let top = Math.min(sourcePoint.y, targetPoint.y) - pad
  let bottom = Math.max(sourcePoint.y, targetPoint.y) + pad

  // The window admits a node whose body comes within `pad` of it, then stretches
  // to cover that body — the body only, NOT another pad's worth. Stretching by a
  // full pad each time would walk the window across a dense diagram one node at a
  // time and admit the lot, which is the cost this exists to avoid. Two passes:
  // the blockers in the way, and the nodes those blockers would push a detour
  // into. Nothing beyond that can reach this edge.
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
