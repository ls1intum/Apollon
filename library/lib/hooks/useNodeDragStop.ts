import { useCallback } from "react"
import { type OnNodeDrag, type Node, useReactFlow } from "@xyflow/react"
import {
  getPositionOnCanvas,
  isParentNodeType,
  resizeAllParents,
  sortNodesTopologically,
} from "@/utils"
import { canDropIntoParent } from "@/utils/bpmnConstraints"
import { MOUSE_UP_OFFSET_IN_PIXELS } from "@/constants"
import { useDiagramStore, useAlignmentGuidesStore } from "@/store/context"
import { useShallow } from "zustand/shallow"

export const useNodeDragStop = () => {
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow()
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      setNodes: state.setNodes,
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

      const draggedLastPoint = screenToFlowPosition({
        x:
          "changedTouches" in event
            ? // event is handled as Mouse event in the library but also it is touch event for mobile users
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (event as any).changedTouches[0].clientX
            : event.clientX,
        y:
          "changedTouches" in event
            ? // event is handled as Mouse event in the library but also it is touch event for mobile users
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (event as any).changedTouches[0].clientY
            : event.clientY,
      })

      const intersectionsWithDroppedLocation = getIntersectingNodes({
        x: draggedLastPoint.x,
        y: draggedLastPoint.y,
        width: MOUSE_UP_OFFSET_IN_PIXELS,
        height: MOUSE_UP_OFFSET_IN_PIXELS,
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
            updatedNodes.map((n) => (n.id === updatedNode.id ? updatedNode : n))
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
    },
    [screenToFlowPosition, nodes, getIntersectingNodes, setNodes, clearGuides]
  )

  return onNodeDragStop
}
