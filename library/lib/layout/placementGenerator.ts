import type {
  SerializedSolverInput,
  SerializedSolverNode,
} from "@/utils/geometry/edgeGeometryWorkerProtocol"
import { EDGES } from "@/utils/geometry/routingConstants"
import { buildLayoutComponents } from "./graph"
import { packComponents } from "./packing/componentPacking"
import { layeredComponentSeed, type LayoutDirection } from "./seeds/layered"
import { radialSubstructureSeed } from "./seeds/radialSubstructure"
import type { DiagramLayoutPositions } from "./types"

export type { LayoutDirection }

export type DiagramPlacementCandidate = Readonly<{
  id: string
  direction: LayoutDirection
  positions: DiagramLayoutPositions
  /** Stable real-node layer orders retained for route-objective local search. */
  layers: readonly (readonly string[])[]
}>

const nodeSize = (
  node: Pick<SerializedSolverNode, "width" | "height" | "measured">
) => ({
  width: node.width ?? node.measured?.width ?? 0,
  height: node.height ?? node.measured?.height ?? 0,
})

/**
 * Generate deterministic, component-safe layered seeds. These placements own
 * no edge geometry: the candidate solver routes and judges every one using
 * Apollon's canonical router.
 */
export const generatePlacementCandidates = (
  input: SerializedSolverInput
): DiagramPlacementCandidate[] => {
  const components = buildLayoutComponents(input)
  const layered = (["DOWN", "RIGHT"] as const).flatMap((direction) =>
    (["stable", "current"] as const).map((seed) => {
      const placements = new Map(
        components.map((component) => [
          component.id,
          layeredComponentSeed(component, direction, seed),
        ])
      )
      const packed = packComponents(components, placements, seed)
      return {
        id: `${direction.toLowerCase()}-${seed}`,
        direction,
        ...packed,
      }
    })
  )
  let hasOrthogonalSubstructure = false
  const structuralPlacements = new Map(
    components.map((component) => {
      const structural = radialSubstructureSeed(component)
      if (structural) hasOrthogonalSubstructure = true
      return [
        component.id,
        structural ?? layeredComponentSeed(component, "DOWN", "stable"),
      ]
    })
  )
  if (!hasOrthogonalSubstructure) return layered
  return layered.concat({
    id: "radial-structures",
    direction: "DOWN",
    ...packComponents(components, structuralPlacements, "stable"),
  })
}

/**
 * Swap two adjacent nodes inside their existing layer footprint. This is a
 * topology-changing move whose acceptance is decided only after exact rerouting.
 */
export const swapAdjacentLayerNodes = (
  candidate: DiagramPlacementCandidate,
  nodes: readonly SerializedSolverNode[],
  layerIndex: number,
  leftIndex: number
): DiagramPlacementCandidate => {
  const layers = candidate.layers.map((layer) => [...layer])
  const layer = layers[layerIndex]
  const leftId = layer[leftIndex]
  const rightId = layer[leftIndex + 1]
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const leftPosition = candidate.positions[leftId]
  const rightPosition = candidate.positions[rightId]
  const rightSize = nodeSize(nodeById.get(rightId)!)
  const gap = 2 * EDGES.NODE_CLEARANCE_PX
  const positions = {
    ...candidate.positions,
    [leftId]:
      candidate.direction === "DOWN"
        ? { x: leftPosition.x + rightSize.width + gap, y: leftPosition.y }
        : { x: leftPosition.x, y: leftPosition.y + rightSize.height + gap },
    [rightId]:
      candidate.direction === "DOWN"
        ? { x: leftPosition.x, y: rightPosition.y }
        : { x: rightPosition.x, y: leftPosition.y },
  }
  layer[leftIndex] = rightId
  layer[leftIndex + 1] = leftId
  return {
    ...candidate,
    id: `${candidate.id}-swap-${layerIndex}-${leftIndex}`,
    positions,
    layers,
  }
}
