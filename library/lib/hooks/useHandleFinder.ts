import { useCallback } from "react"
import { type Node, useReactFlow } from "@xyflow/react"
import { findClosestHandle } from "../utils/edgeUtils"
import { getNodeHandleConfig } from "@/nodes/handles/nodeHandleConfig"
import { log } from "../logger"

interface HandleFinderResult {
  handle: string | null
  node: Node | null
  shouldClearPoints: boolean
}

export const useHandleFinder = () => {
  const {
    screenToFlowPosition,
    getIntersectingNodes,
    getInternalNode,
    getZoom,
  } = useReactFlow()

  const findBestHandleAtClientPosition = useCallback(
    (clientX: number, clientY: number): HandleFinderResult => {
      const dropPosition = screenToFlowPosition({
        x: clientX,
        y: clientY,
      })

      const intersectingNodes = getIntersectingNodes({
        x: dropPosition.x - 1,
        y: dropPosition.y - 1,
        width: 2,
        height: 2,
      })

      if (intersectingNodes.length === 0) {
        return {
          handle: null,
          node: null,
          shouldClearPoints: true,
        }
      }
      const nodeOnTop = intersectingNodes[intersectingNodes.length - 1]
      const internalNodeData = getInternalNode(nodeOnTop.id)

      if (!internalNodeData) {
        log.warn("No internal node data found for:", nodeOnTop.id)
        return {
          handle: null,
          node: null,
          shouldClearPoints: true,
        }
      }
      if (nodeOnTop.width == null || nodeOnTop.height == null) {
        log.warn("Node dimensions not available:", nodeOnTop.id)
        return {
          handle: null,
          node: null,
          shouldClearPoints: true,
        }
      }
      const nodeBounds = {
        x: internalNodeData.internals.positionAbsolute.x,
        y: internalNodeData.internals.positionAbsolute.y,
        width: nodeOnTop.width,
        height: nodeOnTop.height,
      }
      const config = getNodeHandleConfig(nodeOnTop.type)
      if (config.variant === "none") {
        return { handle: null, node: null, shouldClearPoints: true }
      }

      const handle = findClosestHandle({
        point: dropPosition,
        rect: nodeBounds,
        variant: config.variant === "center" ? "center" : "key",
        excludeCorners: config.excludeCorners,
        zoom: getZoom(),
      })
      return {
        handle,
        node: nodeOnTop,
        shouldClearPoints: false,
      }
    },
    [screenToFlowPosition, getIntersectingNodes, getInternalNode, getZoom]
  )

  const findBestHandle = useCallback(
    (upEvent: PointerEvent): HandleFinderResult =>
      findBestHandleAtClientPosition(upEvent.clientX, upEvent.clientY),
    [findBestHandleAtClientPosition]
  )

  return { findBestHandle, findBestHandleAtClientPosition }
}
