import { useCallback } from "react"
import { useReactFlow, type Node, type Rect } from "@xyflow/react"
import { getPositionOnCanvas, isParentNodeType } from "@/utils"
import { distanceToRect } from "@/utils/connectionModes"
import type { IPoint } from "../edges/Connection"

// While dragging a freeform edge endpoint, it snaps to a node within this many
// px of the node's box.
export const FREEFORM_ENDPOINT_SNAP_RADIUS_PX = 48

/**
 * Node-rect helpers shared by both edge path hooks' endpoint-drag logic: the
 * on-canvas rectangle of a node, and the nearest connectable (non-parent) node
 * to a point within the snap radius (the fallback when nothing intersects the
 * pointer directly).
 */
export function useFreeformEndpointNode() {
  const { getNodes } = useReactFlow()

  const getNodeRect = useCallback(
    (node: Node): Rect | null => {
      const nodes = getNodes()
      const currentNode = nodes.find((candidate) => candidate.id === node.id)
      const resolvedNode = currentNode ?? node
      const width = resolvedNode.width ?? 0
      const height = resolvedNode.height ?? 0

      if (!width || !height) return null

      const position = getPositionOnCanvas(resolvedNode, nodes)
      return { x: position.x, y: position.y, width, height }
    },
    [getNodes]
  )

  const findFreeformEndpointNode = useCallback(
    (flowPoint: IPoint): { node: Node; rect: Rect } | null => {
      const nodes = getNodes()
      let best: { node: Node; rect: Rect; distance: number } | null = null

      for (const node of nodes) {
        if (isParentNodeType(node.type)) continue

        const rect = getNodeRect(node)
        if (!rect) continue

        const distance = distanceToRect(flowPoint, rect)

        if (
          distance <= FREEFORM_ENDPOINT_SNAP_RADIUS_PX &&
          (!best || distance < best.distance)
        ) {
          best = { node, rect, distance }
        }
      }

      return best ? { node: best.node, rect: best.rect } : null
    },
    [getNodeRect, getNodes]
  )

  return { getNodeRect, findFreeformEndpointNode }
}
