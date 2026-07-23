import { useEffect, useMemo } from "react"
import {
  ConnectionLineComponentProps,
  ConnectionLineType,
  getStraightPath,
  Position,
  useStore,
  type Edge,
  type XYPosition,
} from "@xyflow/react"
import { CANVAS } from "@/constants"
import { pointsToSvgPath, type IPoint } from "@/edges/Connection"
import { useEdgeRoutingContext } from "@/hooks/useEdgeRoutingContext"
import {
  useDiagramStore,
  useEdgeGeometryStore,
  useMetadataStore,
} from "@/store/context"
import { useFreeformDropTarget } from "@/hooks/useFreeformDropTarget"
import {
  getDefaultEdgeType,
  getSideHandleIdForPosition,
  routeOrthogonalPath,
} from "@/utils/edgeUtils"
import type { ObstacleRect } from "@/utils/geometry/obstacles"
import {
  dropAnchorIsAimed,
  getConnectionMode,
  getEdgeAnchorFromPoint,
  getEdgeAnchorPoint,
} from "@/utils/connectionModes"
import { computeConnectionPreviewRoute } from "@/utils/geometry/edgeGeometrySolver"
import { STRAIGHT_PATH_STEP_EDGE_TYPES } from "@/edges/edgeRoutingBehavior"

// Avoid flashing a ghost for a stray click; hovering a target bypasses the gate.
const GHOST_MIN_DRAG_DISTANCE_PX = 40
const GHOST_STROKE_WIDTH = 2
const GHOST_DASH = "6 5"
const GHOST_SNAP_CIRCLE_RADIUS = 5

// Used only until onConnectStart supplies the id that determines the fan lane.
const PENDING_CONNECTION_FALLBACK_ID = "__apollon_pending_connection__"

const getConnectionPreviewPath = (
  connectionLineType: ConnectionLineType,
  from: IPoint,
  to: IPoint,
  fromPosition: Position,
  toPosition: Position,
  obstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][]
): string => {
  if (connectionLineType === ConnectionLineType.Straight) {
    const [path] = getStraightPath({
      sourceX: from.x,
      sourceY: from.y,
      targetX: to.x,
      targetY: to.y,
    })
    return path
  }

  return pointsToSvgPath(
    routeOrthogonalPath(
      from,
      to,
      fromPosition,
      toPosition,
      obstacles,
      neighborEdges
    )
  )
}

export const ConnectionPreviewLine = ({
  connectionLineStyle,
  connectionLineType,
  fromNode,
  fromHandle,
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  toNode,
  toHandle,
}: ConnectionLineComponentProps) => {
  const fromNodeId = fromNode?.id
  const nativeTargetId = toNode?.id
  const nativeTargetHandleId = toHandle?.id ?? undefined
  const nativeTargetPosition = toHandle?.position
  const resolveDropTarget = useFreeformDropTarget()
  const allNodes = useDiagramStore((state) => state.nodes)
  const nodeLookup = useStore((state) => state.nodeLookup)
  const connectionMode = useStore((state) => state.connectionMode)
  const diagramType = useMetadataStore((state) => state.diagramType)
  const previewEdgeType = getDefaultEdgeType(diagramType)
  const previewEnableStraightPath =
    STRAIGHT_PATH_STEP_EDGE_TYPES.has(previewEdgeType)
  const setPendingConnectionEdge = useMetadataStore(
    (state) => state.setPendingConnectionEdge
  )
  const pendingConnectionId = useMetadataStore(
    (state) => state.pendingConnectionId
  )
  const pendingEdgeId = pendingConnectionId ?? PENDING_CONNECTION_FALLBACK_ID
  const pendingSolvedRoute = useEdgeGeometryStore(
    (state) =>
      state.previewById[pendingEdgeId] ?? state.geometryById[pendingEdgeId]
  )

  const newConnection = useMemo(() => {
    const snap = (v: number) =>
      Math.round(v / CANVAS.SNAP_TO_GRID_PX) * CANVAS.SNAP_TO_GRID_PX
    const pointer: XYPosition = { x: snap(toX), y: snap(toY) }

    const hasNativeTarget =
      nativeTargetId !== undefined &&
      nativeTargetId !== fromNodeId &&
      nativeTargetPosition !== undefined
    const target = hasNativeTarget
      ? null
      : resolveDropTarget(pointer, fromNodeId)
    // Empty space resolves to the source node, which is not a preview target.
    const hit = target && target.id !== fromNodeId ? target : null
    const anchor = hit
      ? getEdgeAnchorFromPoint(hit.type, pointer, hit.rect)
      : null

    const freeformTarget =
      hit && anchor
        ? {
            ...getEdgeAnchorPoint(hit.type, hit.rect, anchor),
            showSnapCircle: getConnectionMode(hit.type) === "ellipse",
            id: hit.id,
          }
        : null

    const draggedFar =
      Math.hypot(toX - fromX, toY - fromY) >= GHOST_MIN_DRAG_DISTANCE_PX

    return {
      from: { x: fromX, y: fromY },
      to: hasNativeTarget
        ? { x: toX, y: toY }
        : (freeformTarget?.point ?? pointer),
      toPosition: hasNativeTarget
        ? nativeTargetPosition
        : (freeformTarget?.position ?? toPosition),
      targetId: hasNativeTarget ? nativeTargetId : freeformTarget?.id,
      targetHandle: hasNativeTarget
        ? nativeTargetHandleId
        : freeformTarget
          ? getSideHandleIdForPosition(freeformTarget.position)
          : undefined,
      targetAnchor: hit && dropAnchorIsAimed(hit.type) ? anchor : null,
      snapPoint: freeformTarget?.showSnapCircle ? freeformTarget.point : null,
      visible: draggedFar || hasNativeTarget || freeformTarget !== null,
    }
  }, [
    resolveDropTarget,
    fromNodeId,
    fromX,
    fromY,
    toX,
    toY,
    toPosition,
    nativeTargetId,
    nativeTargetHandleId,
    nativeTargetPosition,
  ])

  const pinnedTargetAnchor = newConnection.targetId
    ? newConnection.targetAnchor
    : null
  const previewSourceHandle = fromHandle?.id ?? undefined
  const previewTargetHandle = newConnection.targetHandle
  const pendingEdge = useMemo<Edge | null>(() => {
    if (!fromNodeId || !newConnection.targetId) return null
    return {
      id: pendingEdgeId,
      source: fromNodeId,
      target: newConnection.targetId,
      sourceHandle: previewSourceHandle,
      targetHandle: previewTargetHandle,
      type: previewEdgeType,
      data: pinnedTargetAnchor
        ? { points: [], targetAnchor: pinnedTargetAnchor }
        : { points: [] },
    }
  }, [
    fromNodeId,
    newConnection.targetId,
    previewSourceHandle,
    previewTargetHandle,
    pinnedTargetAnchor,
    previewEdgeType,
    pendingEdgeId,
  ])

  useEffect(() => {
    setPendingConnectionEdge(pendingEdge)
  }, [pendingEdge, setPendingConnectionEdge])
  useEffect(() => {
    return () => setPendingConnectionEdge(null)
  }, [setPendingConnectionEdge])

  const { obstacles, neighborEdges } = useEdgeRoutingContext({
    selfId: undefined,
    nodes: allNodes,
    sourceId: fromNodeId ?? "",
    targetId: newConnection.targetId ?? "",
    sourcePoint: newConnection.from,
    targetPoint: newConnection.to,
  })

  const path = useMemo(() => {
    if (!newConnection.visible) return { d: "", snapPoint: null }

    if (fromNodeId && newConnection.targetId) {
      if (pendingSolvedRoute && pendingSolvedRoute.length >= 2) {
        return {
          d: pointsToSvgPath(pendingSolvedRoute),
          snapPoint: pendingSolvedRoute[pendingSolvedRoute.length - 1],
        }
      }
      const previewRoute = computeConnectionPreviewRoute({
        sourceId: fromNodeId,
        targetId: newConnection.targetId,
        edgeType: previewEdgeType,
        enableStraightPath: previewEnableStraightPath,
        nodes: allNodes,
        nodeLookup,
        connectionMode,
        obstacles,
        neighborEdges,
      })
      if (previewRoute && previewRoute.length >= 2) {
        return {
          d: pointsToSvgPath(previewRoute),
          snapPoint: previewRoute[previewRoute.length - 1],
        }
      }
    }

    return {
      d: getConnectionPreviewPath(
        connectionLineType,
        newConnection.from,
        newConnection.to,
        fromPosition,
        newConnection.toPosition,
        obstacles,
        neighborEdges
      ),
      snapPoint: null,
    }
  }, [
    connectionLineType,
    fromNodeId,
    fromPosition,
    newConnection,
    obstacles,
    neighborEdges,
    allNodes,
    nodeLookup,
    connectionMode,
    previewEdgeType,
    previewEnableStraightPath,
    pendingSolvedRoute,
  ])

  const stroke =
    connectionLineStyle?.stroke ?? "var(--apollon-primary, #3e8acc)"

  return (
    <>
      <path
        d={path.d}
        fill="none"
        className="react-flow__connection-path"
        style={{
          ...connectionLineStyle,
          stroke,
          strokeWidth: GHOST_STROKE_WIDTH,
          strokeDasharray: GHOST_DASH,
          opacity: 1,
        }}
      />
      {path.snapPoint && (
        <circle
          className="apollon-connection-snap-circle"
          cx={path.snapPoint.x}
          cy={path.snapPoint.y}
          r={GHOST_SNAP_CIRCLE_RADIUS}
          fill="var(--apollon-primary, #3e8acc)"
        />
      )}
    </>
  )
}
