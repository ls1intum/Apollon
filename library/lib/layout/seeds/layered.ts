import type { SerializedSolverNode } from "@/utils/geometry/edgeGeometryWorkerProtocol"
import { EDGES } from "@/utils/geometry/routingConstants"
import {
  compareLayoutId,
  rankLayoutComponent,
  type LayoutGraphComponent,
} from "../graph"
import type { DiagramLayoutPositions } from "../types"

export type LayoutDirection = "DOWN" | "RIGHT"

export type LayeredComponentPlacement = Readonly<{
  positions: DiagramLayoutPositions
  layers: readonly (readonly string[])[]
}>

type LayerItem = Readonly<{ key: string; nodeId?: string }>
type Segment = Readonly<{ source: string; target: string; rank: number }>

const nodeSize = (
  node: Pick<SerializedSolverNode, "width" | "height" | "measured">
) => ({
  width: node.width ?? node.measured?.width ?? 0,
  height: node.height ?? node.measured?.height ?? 0,
})

const itemKey = (nodeId: string) => `node\u0000${nodeId}`
const dummyKey = (edgeId: string, rank: number) =>
  `dummy\u0000${edgeId}\u0000${rank}`

// Long edges still participate in exact route scoring. Bounding their surrogate
// dummy chain prevents an adversarial deep graph from materializing O(nm)
// temporary items merely for the cheap crossing-order heuristic.
const MAX_CROSSING_RANK_SPAN = 16

const normalizedLayers = (
  component: LayoutGraphComponent,
  direction: LayoutDirection,
  seed: "stable" | "current"
): Readonly<{
  layers: LayerItem[][]
  segments: Segment[]
}> => {
  const { rankByNode, directedEdges } = rankLayoutComponent(component)
  const maxRank = Math.max(0, ...rankByNode.values())
  const layers = Array.from({ length: maxRank + 1 }, () => [] as LayerItem[])
  const nodeById = new Map(component.nodes.map((node) => [node.id, node]))
  for (const node of component.nodes)
    layers[rankByNode.get(node.id) ?? 0].push({
      key: itemKey(node.id),
      nodeId: node.id,
    })
  const directionByEdge = new Map(directedEdges.map((edge) => [edge.id, edge]))
  const segments: Segment[] = []
  for (const edge of component.edges) {
    const directed = directionByEdge.get(edge.id)
    let source = directed?.source ?? edge.first
    let target = directed?.target ?? edge.second
    let sourceRank = rankByNode.get(source) ?? 0
    let targetRank = rankByNode.get(target) ?? 0
    if (sourceRank === targetRank) continue
    if (sourceRank > targetRank) {
      const previousSource = source
      source = target
      target = previousSource
      const previousSourceRank = sourceRank
      sourceRank = targetRank
      targetRank = previousSourceRank
    }
    if (targetRank - sourceRank > MAX_CROSSING_RANK_SPAN) continue
    let previous = itemKey(source)
    for (let rank = sourceRank + 1; rank < targetRank; rank++) {
      const key = dummyKey(edge.id, rank)
      layers[rank].push({ key })
      segments.push({ source: previous, target: key, rank: rank - 1 })
      previous = key
    }
    segments.push({
      source: previous,
      target: itemKey(target),
      rank: targetRank - 1,
    })
  }

  for (const layer of layers)
    layer.sort((left, right) => {
      if (seed === "current" && left.nodeId && right.nodeId) {
        const leftPosition = nodeById.get(left.nodeId)!.position
        const rightPosition = nodeById.get(right.nodeId)!.position
        const difference =
          direction === "DOWN"
            ? leftPosition.x - rightPosition.x
            : leftPosition.y - rightPosition.y
        if (difference !== 0) return difference
      }
      return compareLayoutId(left.key, right.key)
    })
  return { layers, segments }
}

const crossingCount = (
  layers: readonly (readonly LayerItem[])[],
  segments: readonly Segment[]
): number => {
  const order = layers.map(
    (layer) => new Map(layer.map((item, index) => [item.key, index]))
  )
  const byRank = new Map<number, Segment[]>()
  for (const segment of segments) {
    const ranked = byRank.get(segment.rank) ?? []
    ranked.push(segment)
    byRank.set(segment.rank, ranked)
  }
  let crossings = 0
  for (let rank = 0; rank < layers.length - 1; rank++) {
    const between = [...(byRank.get(rank) ?? [])].sort(
      (left, right) =>
        order[rank].get(left.source)! - order[rank].get(right.source)! ||
        order[rank + 1].get(left.target)! -
          order[rank + 1].get(right.target)! ||
        compareLayoutId(left.source, right.source) ||
        compareLayoutId(left.target, right.target)
    )
    const tree = new Array(layers[rank + 1].length + 1).fill(0)
    let seen = 0
    const prefix = (index: number) => {
      let sum = 0
      for (let cursor = index + 1; cursor > 0; cursor -= cursor & -cursor)
        sum += tree[cursor]
      return sum
    }
    const add = (index: number) => {
      for (
        let cursor = index + 1;
        cursor < tree.length;
        cursor += cursor & -cursor
      )
        tree[cursor]++
    }
    for (const segment of between) {
      const targetOrder = order[rank + 1].get(segment.target)!
      crossings += seen - prefix(targetOrder)
      add(targetOrder)
      seen++
    }
  }
  return crossings
}

const layerSignature = (layers: readonly (readonly LayerItem[])[]): string =>
  layers
    .map((layer) => layer.map((item) => item.key).join("\u0001"))
    .join("\u0002")

const minimizeCrossings = (
  initial: readonly (readonly LayerItem[])[],
  segments: readonly Segment[]
): LayerItem[][] => {
  let layers = initial.map((layer) => [...layer])
  let best = layers.map((layer) => [...layer])
  let bestCrossings = crossingCount(best, segments)
  let bestSignature = layerSignature(best)
  const neighbors = new Map<string, Array<{ key: string; rank: number }>>()
  for (const segment of segments) {
    const source = neighbors.get(segment.source) ?? []
    source.push({ key: segment.target, rank: segment.rank + 1 })
    neighbors.set(segment.source, source)
    const target = neighbors.get(segment.target) ?? []
    target.push({ key: segment.source, rank: segment.rank })
    neighbors.set(segment.target, target)
  }

  const sweep = (indexes: readonly number[], neighborRankOffset: -1 | 1) => {
    for (const rank of indexes) {
      const adjacentOrder = new Map(
        layers[rank + neighborRankOffset].map((item, index) => [
          item.key,
          index,
        ])
      )
      const previousOrder = new Map(
        layers[rank].map((item, index) => [item.key, index])
      )
      const barycenterByKey = new Map(
        layers[rank].map((item) => {
          const positions = (neighbors.get(item.key) ?? [])
            .filter((neighbor) => neighbor.rank === rank + neighborRankOffset)
            .map((neighbor) => adjacentOrder.get(neighbor.key)!)
          return [
            item.key,
            positions.length === 0
              ? previousOrder.get(item.key)!
              : positions.reduce((sum, value) => sum + value, 0) /
                positions.length,
          ]
        })
      )
      layers[rank].sort((left, right) => {
        return (
          barycenterByKey.get(left.key)! - barycenterByKey.get(right.key)! ||
          previousOrder.get(left.key)! - previousOrder.get(right.key)! ||
          compareLayoutId(left.key, right.key)
        )
      })
    }
  }

  const down = layers.map((_, index) => index).slice(1)
  const up = layers
    .map((_, index) => index)
    .slice(0, -1)
    .reverse()
  for (let iteration = 0; iteration < 8; iteration++) {
    if (iteration % 2 === 0) sweep(down, -1)
    else sweep(up, 1)
    const count = crossingCount(layers, segments)
    const signature = layerSignature(layers)
    if (
      count < bestCrossings ||
      (count === bestCrossings && signature < bestSignature)
    ) {
      best = layers.map((layer) => [...layer])
      bestCrossings = count
      bestSignature = signature
    }
  }

  // A bounded transpose pass repairs local inversions that barycentres cannot.
  layers = best.map((layer) => [...layer])
  if (
    segments.length > 2_000 ||
    layers.reduce((sum, layer) => sum + layer.length, 0) > 2_000
  )
    return layers
  for (let pass = 0; pass < 4; pass++) {
    let changed = false
    for (let rank = 0; rank < layers.length; rank++)
      for (let index = 0; index < layers[rank].length - 1; index++) {
        const before = crossingCount(layers, segments)
        const left = layers[rank][index]
        layers[rank][index] = layers[rank][index + 1]
        layers[rank][index + 1] = left
        const after = crossingCount(layers, segments)
        if (after < before) changed = true
        else {
          layers[rank][index + 1] = layers[rank][index]
          layers[rank][index] = left
        }
      }
    if (!changed) break
  }
  return layers
}

const placeRealNodes = (
  component: LayoutGraphComponent,
  normalized: readonly (readonly LayerItem[])[],
  direction: LayoutDirection
): LayeredComponentPlacement => {
  const nodeById = new Map(component.nodes.map((node) => [node.id, node]))
  const layers = normalized.map((layer) =>
    layer.flatMap((item) => (item.nodeId ? [item.nodeId] : []))
  )
  const crossGap = 2 * EDGES.NODE_CLEARANCE_PX
  const layerGap = 2 * EDGES.STUB_LENGTH + 2 * EDGES.NODE_CLEARANCE_PX
  const crossExtents = layers.map((layer) =>
    layer.reduce((extent, id, index) => {
      const size = nodeSize(nodeById.get(id)!)
      return (
        extent +
        (direction === "DOWN" ? size.width : size.height) +
        (index === 0 ? 0 : crossGap)
      )
    }, 0)
  )
  const widest = Math.max(0, ...crossExtents)
  const positions: Record<string, { x: number; y: number }> = {}
  let main = 0
  layers.forEach((layer, layerIndex) => {
    const mainExtent = Math.max(
      0,
      ...layer.map((id) => {
        const size = nodeSize(nodeById.get(id)!)
        return direction === "DOWN" ? size.height : size.width
      })
    )
    let cross = (widest - crossExtents[layerIndex]) / 2
    for (const id of layer) {
      const size = nodeSize(nodeById.get(id)!)
      positions[id] =
        direction === "DOWN" ? { x: cross, y: main } : { x: main, y: cross }
      cross += (direction === "DOWN" ? size.width : size.height) + crossGap
    }
    main += mainExtent + layerGap
  })
  return { positions, layers }
}

export const layeredComponentSeed = (
  component: LayoutGraphComponent,
  direction: LayoutDirection,
  seed: "stable" | "current"
): LayeredComponentPlacement => {
  const { layers, segments } = normalizedLayers(component, direction, seed)
  return placeRealNodes(
    component,
    minimizeCrossings(layers, segments),
    direction
  )
}
