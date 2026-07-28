import type { SerializedSolverNode } from "@/utils/geometry/edgeGeometryWorkerProtocol"
import { EDGES } from "@/utils/geometry/routingConstants"
import { compareLayoutId, type LayoutGraphComponent } from "../graph"
import type { LayeredComponentPlacement } from "../seeds/layered"
import type { DiagramLayoutPositions } from "../types"

export type PackedPlacement = Readonly<{
  positions: DiagramLayoutPositions
  layers: readonly (readonly string[])[]
}>

const PACKING_TARGET_ASPECT_RATIO = 1.6

const nodeSize = (
  node: Pick<SerializedSolverNode, "width" | "height" | "measured">
) => ({
  width: node.width ?? node.measured?.width ?? 0,
  height: node.height ?? node.measured?.height ?? 0,
})

const placementBounds = (
  component: LayoutGraphComponent,
  positions: DiagramLayoutPositions
) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of component.nodes) {
    const position = positions[node.id]
    const size = nodeSize(node)
    minX = Math.min(minX, position.x)
    minY = Math.min(minY, position.y)
    maxX = Math.max(maxX, position.x + size.width)
    maxY = Math.max(maxY, position.y + size.height)
  }
  return {
    minX,
    minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}

const currentCenter = (component: LayoutGraphComponent) => {
  let x = 0
  let y = 0
  for (const node of component.nodes) {
    const size = nodeSize(node)
    x += node.position.x + size.width / 2
    y += node.position.y + size.height / 2
  }
  return {
    x: x / component.nodes.length,
    y: y / component.nodes.length,
  }
}

type ComponentBox = Readonly<{
  component: LayoutGraphComponent
  placement: LayeredComponentPlacement
  bounds: ReturnType<typeof placementBounds>
  center: ReturnType<typeof currentCenter>
}>

const packAtWidth = (
  boxes: readonly ComponentBox[],
  targetWidth: number,
  gap: number
): PackedPlacement & Readonly<{ width: number; height: number }> => {
  const positions: Record<string, { x: number; y: number }> = {}
  const layers: string[][] = []
  let x = 0
  let y = 0
  let rowHeight = 0
  let packedWidth = 0
  for (const box of boxes) {
    if (x > 0 && x + box.bounds.width > targetWidth) {
      x = 0
      y += rowHeight + gap
      rowHeight = 0
    }
    const dx = x - box.bounds.minX
    const dy = y - box.bounds.minY
    for (const node of box.component.nodes) {
      const position = box.placement.positions[node.id]
      positions[node.id] = { x: position.x + dx, y: position.y + dy }
    }
    layers.push(...box.placement.layers.map((layer) => [...layer]))
    x += box.bounds.width + gap
    packedWidth = Math.max(packedWidth, x - gap)
    rowHeight = Math.max(rowHeight, box.bounds.height)
  }
  return {
    positions,
    layers,
    width: packedWidth,
    height: boxes.length === 0 ? 0 : y + rowHeight,
  }
}

const packingScore = (
  packing: Readonly<{ width: number; height: number }>
): readonly number[] => {
  const aspect =
    packing.width > 0 && packing.height > 0
      ? packing.width / packing.height
      : PACKING_TARGET_ASPECT_RATIO
  return [
    Math.round(
      Math.abs(Math.log(aspect / PACKING_TARGET_ASPECT_RATIO)) * 1_000
    ),
    packing.width + packing.height,
    packing.width * packing.height,
  ]
}

const compareScore = (left: readonly number[], right: readonly number[]) => {
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

/**
 * Deterministic multi-component packing. A bounded portfolio of shelf widths is
 * cheap because translating a whole disconnected component preserves its
 * internal geometry; choosing a balanced drawing here costs no route solve.
 */
export const packComponents = (
  components: readonly LayoutGraphComponent[],
  placements: ReadonlyMap<string, LayeredComponentPlacement>,
  seed: "stable" | "current"
): PackedPlacement => {
  const gap = 4 * EDGES.NODE_CLEARANCE_PX
  const boxes: ComponentBox[] = components.map((component) => {
    const placement = placements.get(component.id)!
    return {
      component,
      placement,
      bounds: placementBounds(component, placement.positions),
      center: currentCenter(component),
    }
  })
  boxes.sort((left, right) =>
    seed === "current"
      ? left.center.y - right.center.y ||
        left.center.x - right.center.x ||
        compareLayoutId(left.component.id, right.component.id)
      : right.bounds.width * right.bounds.height -
          left.bounds.width * left.bounds.height ||
        Math.max(right.bounds.width, right.bounds.height) -
          Math.max(left.bounds.width, left.bounds.height) ||
        compareLayoutId(left.component.id, right.component.id)
  )
  const totalArea = boxes.reduce(
    (sum, box) => sum + (box.bounds.width + gap) * (box.bounds.height + gap),
    0
  )
  const widest = Math.max(0, ...boxes.map((box) => box.bounds.width))
  const targetWidths = [
    widest,
    Math.max(widest, Math.sqrt(totalArea)),
    Math.max(widest, Math.sqrt(totalArea * PACKING_TARGET_ASPECT_RATIO)),
    Math.max(widest, Math.sqrt(totalArea / PACKING_TARGET_ASPECT_RATIO)),
  ]
  let best:
    | Readonly<{
        packing: ReturnType<typeof packAtWidth>
        score: readonly number[]
        targetWidth: number
      }>
    | undefined
  for (const targetWidth of [...new Set(targetWidths)]) {
    const packing = packAtWidth(boxes, targetWidth, gap)
    const score = packingScore(packing)
    if (
      !best ||
      compareScore(score, best.score) < 0 ||
      (compareScore(score, best.score) === 0 && targetWidth < best.targetWidth)
    )
      best = { packing, score, targetWidth }
  }
  return {
    positions: best?.packing.positions ?? {},
    layers: best?.packing.layers ?? [],
  }
}
