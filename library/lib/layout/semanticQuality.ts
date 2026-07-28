import type {
  SerializedSolverInput,
  SerializedSolverNode,
} from "@/utils/geometry/edgeGeometryWorkerProtocol"
import { CANVAS, EDGES } from "@/utils/geometry/routingConstants"
import { compareLayoutId } from "./graph"
import { edgeLayoutSemantics } from "./profile"
import type { DiagramLayoutPositions } from "./types"

type Axis = "x" | "y"

type SemanticEdge = Readonly<{
  source: string
  target: string
  hierarchy: boolean
}>

export type SemanticCompositionMetrics = Readonly<{
  backwardEdges: number
  backwardDistancePx: number
  hierarchyFanoutMaxOffsetPermille: number
  hierarchyFanoutTotalOffsetPermille: number
  hierarchySiblingSpreadPermille: number
}>

const STRONG_HIERARCHY_EDGE_TYPES = new Set([
  "ClassInheritance",
  "ClassRealization",
])

const nodeSize = (
  node: SerializedSolverNode
): Readonly<{ width: number; height: number }> => ({
  width: node.width ?? node.measured?.width ?? 0,
  height: node.height ?? node.measured?.height ?? 0,
})

const semanticEdges = (
  input: SerializedSolverInput,
  visibleIds: ReadonlySet<string>
): SemanticEdge[] =>
  input.edges.flatMap((edge) => {
    if (
      !visibleIds.has(edge.source) ||
      !visibleIds.has(edge.target) ||
      edge.source === edge.target
    )
      return []
    const semantics = edgeLayoutSemantics(edge.type)
    if (semantics === "undirected") return []
    return [
      {
        source: semantics === "parent-at-target" ? edge.target : edge.source,
        target: semantics === "parent-at-target" ? edge.source : edge.target,
        hierarchy: STRONG_HIERARCHY_EDGE_TYPES.has(edge.type ?? ""),
      },
    ]
  })

/**
 * Tarjan's algorithm over the semantic graph. Flow inside an SCC cannot have a
 * globally consistent drawing direction, so only edges in the condensation DAG
 * participate in the backward-edge objective.
 */
const stronglyConnectedComponents = (
  nodeIds: readonly string[],
  edges: readonly SemanticEdge[]
): ReadonlyMap<string, number> => {
  const adjacency = new Map(nodeIds.map((id) => [id, [] as string[]]))
  for (const edge of edges) adjacency.get(edge.source)?.push(edge.target)
  for (const targets of adjacency.values()) targets.sort(compareLayoutId)

  let nextIndex = 0
  let nextComponent = 0
  const indexById = new Map<string, number>()
  const lowLinkById = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const componentById = new Map<string, number>()

  const visit = (id: string) => {
    const index = nextIndex++
    indexById.set(id, index)
    lowLinkById.set(id, index)
    stack.push(id)
    onStack.add(id)

    for (const target of adjacency.get(id) ?? [])
      if (!indexById.has(target)) {
        visit(target)
        lowLinkById.set(
          id,
          Math.min(lowLinkById.get(id)!, lowLinkById.get(target)!)
        )
      } else if (onStack.has(target))
        lowLinkById.set(
          id,
          Math.min(lowLinkById.get(id)!, indexById.get(target)!)
        )

    if (lowLinkById.get(id) !== indexById.get(id)) return
    while (stack.length > 0) {
      const member = stack.pop()!
      onStack.delete(member)
      componentById.set(member, nextComponent)
      if (member === id) break
    }
    nextComponent++
  }

  for (const id of [...nodeIds].sort(compareLayoutId))
    if (!indexById.has(id)) visit(id)
  return componentById
}

const center = (
  node: SerializedSolverNode,
  positions: DiagramLayoutPositions,
  axis: Axis
): number => {
  const position = positions[node.id] ?? node.position
  const size = nodeSize(node)
  return position[axis] + size[axis === "x" ? "width" : "height"] / 2
}

const scoreDirection = (
  edges: readonly SemanticEdge[],
  nodeById: ReadonlyMap<string, SerializedSolverNode>,
  positions: DiagramLayoutPositions,
  axis: Axis
) => {
  let backwardEdges = 0
  let backwardDistance = 0
  for (const edge of edges) {
    const source = nodeById.get(edge.source)!
    const target = nodeById.get(edge.target)!
    const delta =
      center(target, positions, axis) - center(source, positions, axis)
    if (delta <= 0) {
      backwardEdges++
      backwardDistance += Math.abs(delta) + CANVAS.SNAP_TO_GRID_PX
    }
  }
  return { backwardEdges, backwardDistance }
}

const preferredAxis = (
  edges: readonly SemanticEdge[],
  nodeById: ReadonlyMap<string, SerializedSolverNode>,
  positions: DiagramLayoutPositions
): Readonly<{
  axis: Axis
  backwardEdges: number
  backwardDistance: number
}> => {
  const vertical = scoreDirection(edges, nodeById, positions, "y")
  const horizontal = scoreDirection(edges, nodeById, positions, "x")
  return vertical.backwardEdges < horizontal.backwardEdges ||
    (vertical.backwardEdges === horizontal.backwardEdges &&
      vertical.backwardDistance <= horizontal.backwardDistance)
    ? { axis: "y", ...vertical }
    : { axis: "x", ...horizontal }
}

const crossBounds = (
  node: SerializedSolverNode,
  positions: DiagramLayoutPositions,
  axis: Axis
): Readonly<{ start: number; end: number }> => {
  const position = positions[node.id] ?? node.position
  const size = nodeSize(node)
  const start = position[axis]
  return {
    start,
    end: start + size[axis === "x" ? "width" : "height"],
  }
}

const hierarchyComposition = (
  hierarchyEdges: readonly SemanticEdge[],
  nodeById: ReadonlyMap<string, SerializedSolverNode>,
  positions: DiagramLayoutPositions,
  mainAxis: Axis
) => {
  const crossAxis: Axis = mainAxis === "x" ? "y" : "x"
  const childrenByParent = new Map<string, Set<string>>()
  const parentsByChild = new Map<string, Set<string>>()
  for (const edge of hierarchyEdges) {
    const children = childrenByParent.get(edge.source) ?? new Set<string>()
    children.add(edge.target)
    childrenByParent.set(edge.source, children)
    const parents = parentsByChild.get(edge.target) ?? new Set<string>()
    parents.add(edge.source)
    parentsByChild.set(edge.target, parents)
  }

  let maxOffset = 0
  let totalOffset = 0
  let siblingSpread = 0
  for (const [parentId, childIds] of [...childrenByParent].sort(
    ([left], [right]) => compareLayoutId(left, right)
  )) {
    const children = [...childIds]
      .sort(compareLayoutId)
      .map((id) => nodeById.get(id)!)
    if (children.length < 2) continue
    const childBounds = children.map((child) =>
      crossBounds(child, positions, crossAxis)
    )
    const envelopeStart = Math.min(...childBounds.map((bounds) => bounds.start))
    const envelopeEnd = Math.max(...childBounds.map((bounds) => bounds.end))
    const envelopeCenter = (envelopeStart + envelopeEnd) / 2
    const halfEnvelope = Math.max(
      CANVAS.SNAP_TO_GRID_PX,
      (envelopeEnd - envelopeStart) / 2
    )
    const offset = Math.min(
      1_000,
      Math.round(
        (1_000 *
          Math.abs(
            center(nodeById.get(parentId)!, positions, crossAxis) -
              envelopeCenter
          )) /
          halfEnvelope
      )
    )
    maxOffset = Math.max(maxOffset, offset)
    totalOffset += offset

    // Multiple inheritance gives a child several legitimate sibling groups.
    // Measuring compactness only for exclusive children avoids asking those
    // groups to occupy contradictory intervals.
    const exclusiveChildren = children.filter(
      (child) => parentsByChild.get(child.id)?.size === 1
    )
    if (exclusiveChildren.length < 2) continue
    const exclusiveBounds = exclusiveChildren.map((child) =>
      crossBounds(child, positions, crossAxis)
    )
    const actualEnvelope =
      Math.max(...exclusiveBounds.map((bounds) => bounds.end)) -
      Math.min(...exclusiveBounds.map((bounds) => bounds.start))
    const occupied = exclusiveBounds.reduce(
      (sum, bounds) => sum + bounds.end - bounds.start,
      0
    )
    const preferredEnvelope =
      occupied +
      2 * EDGES.NODE_CLEARANCE_PX * Math.max(0, exclusiveChildren.length - 1)
    siblingSpread += Math.min(
      1_000,
      Math.round(
        (1_000 * Math.max(0, actualEnvelope - preferredEnvelope)) /
          Math.max(CANVAS.SNAP_TO_GRID_PX, preferredEnvelope)
      )
    )
  }
  return {
    hierarchyFanoutMaxOffsetPermille: maxOffset,
    hierarchyFanoutTotalOffsetPermille: totalOffset,
    hierarchySiblingSpreadPermille: siblingSpread,
  }
}

export const measureSemanticComposition = (
  input: SerializedSolverInput,
  positions: DiagramLayoutPositions
): SemanticCompositionMetrics => {
  const visibleNodes = input.nodes.filter((node) => !node.hidden)
  const nodeById = new Map(visibleNodes.map((node) => [node.id, node]))
  const edges = semanticEdges(input, new Set(nodeById.keys()))
  const componentById = stronglyConnectedComponents([...nodeById.keys()], edges)
  const condensationEdges = edges.filter(
    (edge) => componentById.get(edge.source) !== componentById.get(edge.target)
  )
  const direction = preferredAxis(condensationEdges, nodeById, positions)
  const hierarchyEdges = condensationEdges.filter((edge) => edge.hierarchy)
  const hierarchyDirection =
    hierarchyEdges.length > 0
      ? preferredAxis(hierarchyEdges, nodeById, positions)
      : direction
  return {
    backwardEdges: direction.backwardEdges,
    backwardDistancePx: direction.backwardDistance,
    ...hierarchyComposition(
      hierarchyEdges,
      nodeById,
      positions,
      hierarchyDirection.axis
    ),
  }
}
