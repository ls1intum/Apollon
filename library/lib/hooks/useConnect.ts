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
import {
  findClosestHandle,
  generateUUID,
  getDefaultEdgeType,
  getFreeformAnchorFromPoint,
  getSideHandleIdForPosition,
} from "@/utils"
import { DiagramNodeTypeRecord } from "@/nodes"
import { useDiagramStore, useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"

const withEndpointAnchor = (
  data: Edge["data"],
  endpoint: "source" | "target",
  anchor: ReturnType<typeof getFreeformAnchorFromPoint> | null
): Edge["data"] => {
  const nextData = { ...((data ?? {}) as Record<string, unknown>) }
  const key = endpoint === "source" ? "sourceAnchor" : "targetAnchor"

  if (anchor) {
    nextData[key] = anchor
  } else {
    delete nextData[key]
  }

  if (!Array.isArray(nextData.points)) {
    nextData.points = []
  }

  return nextData
}

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
  const { startConnectionGuidance, stopConnectionGuidance } = useMetadataStore(
    useShallow((state) => ({
      startConnectionGuidance: state.startConnectionGuidance,
      stopConnectionGuidance: state.stopConnectionGuidance,
    }))
  )

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
    startConnectionGuidance(params.nodeId ?? null, params.handleId ?? null)
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
      try {
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

          const targetRect = {
            x: internalNodeData.internals.positionAbsolute.x,
            y: internalNodeData.internals.positionAbsolute.y,
            width: nodeOnTop.width,
            height: nodeOnTop.height,
          }
          const targetAnchor = getFreeformAnchorFromPoint(
            dropPosition,
            targetRect
          )
          const targetHandle = targetAnchor
            ? getSideHandleIdForPosition(targetAnchor.side)
            : findClosestHandle({
                point: dropPosition,
                rect: targetRect,
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
                ? {
                    ...updatedEdge,
                    target: nodeOnTop.id,
                    targetHandle,
                    data: withEndpointAnchor(
                      updatedEdge.data,
                      "target",
                      targetAnchor
                    ),
                  }
                : {
                    ...updatedEdge,
                    source: nodeOnTop.id,
                    sourceHandle: targetHandle,
                    data: withEndpointAnchor(
                      updatedEdge.data,
                      "source",
                      targetAnchor
                    ),
                  }

            // Disallow loop from a handle to the same handle on the same node.
            if (
              newEdge.source === newEdge.target &&
              newEdge.sourceHandle === newEdge.targetHandle
            ) {
              return
            }

            setEdges((eds) =>
              eds.map((edge) => (edge.id === newEdge.id ? newEdge : edge))
            )
          } else {
            const sourceNodeId = connectionState.fromNode!.id
            const sourceHandleId = connectionState.fromHandle?.id

            // Disallow loop from a handle to the same handle on the same node.
            if (
              sourceNodeId === nodeOnTop.id &&
              sourceHandleId === targetHandle
            ) {
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
                data: withEndpointAnchor(undefined, "target", targetAnchor),
              })
            )
          }
        }
      } finally {
        startEdge.current = null
        connectionStartParams.current = null
        stopConnectionGuidance()
      }
    },
    [
      defaultEdgeType,
      edges,
      getDropPosition,
      getInternalNode,
      getIntersectingNodes,
      isFourHandleNode,
      setEdges,
      stopConnectionGuidance,
    ]
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(() => {
    startEdge.current = null
    connectionStartParams.current = null
    stopConnectionGuidance()
  }, [stopConnectionGuidance])

  return { onConnect, onConnectEnd, onConnectStart, onEdgesDelete }
}
