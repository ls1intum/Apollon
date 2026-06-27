import { useCallback } from "react"
import { type OnNodeDrag, type Node, useReactFlow } from "@xyflow/react"
import {
  getPositionOnCanvas,
  isParentNodeType,
  resizeAllParents,
  sortNodesTopologically,
} from "@/utils"
import { canDropIntoParent } from "@/utils/bpmnConstraints"
import { CANVAS } from "@/constants"
import { useDiagramStore, useAlignmentGuidesStore } from "@/store/context"
import { useShallow } from "zustand/shallow"

export const useNodeDragStop = () => {
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow()
  const { nodes, setNodes, endTransientNodeBroadcast } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      setNodes: state.setNodes,
      endTransientNodeBroadcast: state.endTransientNodeBroadcast,
    }))
  )

  const { clearGuides } = useAlignmentGuidesStore(
    useShallow((state) => ({
      clearGuides: state.clearGuides,
    }))
  )

  const onNodeDragStop: OnNodeDrag<Node> = useCallback(
    (event, draggedNode) => {
      // Clear alignment guides when drag stops
      clearGuides()

      // Tear down the peers' live-drag overlay once this handler's settle
      // `setNodes` (below, every branch) has committed the final position to
      // the document — `finally` guarantees the order, so peers apply the
      // durable position before the overlay is removed (no snap-back). The
      // dragging:false `onNodesChange` frame usually carries the same position
      // as the last drag frame and short-circuits, so this is the drag path's
      // clear; resize (no drag-stop) clears from `onNodesChange` instead.
      try {
        const draggedLastPoint = screenToFlowPosition({
          // The library types this as a MouseEvent, but on mobile it's a
          // TouchEvent; read the touch point when `changedTouches` is present.
          x:
            "changedTouches" in event
              ? (event.changedTouches as TouchList)[0].clientX
              : event.clientX,
          y:
            "changedTouches" in event
              ? (event.changedTouches as TouchList)[0].clientY
              : event.clientY,
        })

        const intersectionsWithDroppedLocation = getIntersectingNodes({
          x: draggedLastPoint.x,
          y: draggedLastPoint.y,
          width: CANVAS.MOUSE_UP_OFFSET_PX,
          height: CANVAS.MOUSE_UP_OFFSET_PX,
        }).filter((n) => {
          return (
            isParentNodeType(n.type) &&
            n.id !== draggedNode.id &&
            n.type &&
            draggedNode.type &&
            canDropIntoParent(draggedNode.type, n.type)
          )
        })

        const parentNode = intersectionsWithDroppedLocation.length
          ? intersectionsWithDroppedLocation[
              intersectionsWithDroppedLocation.length - 1
            ]
          : null

        if (!parentNode) {
          const updatedNode = nodes.map((n) =>
            n.id === draggedNode.id
              ? {
                  ...draggedNode,
                  position: getPositionOnCanvas(draggedNode, nodes),
                  parentId: undefined,
                }
              : n
          )
          setNodes(updatedNode)
          return
        }

        const isThisNewParent =
          parentNode && parentNode?.id !== draggedNode.parentId

        if (isThisNewParent) {
          const updatedNode: Node = {
            ...structuredClone(draggedNode),
            position: getPositionOnCanvas(draggedNode, nodes),
            parentId: undefined,
          }
          const parentsFlowPosition = getPositionOnCanvas(parentNode, nodes)

          updatedNode.position.x -= parentsFlowPosition.x
          updatedNode.position.y -= parentsFlowPosition.y
          updatedNode.parentId = parentNode.id

          const updatedNodes = structuredClone(nodes)
          const updatedNodesList = sortNodesTopologically(
            resizeAllParents(
              updatedNode,
              updatedNodes.map((n) =>
                n.id === updatedNode.id ? updatedNode : n
              )
            )
          )

          setNodes(updatedNodesList)
          return
        }

        if (draggedNode.parentId) {
          const updatedNodes = structuredClone(nodes)
          const updatedNodesList = sortNodesTopologically(
            resizeAllParents(
              draggedNode,
              updatedNodes.map((n) =>
                n.id === draggedNode.id ? { ...draggedNode } : n
              )
            )
          )
          setNodes(updatedNodesList)
        }
      } finally {
        endTransientNodeBroadcast()
      }
    },
    [
      screenToFlowPosition,
      nodes,
      getIntersectingNodes,
      setNodes,
      clearGuides,
      endTransientNodeBroadcast,
    ]
  )

  return onNodeDragStop
}
