import type {
  SerializedSolverEdge,
  SerializedSolverInput,
  SerializedSolverNode,
} from "@/utils/geometry/edgeGeometryWorkerProtocol"
import { edgeLayoutSemantics } from "./profile"

export const compareLayoutId = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

export type LayoutGraphEdge = Readonly<{
  id: string
  first: string
  second: string
  semanticSource?: string
  semanticTarget?: string
}>

export type LayoutGraphComponent = Readonly<{
  id: string
  nodes: readonly SerializedSolverNode[]
  edges: readonly LayoutGraphEdge[]
}>

const layoutEdge = (edge: SerializedSolverEdge): LayoutGraphEdge => {
  const semantics = edgeLayoutSemantics(edge.type)
  if (semantics === "parent-at-target")
    return {
      id: edge.id,
      first: edge.source,
      second: edge.target,
      semanticSource: edge.target,
      semanticTarget: edge.source,
    }
  if (semantics === "directed")
    return {
      id: edge.id,
      first: edge.source,
      second: edge.target,
      semanticSource: edge.source,
      semanticTarget: edge.target,
    }
  return { id: edge.id, first: edge.source, second: edge.target }
}

export const buildLayoutComponents = (
  input: SerializedSolverInput
): LayoutGraphComponent[] => {
  const nodes = input.nodes
    .filter((node) => !node.hidden)
    .toSorted((left, right) => compareLayoutId(left.id, right.id))
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const edges = input.edges
    .filter(
      (edge) =>
        edge.source !== edge.target &&
        nodeById.has(edge.source) &&
        nodeById.has(edge.target)
    )
    .toSorted((left, right) => compareLayoutId(left.id, right.id))
    .map(layoutEdge)
  const neighbors = new Map(nodes.map((node) => [node.id, new Set<string>()]))
  for (const edge of edges) {
    neighbors.get(edge.first)?.add(edge.second)
    neighbors.get(edge.second)?.add(edge.first)
  }

  const visited = new Set<string>()
  const components: LayoutGraphComponent[] = []
  for (const node of nodes) {
    if (visited.has(node.id)) continue
    const ids: string[] = []
    const queue = [node.id]
    visited.add(node.id)
    while (queue.length > 0) {
      const id = queue.shift()!
      ids.push(id)
      for (const neighbor of [...(neighbors.get(id) ?? [])].sort(
        compareLayoutId
      ))
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
    }
    ids.sort(compareLayoutId)
    const idSet = new Set(ids)
    components.push({
      id: ids[0],
      nodes: ids.map((id) => nodeById.get(id)!),
      edges: edges.filter(
        (edge) => idSet.has(edge.first) && idSet.has(edge.second)
      ),
    })
  }
  return components
}

/**
 * Deterministic Eades-style feedback-arc ordering. Semantic edges that point
 * backwards in this order are reversed only inside the placement surrogate;
 * their real meaning and rendered direction never change.
 */
const acyclicSemanticEdges = (
  component: LayoutGraphComponent
): ReadonlyArray<Readonly<{ source: string; target: string; id: string }>> => {
  const semantic = component.edges.filter(
    (edge) => edge.semanticSource && edge.semanticTarget
  )
  const remaining = new Set(component.nodes.map((node) => node.id))
  const left: string[] = []
  const right: string[] = []
  const incoming = new Map(
    component.nodes.map((node) => [node.id, [] as string[]])
  )
  const outgoing = new Map(
    component.nodes.map((node) => [node.id, [] as string[]])
  )
  for (const edge of semantic) {
    outgoing.get(edge.semanticSource!)?.push(edge.semanticTarget!)
    incoming.get(edge.semanticTarget!)?.push(edge.semanticSource!)
  }
  const indegree = new Map(
    [...incoming].map(([id, sources]) => [id, sources.length])
  )
  const outdegree = new Map(
    [...outgoing].map(([id, targets]) => [id, targets.length])
  )
  const remove = (id: string, side: "left" | "right") => {
    remaining.delete(id)
    for (const source of incoming.get(id) ?? [])
      if (remaining.has(source))
        outdegree.set(source, outdegree.get(source)! - 1)
    for (const target of outgoing.get(id) ?? [])
      if (remaining.has(target)) indegree.set(target, indegree.get(target)! - 1)
    if (side === "left") left.push(id)
    else right.unshift(id)
  }

  while (remaining.size > 0) {
    let progressed = true
    while (progressed && remaining.size > 0) {
      progressed = false
      const sink = [...remaining]
        .sort(compareLayoutId)
        .find((id) => outdegree.get(id) === 0)
      if (sink) {
        remove(sink, "right")
        progressed = true
        continue
      }
      const source = [...remaining]
        .sort(compareLayoutId)
        .find((id) => indegree.get(id) === 0)
      if (source) {
        remove(source, "left")
        progressed = true
      }
    }
    if (remaining.size === 0) break
    const selected = [...remaining].sort((first, second) => {
      return (
        outdegree.get(second)! -
          indegree.get(second)! -
          (outdegree.get(first)! - indegree.get(first)!) ||
        compareLayoutId(first, second)
      )
    })[0]
    remove(selected, "left")
  }

  const order = new Map(left.concat(right).map((id, index) => [id, index]))
  return semantic.map((edge) => {
    const source = edge.semanticSource!
    const target = edge.semanticTarget!
    return (order.get(source) ?? 0) <= (order.get(target) ?? 0)
      ? { id: edge.id, source, target }
      : { id: edge.id, source: target, target: source }
  })
}

const undirectedForestEdges = (
  component: LayoutGraphComponent
): ReadonlyArray<Readonly<{ source: string; target: string; id: string }>> => {
  const adjacency = new Map(
    component.nodes.map((node) => [
      node.id,
      [] as Array<Readonly<{ neighbor: string; id: string }>>,
    ])
  )
  for (const edge of component.edges) {
    adjacency.get(edge.first)?.push({ neighbor: edge.second, id: edge.id })
    adjacency.get(edge.second)?.push({ neighbor: edge.first, id: edge.id })
  }
  for (const entries of adjacency.values())
    entries.sort(
      (left, right) =>
        compareLayoutId(left.neighbor, right.neighbor) ||
        compareLayoutId(left.id, right.id)
    )
  const root = component.nodes
    .map((node) => node.id)
    .sort(
      (left, right) =>
        (adjacency.get(right)?.length ?? 0) -
          (adjacency.get(left)?.length ?? 0) || compareLayoutId(left, right)
    )[0]
  const result: Array<{ source: string; target: string; id: string }> = []
  const visited = new Set([root])
  const queue = [root]
  while (queue.length > 0) {
    const source = queue.shift()!
    for (const { neighbor, id } of adjacency.get(source) ?? [])
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
        result.push({ source, target: neighbor, id })
      }
  }
  return result
}

export type RankedLayoutGraph = Readonly<{
  rankByNode: ReadonlyMap<string, number>
  directedEdges: ReadonlyArray<
    Readonly<{ source: string; target: string; id: string }>
  >
}>

export const rankLayoutComponent = (
  component: LayoutGraphComponent
): RankedLayoutGraph => {
  const semantic = acyclicSemanticEdges(component)
  const directedEdges =
    semantic.length > 0 ? semantic : undirectedForestEdges(component)
  const outgoing = new Map(
    component.nodes.map((node) => [
      node.id,
      [] as Array<Readonly<{ target: string; id: string }>>,
    ])
  )
  const indegree = new Map(component.nodes.map((node) => [node.id, 0]))
  for (const edge of directedEdges) {
    outgoing.get(edge.source)?.push({ target: edge.target, id: edge.id })
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
  }
  for (const targets of outgoing.values())
    targets.sort(
      (left, right) =>
        compareLayoutId(left.target, right.target) ||
        compareLayoutId(left.id, right.id)
    )
  const rank = new Map(component.nodes.map((node) => [node.id, 0]))
  const queue = component.nodes
    .map((node) => node.id)
    .filter((id) => indegree.get(id) === 0)
    .sort(compareLayoutId)
  while (queue.length > 0) {
    const source = queue.shift()!
    for (const { target } of outgoing.get(source) ?? []) {
      rank.set(target, Math.max(rank.get(target)!, rank.get(source)! + 1))
      indegree.set(target, indegree.get(target)! - 1)
      if (indegree.get(target) === 0) {
        queue.push(target)
        queue.sort(compareLayoutId)
      }
    }
  }

  // Neutral associations do not impose parent/child meaning, but they must not
  // disappear from mixed UML structure merely because one semantic edge exists.
  // Grow deterministic undirected branches from the semantic backbone; endpoint
  // creation order is irrelevant because adjacency is sorted canonically.
  if (semantic.length > 0) {
    const neutralAdjacency = new Map(
      component.nodes.map((node) => [node.id, [] as string[]])
    )
    for (const edge of component.edges)
      if (!edge.semanticSource || !edge.semanticTarget) {
        neutralAdjacency.get(edge.first)?.push(edge.second)
        neutralAdjacency.get(edge.second)?.push(edge.first)
      }
    for (const neighbors of neutralAdjacency.values())
      neighbors.sort(compareLayoutId)
    const assigned = new Set(
      semantic.flatMap((edge) => [edge.source, edge.target])
    )
    const neutralQueue = [...assigned].sort(
      (left, right) =>
        rank.get(left)! - rank.get(right)! || compareLayoutId(left, right)
    )
    while (neutralQueue.length > 0) {
      const source = neutralQueue.shift()!
      for (const target of neutralAdjacency.get(source) ?? [])
        if (!assigned.has(target)) {
          assigned.add(target)
          rank.set(target, rank.get(source)! + 1)
          neutralQueue.push(target)
        }
    }
  }
  return { rankByNode: rank, directedEdges }
}
