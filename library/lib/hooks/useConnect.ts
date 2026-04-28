import {
  type Edge,
  Connection,
  useReactFlow,
  OnConnectEnd,
  OnConnectStart,
  OnConnectStartParams,
  OnEdgesDelete,
  ConnectionLineType,
} from "@xyflow/react"
import { useCallback, useRef } from "react"
import {
  findClosestHandle,
  findStraightConnectionHandles,
  getConnectionLineType,
  generateUUID,
  getDefaultEdgeType,
} from "@/utils"
import { DiagramNodeTypeRecord } from "@/nodes"
import { useDiagramStore, useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"

type ConnectionHandles = {
  sourceHandle?: string | null
  targetHandle?: string | null
}

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
  const shouldOptimizeStraightHandles =
    getConnectionLineType(diagramType) === ConnectionLineType.Step

  const isFourHandleNode = useCallback(
    (nodeType?: string) =>
      nodeType === DiagramNodeTypeRecord.bpmnStartEvent ||
      nodeType === DiagramNodeTypeRecord.bpmnIntermediateEvent ||
      nodeType === DiagramNodeTypeRecord.bpmnEndEvent ||
      nodeType === DiagramNodeTypeRecord.bpmnGateway ||
      nodeType === DiagramNodeTypeRecord.componentInterface ||
      nodeType === DiagramNodeTypeRecord.flowchartInputOutput ||
      nodeType === DiagramNodeTypeRecord.petriNetPlace ||
      nodeType === DiagramNodeTypeRecord.petriNetTransition ||
      nodeType === DiagramNodeTypeRecord.sfcTransitionBranch,
    []
  )

  const getNodeRect = useCallback(
    (nodeId: string) => {
      const node = getNode(nodeId)
      const internalNodeData = getInternalNode(nodeId)

      if (
        !node ||
        !internalNodeData ||
        node.width == null ||
        node.height == null
      ) {
        return null
      }

      return {
        node,
        rect: {
          x: internalNodeData.internals.positionAbsolute.x,
          y: internalNodeData.internals.positionAbsolute.y,
          width: node.width,
          height: node.height,
        },
      }
    },
    [getInternalNode, getNode]
  )

  const getStraightConnectionHandles = useCallback(
    ({
      sourceNodeId,
      targetNodeId,
      sourceHandle,
      targetHandle,
      targetPoint,
      allowSourceHandleAdjustment,
    }: {
      sourceNodeId: string
      targetNodeId: string
      sourceHandle?: string | null
      targetHandle?: string | null
      targetPoint?: { x: number; y: number }
      allowSourceHandleAdjustment?: boolean
    }) => {
      if (!shouldOptimizeStraightHandles) {
        return null
      }

      const sourceNodeInfo = getNodeRect(sourceNodeId)
      const targetNodeInfo = getNodeRect(targetNodeId)

      if (!sourceNodeInfo || !targetNodeInfo) {
        return null
      }

      return findStraightConnectionHandles({
        sourceRect: sourceNodeInfo.rect,
        targetRect: targetNodeInfo.rect,
        sourceHandle,
        targetHandle,
        targetPoint,
        useFourSourceHandles: isFourHandleNode(sourceNodeInfo.node.type),
        useFourTargetHandles: isFourHandleNode(targetNodeInfo.node.type),
        allowSourceHandleAdjustment,
      })
    },
    [getNodeRect, isFourHandleNode, shouldOptimizeStraightHandles]
  )

  const getPreferredConnectionHandles = useCallback(
    ({
      sourceNodeId,
      targetNodeId,
      sourceHandle,
      targetHandle,
      targetPoint,
      allowSourceHandleAdjustment,
    }: {
      sourceNodeId: string
      targetNodeId: string
      sourceHandle?: string | null
      targetHandle?: string | null
      targetPoint?: { x: number; y: number }
      allowSourceHandleAdjustment?: boolean
    }): ConnectionHandles => {
      const fallbackConnection = { sourceHandle, targetHandle }
      const straightConnection = getStraightConnectionHandles({
        sourceNodeId,
        targetNodeId,
        sourceHandle,
        targetHandle,
        targetPoint,
        allowSourceHandleAdjustment,
      })

      return {
        sourceHandle:
          straightConnection?.sourceHandle ?? fallbackConnection.sourceHandle,
        targetHandle:
          straightConnection?.targetHandle ?? fallbackConnection.targetHandle,
      }
    },
    [getStraightConnectionHandles]
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
      const preferredHandles = getPreferredConnectionHandles({
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        allowSourceHandleAdjustment: true,
      })

      const newEdge: Edge = {
        ...connection,
        sourceHandle: preferredHandles.sourceHandle,
        targetHandle: preferredHandles.targetHandle,
        id: generateUUID(),
        type: defaultEdgeType,
        selected: false,
      }

      addEdge(newEdge)
    },
    [addEdge, defaultEdgeType, getPreferredConnectionHandles]
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

        const internalNodeData = getInternalNode(nodeOnTop.id)

        if (
          !internalNodeData ||
          nodeOnTop.width == null ||
          nodeOnTop.height == null
        )
          return

        const closestTargetHandle = findClosestHandle({
          point: dropPosition,
          rect: {
            x: internalNodeData.internals.positionAbsolute.x,
            y: internalNodeData.internals.positionAbsolute.y,
            width: nodeOnTop.width,
            height: nodeOnTop.height,
          },
          useFourHandles: isFourHandleNode(nodeOnTop.type),
        })

        if (!closestTargetHandle) return

        const targetHandle = closestTargetHandle

        if (startEdge.current) {
          const updatedEdge = edges.find(
            (edge) => edge.id === startEdge.current?.id
          )

          if (!updatedEdge) return
          const preferredHandles =
            connectionStartParams.current?.handleType === "source"
              ? getPreferredConnectionHandles({
                  sourceNodeId: updatedEdge.source,
                  targetNodeId: nodeOnTop.id,
                  sourceHandle: updatedEdge.sourceHandle,
                  targetHandle,
                  targetPoint: dropPosition,
                })
              : getPreferredConnectionHandles({
                  sourceNodeId: nodeOnTop.id,
                  targetNodeId: updatedEdge.target,
                  sourceHandle: targetHandle,
                  targetHandle: updatedEdge.targetHandle,
                  targetPoint: dropPosition,
                })

          const newEdge =
            connectionStartParams.current?.handleType === "source"
              ? {
                  ...updatedEdge,
                  target: nodeOnTop.id,
                  targetHandle: preferredHandles.targetHandle,
                }
              : {
                  ...updatedEdge,
                  source: nodeOnTop.id,
                  sourceHandle: preferredHandles.sourceHandle,
                }

          // Disallow loop from a handle to the same handle on the same node.
          if (
            newEdge.source === newEdge.target &&
            newEdge.sourceHandle === newEdge.targetHandle
          ) {
            startEdge.current = null
            connectionStartParams.current = null
            return
          }

          setEdges((eds) =>
            eds.map((edge) => (edge.id === newEdge.id ? newEdge : edge))
          )
        } else {
          const sourceNodeId = connectionState.fromNode!.id
          const sourceHandleId = connectionState.fromHandle?.id
          const preferredHandles = getPreferredConnectionHandles({
            sourceNodeId,
            targetNodeId: nodeOnTop.id,
            sourceHandle: sourceHandleId,
            targetHandle,
            targetPoint: dropPosition,
            allowSourceHandleAdjustment: true,
          })

          // Disallow loop from a handle to itself, but allow loops to other handles.
          if (
            sourceNodeId === nodeOnTop.id &&
            preferredHandles.sourceHandle === preferredHandles.targetHandle
          ) {
            startEdge.current = null
            connectionStartParams.current = null
            return
          }

          setEdges((eds) =>
            eds.concat({
              id: generateUUID(),
              source: sourceNodeId,
              target: nodeOnTop.id,
              type: defaultEdgeType,
              sourceHandle: preferredHandles.sourceHandle,
              targetHandle: preferredHandles.targetHandle,
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
      getDropPosition,
      getInternalNode,
      getIntersectingNodes,
      getPreferredConnectionHandles,
      isFourHandleNode,
      setEdges,
    ]
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(() => {
    startEdge.current = null
    connectionStartParams.current = null
  }, [setEdges])

  return { onConnect, onConnectEnd, onConnectStart, onEdgesDelete }
}
