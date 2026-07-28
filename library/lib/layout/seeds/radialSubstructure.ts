import type { SerializedSolverNode } from "@/utils/geometry/edgeGeometryWorkerProtocol"
import { CANVAS, EDGES } from "@/utils/geometry/routingConstants"
import { compareLayoutId, type LayoutGraphComponent } from "../graph"
import type { DiagramLayoutPosition, DiagramLayoutPositions } from "../types"
import type { LayeredComponentPlacement } from "./layered"

type Rect = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

const nodeSize = (
  node: Pick<SerializedSolverNode, "width" | "height" | "measured">
) => ({
  width: node.width ?? node.measured?.width ?? 0,
  height: node.height ?? node.measured?.height ?? 0,
})

const snap = (value: number): number =>
  Math.round(value / CANVAS.SNAP_TO_GRID_PX) * CANVAS.SNAP_TO_GRID_PX

const hasClearance = (first: Rect, second: Rect): boolean => {
  const overlapX =
    Math.min(first.x + first.width, second.x + second.width) -
    Math.max(first.x, second.x)
  const overlapY =
    Math.min(first.y + first.height, second.y + second.height) -
    Math.max(first.y, second.y)
  if (overlapX > 0 && overlapY > 0) return false
  if (overlapY > 0) {
    const horizontalGap = Math.max(
      second.x - first.x - first.width,
      first.x - second.x - second.width
    )
    return horizontalGap >= EDGES.NODE_CLEARANCE_PX
  }
  if (overlapX > 0) {
    const verticalGap = Math.max(
      second.y - first.y - first.height,
      first.y - second.y - second.height
    )
    return verticalGap >= EDGES.NODE_CLEARANCE_PX
  }
  return true
}

const allNodesHaveClearance = (
  nodes: readonly SerializedSolverNode[],
  positions: DiagramLayoutPositions
): boolean => {
  for (let first = 0; first < nodes.length; first++) {
    const firstSize = nodeSize(nodes[first])
    const firstRect = { ...positions[nodes[first].id], ...firstSize }
    for (let second = first + 1; second < nodes.length; second++) {
      const secondSize = nodeSize(nodes[second])
      const secondRect = { ...positions[nodes[second].id], ...secondSize }
      if (!hasClearance(firstRect, secondRect)) return false
    }
  }
  return true
}

const adjacency = (
  component: LayoutGraphComponent
): ReadonlyMap<string, readonly string[]> => {
  const neighbors = new Map(
    component.nodes.map((node) => [node.id, [] as string[]])
  )
  const uniquePairs = new Set<string>()
  for (const edge of component.edges) {
    if (edge.semanticSource || edge.semanticTarget)
      return new Map<string, string[]>()
    const first = [edge.first, edge.second].sort(compareLayoutId)
    const pair = `${first[0]}\u0000${first[1]}`
    if (uniquePairs.has(pair)) return new Map<string, string[]>()
    uniquePairs.add(pair)
    neighbors.get(edge.first)?.push(edge.second)
    neighbors.get(edge.second)?.push(edge.first)
  }
  for (const entries of neighbors.values()) entries.sort(compareLayoutId)
  return neighbors
}

const starOrder = (
  component: LayoutGraphComponent,
  neighbors: ReadonlyMap<string, readonly string[]>
): Readonly<{ center: string; perimeter: readonly string[] }> | undefined => {
  if (
    component.nodes.length < 4 ||
    component.edges.length !== component.nodes.length - 1
  )
    return undefined
  const center = component.nodes
    .map((node) => node.id)
    .find((id) => neighbors.get(id)?.length === component.nodes.length - 1)
  if (
    !center ||
    component.nodes.some(
      (node) =>
        node.id !== center && (neighbors.get(node.id)?.length ?? 0) !== 1
    )
  )
    return undefined
  return {
    center,
    perimeter: component.nodes
      .map((node) => node.id)
      .filter((id) => id !== center)
      .sort(compareLayoutId),
  }
}

const cycleOrder = (
  component: LayoutGraphComponent,
  neighbors: ReadonlyMap<string, readonly string[]>
): readonly string[] | undefined => {
  if (
    component.nodes.length < 4 ||
    component.edges.length !== component.nodes.length ||
    component.nodes.some((node) => (neighbors.get(node.id)?.length ?? 0) !== 2)
  )
    return undefined
  const start = component.nodes.map((node) => node.id).sort(compareLayoutId)[0]
  const result = [start]
  let previous = start
  let current = neighbors.get(start)![0]
  while (current !== start && result.length <= component.nodes.length) {
    result.push(current)
    const next = neighbors
      .get(current)!
      .find((candidate) => candidate !== previous)
    if (!next) return undefined
    previous = current
    current = next
  }
  return current === start && result.length === component.nodes.length
    ? result
    : undefined
}

const positionsOnEllipse = (
  nodeById: ReadonlyMap<string, SerializedSolverNode>,
  perimeter: readonly string[],
  radius: number,
  centerId?: string
): DiagramLayoutPositions => {
  const horizontalRadius = radius * 1.25
  const verticalRadius = radius
  const centerNode = centerId ? nodeById.get(centerId) : undefined
  const centerSize = centerNode ? nodeSize(centerNode) : { width: 0, height: 0 }
  const center = { x: centerSize.width / 2, y: centerSize.height / 2 }
  const positions: Record<string, DiagramLayoutPosition> = centerId
    ? { [centerId]: { x: 0, y: 0 } }
    : {}
  perimeter.forEach((id, index) => {
    const size = nodeSize(nodeById.get(id)!)
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / perimeter.length
    positions[id] = {
      x: snap(center.x + horizontalRadius * Math.cos(angle) - size.width / 2),
      y: snap(center.y + verticalRadius * Math.sin(angle) - size.height / 2),
    }
  })
  return positions
}

const clearEllipsePositions = (
  nodes: readonly SerializedSolverNode[],
  perimeter: readonly string[],
  centerId?: string
): DiagramLayoutPositions => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const maximumExtent = Math.max(
    CANVAS.SNAP_TO_GRID_PX,
    ...nodes.flatMap((node) => {
      const size = nodeSize(node)
      return [size.width, size.height]
    })
  )
  let lower = 0
  let upper = maximumExtent + EDGES.NODE_CLEARANCE_PX
  while (
    !allNodesHaveClearance(
      nodes,
      positionsOnEllipse(nodeById, perimeter, upper, centerId)
    )
  )
    upper *= 2
  while (upper - lower > CANVAS.SNAP_TO_GRID_PX) {
    const middle =
      Math.floor((lower + upper) / (2 * CANVAS.SNAP_TO_GRID_PX)) *
      CANVAS.SNAP_TO_GRID_PX
    const positions = positionsOnEllipse(nodeById, perimeter, middle, centerId)
    if (allNodesHaveClearance(nodes, positions)) upper = middle
    else lower = middle + CANVAS.SNAP_TO_GRID_PX
  }
  let positions = positionsOnEllipse(nodeById, perimeter, upper, centerId)
  while (!allNodesHaveClearance(nodes, positions)) {
    upper += CANVAS.SNAP_TO_GRID_PX
    positions = positionsOnEllipse(nodeById, perimeter, upper, centerId)
  }
  return positions
}

/**
 * Recognize only exact undirected stars and simple cycles. These two common UML
 * association structures have a natural radial hub/perimeter placement whose
 * edges are still judged by the canonical orthogonal router. Treating arbitrary
 * graphs as radial would hide hierarchy and is deliberately outside this seed.
 */
export const radialSubstructureSeed = (
  component: LayoutGraphComponent
): LayeredComponentPlacement | undefined => {
  const neighbors = adjacency(component)
  if (neighbors.size !== component.nodes.length) return undefined
  const star = starOrder(component, neighbors)
  const cycle = star ? undefined : cycleOrder(component, neighbors)
  if (!star && !cycle) return undefined
  const order = star ? [star.center, ...star.perimeter] : cycle!
  return {
    positions: clearEllipsePositions(
      component.nodes,
      star?.perimeter ?? cycle!,
      star?.center
    ),
    layers: order.map((id) => [id]),
  }
}
