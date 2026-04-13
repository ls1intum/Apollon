import {
  type Edge,
  Connection,
  useReactFlow,
  OnConnectEnd,
  OnConnectStart,
  OnConnectStartParams,
  OnEdgesDelete,
} from "@xyflow/react"
import { useCallback, useRef } from "react"
import { findClosestHandle, generateUUID, getDefaultEdgeType } from "@/utils"
import { DiagramNodeTypeRecord } from "@/nodes"
import { useDiagramStore, useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"

export const useConnect = () => {
  const startEdge = useRef<Edge | null>(null)
  const connectionStartParams = useRef<OnConnectStartParams | null>(null)
  const { screenToFlowPosition, getIntersectingNodes, getInternalNode } =
    useReactFlow()
  const { setEdges, addEdge, edges } = useDiagramStore(
    useShallow((state) => ({
      setEdges: state.setEdges,
      addEdge: state.addEdge,
      edges: state.edges,
    }))
  )

  const diagramType = useMetadataStore(useShallow((state) => state.diagramType))

  const defaultEdgeType = getDefaultEdgeType(diagramType)

  const isFourHandleNode = useCallback(
    (nodeType?: string) =>
      nodeType === DiagramNodeTypeRecord.componentInterface ||
      nodeType === DiagramNodeTypeRecord.petriNetPlace ||
      nodeType === DiagramNodeTypeRecord.petriNetTransition ||
      nodeType === DiagramNodeTypeRecord.sfcTransitionBranch,
    []
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
      const newEdge: Edge = {
        ...connection,
        id: generateUUID(),
        type: defaultEdgeType,
        selected: false,
      }

      addEdge(newEdge)
    },
    [addEdge, defaultEdgeType]
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

        const targetHandle = findClosestHandle({
          point: dropPosition,
          rect: {
            x: internalNodeData.internals.positionAbsolute.x,
            y: internalNodeData.internals.positionAbsolute.y,
            width: nodeOnTop.width,
            height: nodeOnTop.height,
          },
          useFourHandles: isFourHandleNode(nodeOnTop.type),
        })

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

          // Disallow loop from a handle to itself, but allow loops to other handles.
          if (
            sourceNodeId === nodeOnTop.id &&
            sourceHandleId === targetHandle
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
              sourceHandle: sourceHandleId,
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
      getDropPosition,
      getInternalNode,
      getIntersectingNodes,
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
