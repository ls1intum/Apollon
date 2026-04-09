import {
  type Edge,
  Connection,
  Node,
  Position,
  useReactFlow,
  OnConnectEnd,
  OnConnectStart,
  OnConnectStartParams,
  OnEdgesDelete,
} from "@xyflow/react"
import { useCallback, useRef } from "react"
import { CANVAS } from "@/constants"
import { findClosestHandle, generateUUID, getDefaultEdgeType } from "@/utils"
import { DiagramNodeTypeRecord } from "@/nodes"
import { useDiagramStore, useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"

export const useConnect = () => {
  const startEdge = useRef<Edge | null>(null)
  const connectionStartParams = useRef<OnConnectStartParams | null>(null)
  const {
    screenToFlowPosition,
    getIntersectingNodes,
    getInternalNode,
    getNode,
  } = useReactFlow()
  const { setEdges, addEdge, edges } = useDiagramStore(
    useShallow((state) => ({
      setEdges: state.setEdges,
      addEdge: state.addEdge,
      edges: state.edges,
    }))
  )

  const diagramType = useMetadataStore(useShallow((state) => state.diagramType))

  const defaultEdgeType = getDefaultEdgeType(diagramType)
  const snapGap = CANVAS.SNAP_TO_GRID_PX * 2

  const clamp = useCallback((value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value))
  }, [])

  const getSnapSteps = useCallback(
    (size: number) => Math.max(2, Math.floor(size / snapGap)),
    [snapGap]
  )

  const isFourHandleNode = useCallback(
    (nodeType?: string) =>
      nodeType === DiagramNodeTypeRecord.componentInterface ||
      nodeType === DiagramNodeTypeRecord.petriNetPlace ||
      nodeType === DiagramNodeTypeRecord.petriNetTransition ||
      nodeType === DiagramNodeTypeRecord.sfcTransitionBranch,
    []
  )

  const getClosestFallbackHandle = useCallback(
    (node: Node, point: { x: number; y: number }) => {
      const internalNodeData = getInternalNode(node.id)
      if (!internalNodeData || node.width == null || node.height == null) {
        return null
      }

      return findClosestHandle({
        point,
        rect: {
          x: internalNodeData.internals.positionAbsolute.x,
          y: internalNodeData.internals.positionAbsolute.y,
          width: node.width,
          height: node.height,
        },
        useFourHandles: isFourHandleNode(node.type),
      })
    },
    [getInternalNode, isFourHandleNode]
  )

  const getClosestSnapHandle = useCallback(
    (node: Node, point: { x: number; y: number }) => {
      const internalNodeData = getInternalNode(node.id)
      if (!internalNodeData || node.width == null || node.height == null) {
        return getClosestFallbackHandle(node, point)
      }

      const left = internalNodeData.internals.positionAbsolute.x
      const top = internalNodeData.internals.positionAbsolute.y
      const width = node.width
      const height = node.height
      const right = left + width
      const bottom = top + height

      const distances = [
        { side: Position.Top, distance: Math.abs(point.y - top) },
        { side: Position.Right, distance: Math.abs(point.x - right) },
        { side: Position.Bottom, distance: Math.abs(point.y - bottom) },
        { side: Position.Left, distance: Math.abs(point.x - left) },
      ]

      distances.sort((a, b) => a.distance - b.distance)
      const nearestSide = distances[0]?.side

      if (nearestSide === Position.Top || nearestSide === Position.Bottom) {
        const steps = getSnapSteps(width)
        const ratio = clamp((point.x - left) / width, 0, 1)
        const index = Math.round(ratio * steps)
        const side = nearestSide === Position.Top ? "top" : "bottom"

        return `${side}-snap-${index}`
      }

      if (nearestSide === Position.Left || nearestSide === Position.Right) {
        const steps = getSnapSteps(height)
        const ratio = clamp((point.y - top) / height, 0, 1)
        const index = Math.round(ratio * steps)
        const side = nearestSide === Position.Left ? "left" : "right"

        return `${side}-snap-${index}`
      }

      return getClosestFallbackHandle(node, point)
    },
    [clamp, getClosestFallbackHandle, getInternalNode, getSnapSteps]
  )
  const getDropPosition = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event
      return screenToFlowPosition(
        { x: clientX, y: clientY },
        { snapToGrid: false }
      )
    },
    [screenToFlowPosition]
  )

  const onConnectStart: OnConnectStart = (event, params) => {
    connectionStartParams.current = params
    startEdge.current = null
    const dropPosition = getDropPosition(event)

    const intersectingNodes = getIntersectingNodes({
      x: dropPosition.x - 60,
      y: dropPosition.y - 60,
      width: 120,
      height: 120,
    })
    const intersectingNodesIds = intersectingNodes.map((node) => node.id)

    const existingEdges = [
      ...edges.filter(
        (edge) =>
          edge.source === params.nodeId &&
          edge.sourceHandle === params.handleId &&
          intersectingNodesIds.includes(edge.target)
      ),
      ...edges.filter(
        (edge) =>
          edge.target === params.nodeId &&
          edge.targetHandle === params.handleId &&
          intersectingNodesIds.includes(edge.source)
      ),
    ]

    if (existingEdges.length > 0) {
      startEdge.current = existingEdges[existingEdges.length - 1]
    }
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      let targetHandle = connection.targetHandle

      if (connection.target && !targetHandle && connection.source) {
        const sourceNode = getNode(connection.source)
        const sourceInternalNode = getInternalNode(connection.source)
        const targetNode = getNode(connection.target)

        if (
          sourceNode &&
          sourceInternalNode &&
          sourceNode.width != null &&
          sourceNode.height != null &&
          targetNode
        ) {
          const sourceCenter = {
            x:
              sourceInternalNode.internals.positionAbsolute.x +
              sourceNode.width / 2,
            y:
              sourceInternalNode.internals.positionAbsolute.y +
              sourceNode.height / 2,
          }

          targetHandle = getClosestSnapHandle(targetNode, sourceCenter)
        }
      }

      const newEdge: Edge = {
        ...connection,
        targetHandle,
        id: generateUUID(),
        type: defaultEdgeType,
        selected: false,
      }

      addEdge(newEdge)
    },
    [addEdge, defaultEdgeType, getClosestSnapHandle, getInternalNode, getNode]
  )

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectionState.isValid) {
        const dropPosition = getDropPosition(event)
        const intersectingNodes = getIntersectingNodes({
          x: dropPosition.x - 5,
          y: dropPosition.y - 5,
          width: 10,
          height: 10,
        })

        if (intersectingNodes.length === 0) return

        const fromNodeId = connectionState.fromNode?.id
        const nodeOnTop =
          intersectingNodes.findLast((node) => node.id !== fromNodeId) ??
          intersectingNodes[intersectingNodes.length - 1]

        const targetHandle = getClosestSnapHandle(nodeOnTop, dropPosition)

        if (!targetHandle) return

        if (startEdge.current) {
          const updatedEdge = edges.find(
            (edge) => edge.id === startEdge.current?.id
          )

          if (!updatedEdge) return
          const newEdge =
            connectionStartParams.current?.handleType === "source"
              ? { ...updatedEdge, target: nodeOnTop.id, targetHandle }
              : {
                  ...updatedEdge,
                  source: nodeOnTop.id,
                  sourceHandle: targetHandle,
                }

          setEdges((eds) =>
            eds.map((edge) => (edge.id === newEdge.id ? newEdge : edge))
          )
        } else {
          setEdges((eds) =>
            eds.concat({
              id: generateUUID(),
              source: connectionState.fromNode!.id,
              target: nodeOnTop.id,
              type: defaultEdgeType,
              sourceHandle: connectionState.fromHandle?.id,
              targetHandle,
            })
          )
        }
      }
      startEdge.current = null
      connectionStartParams.current = null
    },
    [
      defaultEdgeType,
      edges,
      getClosestSnapHandle,
      getDropPosition,
      getIntersectingNodes,
      setEdges,
    ]
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(() => {
    startEdge.current = null
    connectionStartParams.current = null
  }, [setEdges])

  return { onConnect, onConnectEnd, onConnectStart, onEdgesDelete }
}
