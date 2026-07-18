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
  generateUUID,
  getDefaultEdgeType,
  getSideHandleIdForPosition,
  type FreeformEdgeAnchor,
} from "@/utils"
import { getEdgeAnchorFromPoint } from "@/utils/connectionModes"
import { HandleId } from "@/nodes/wrappers"
import { useDiagramStore, useMetadataStore } from "@/store/context"
import { useFreeformDropTarget } from "./useFreeformDropTarget"
import { useShallow } from "zustand/shallow"

const withEndpointAnchor = (
  data: Edge["data"],
  endpoint: "source" | "target",
  anchor: FreeformEdgeAnchor | null
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

// Slot (0-8) of every connection handle within its side, derived from the
// HandleId enum's declaration order — the single source of truth — so adding or
// renaming a handle can't silently desync this from the real handles. Each id's
// first path segment names its side; slots increment per side in enum order
// (top-left … top-right, then right-top …). Built lazily on first use, not at
// module load: HandleId is defined in the node-wrapper module this hook is in an
// import cycle with, so it isn't initialised yet while this module's top-level
// code runs (the sibling path hooks likewise only read HandleId at call time).
let handleSlotBySideCache: Record<string, Record<string, number>> | null = null
const handleSlotBySide = (): Record<string, Record<string, number>> => {
  if (handleSlotBySideCache) return handleSlotBySideCache
  const bySide: Record<string, Record<string, number>> = {}
  const nextSlot: Record<string, number> = {}
  for (const handleId of Object.values(HandleId)) {
    const side = handleId.split("-")[0]
    bySide[side] ??= {}
    nextSlot[side] ??= 0
    bySide[side][handleId] = nextSlot[side]++
  }
  handleSlotBySideCache = bySide
  return bySide
}

const getHandleSideAndSlot = (
  handleId?: string | null
): { side: string; slot: number } | null => {
  if (!handleId) return null

  for (const [side, slots] of Object.entries(handleSlotBySide())) {
    const slot = slots[handleId]
    if (slot != null) return { side, slot }
  }

  return null
}

const isSameNodeSameHandleArea = (
  source: string | null,
  target: string | null,
  sourceHandle?: string | null,
  targetHandle?: string | null
): boolean => {
  if (!source || source !== target) return false

  const sourceHandlePosition = getHandleSideAndSlot(sourceHandle)
  const targetHandlePosition = getHandleSideAndSlot(targetHandle)

  if (!sourceHandlePosition || !targetHandlePosition) {
    return sourceHandle === targetHandle
  }

  return (
    sourceHandlePosition.side === targetHandlePosition.side &&
    Math.abs(sourceHandlePosition.slot - targetHandlePosition.slot) <= 1
  )
}

export const useConnect = () => {
  const startEdge = useRef<Edge | null>(null)
  const connectionStartParams = useRef<OnConnectStartParams | null>(null)
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow()
  const resolveDropTarget = useFreeformDropTarget()
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
  const setPendingConnectionEdge = useMetadataStore(
    (state) => state.setPendingConnectionEdge
  )
  const setPendingConnectionId = useMetadataStore(
    (state) => state.setPendingConnectionId
  )
  /** The id minted at drag start and shared with the preview; see `onConnectStart`. */
  const pendingConnectionId = useRef<string | null>(null)

  const defaultEdgeType = getDefaultEdgeType(diagramType)

  const getDropPosition = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event
      // Inherit the editor's grid snapping so a new edge snaps its endpoint to
      // the grid exactly like reconnect does; screenToFlowPosition is called
      // without overriding snapToGrid.
      return screenToFlowPosition({ x: clientX, y: clientY })
    },
    [screenToFlowPosition]
  )

  const onConnectStart: OnConnectStart = (event, params) => {
    connectionStartParams.current = params
    startEdge.current = null
    // Mint the committed edge's id NOW, so the live preview can be routed under the
    // same identity. Sibling lanes are settled by edge id (every geometric key ties
    // between parallels), so a preview under a different id lands in a different lane
    // and the bundle re-orders on release.
    pendingConnectionId.current = generateUUID()
    setPendingConnectionId(pendingConnectionId.current)
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
      // Withdraw the preview edge as the real one lands, so the solver never holds
      // both for a frame (which would fan them apart, then collapse — a flicker).
      setPendingConnectionEdge(null)
      if (
        isSameNodeSameHandleArea(
          connection.source,
          connection.target,
          connection.sourceHandle,
          connection.targetHandle
        )
      ) {
        return
      }

      const newEdge: Edge = {
        ...connection,
        id: generateUUID(),
        type: defaultEdgeType,
        selected: false,
      }

      addEdge(newEdge)
    },
    [addEdge, defaultEdgeType, setPendingConnectionEdge]
  )

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      try {
        if (!connectionState.isValid) {
          const dropPosition = getDropPosition(event)
          const nodeOnTop = resolveDropTarget(
            dropPosition,
            connectionState.fromNode?.id
          )
          if (!nodeOnTop) return

          const targetRect = nodeOnTop.rect
          // Shape-aware: the anchor lands on the node's real shape (oval curve,
          // diamond vertex, interface centre, …), not just its bounding box.
          const targetAnchor = getEdgeAnchorFromPoint(
            nodeOnTop.type,
            dropPosition,
            targetRect
          )
          if (!targetAnchor) return // node is not a connection target (mode "none")
          const targetHandle = getSideHandleIdForPosition(targetAnchor.side)

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
              isSameNodeSameHandleArea(
                newEdge.source,
                newEdge.target,
                newEdge.sourceHandle,
                newEdge.targetHandle
              )
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
              isSameNodeSameHandleArea(
                sourceNodeId,
                nodeOnTop.id,
                sourceHandleId,
                targetHandle
              )
            ) {
              return
            }

            // Create a FULLY AUTO edge (no pinned target anchor): the auto-anchor
            // selector picks the best attachment, exactly as the live ghost/pending
            // preview showed — so the edge lands where it previewed and the
            // neighbours that made room stay put, instead of snapping to the drop
            // pixel and jumping. A user who wants a specific spot drags the endpoint
            // afterward (which writes the custom anchor then).
            setEdges((eds) =>
              eds.concat({
                id: pendingConnectionId.current ?? generateUUID(),
                source: sourceNodeId,
                target: nodeOnTop.id,
                type: defaultEdgeType,
                sourceHandle: sourceHandleId,
                targetHandle,
                data: { points: [] },
              })
            )
          }
        }
      } finally {
        startEdge.current = null
        connectionStartParams.current = null
        stopConnectionGuidance()
        // Every path out of a connection gesture — commit, cancel, invalid drop —
        // withdraws the preview edge and its id, so neither outlives the drag.
        setPendingConnectionEdge(null)
        setPendingConnectionId(null)
        pendingConnectionId.current = null
      }
    },
    [
      defaultEdgeType,
      edges,
      getDropPosition,
      resolveDropTarget,
      setEdges,
      stopConnectionGuidance,
      setPendingConnectionEdge,
      setPendingConnectionId,
    ]
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(() => {
    startEdge.current = null
    connectionStartParams.current = null
    stopConnectionGuidance()
  }, [stopConnectionGuidance])

  return { onConnect, onConnectEnd, onConnectStart, onEdgesDelete }
}
