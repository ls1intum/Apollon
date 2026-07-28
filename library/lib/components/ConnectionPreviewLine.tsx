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
  getNativeConnectionAnchor,
  getNativeConnectionRect,
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
  connectionStatus,
  toNode,
  toHandle,
  pointer: panePointer,
}: ConnectionLineComponentProps) => {
  const fromNodeId = fromNode?.id
  const nativeTargetId = toNode?.id
  const nativeTargetHandleId = toHandle?.id ?? undefined
  const nativeTargetPosition = toHandle?.position
  const resolveDropTarget = useFreeformDropTarget()
  const allNodes = useDiagramStore((state) => state.nodes)
  const nodeLookup = useStore((state) => state.nodeLookup)
  const transform = useStore((state) => state.transform)
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
    // Unlike `toX`/`toY`, React Flow exposes `pointer` in pane-relative
    // screen pixels. Apply only the viewport transform here: screenToFlowPosition
    // would subtract the pane's page offset a second time.
    const livePointer = {
      x: (panePointer.x - transform[0]) / transform[2],
      y: (panePointer.y - transform[1]) / transform[2],
    }
    const pointer: XYPosition = {
      x: snap(livePointer.x),
      y: snap(livePointer.y),
    }

    // React Flow still reports the nearest handle for an invalid drop. Only a
    // valid handle is committed through onConnect; invalid drops use the same
    // shape-aware freeform path as onConnectEnd.
    // Continuous outlines are the exception even when React Flow happens to
    // validate a nearby hidden handle: their visible snap circle follows the
    // actual pointer angle, so treating that handle centre as authoritative
    // would make the ghost jump away from the aimed curve.
    const hasValidNativeTarget =
      connectionStatus === "valid" &&
      nativeTargetId !== undefined &&
      nativeTargetId !== fromNodeId &&
      nativeTargetPosition !== undefined
    const targetIsAimedOutline =
      hasValidNativeTarget && dropAnchorIsAimed(toNode?.type)
    const hasNativeTarget = hasValidNativeTarget && !targetIsAimedOutline
    // A valid native handle is an exact attachment point, not merely a side hint.
    // Resolve that point into the pending edge too, so the central solver cannot
    // replace the native ghost endpoint with an automatic facing-side anchor.
    const nativeAnchor = hasNativeTarget
      ? getNativeConnectionAnchor({
          to: { x: toX, y: toY },
          toNode,
        })
      : null
    // Validation owns target identity. In particular, a use case nested inside
    // a system overlaps its container, so re-running a scene-wide hit test can
    // silently replace the oval with that container. Only the anchor remains
    // continuous for an aimed outline.
    const aimedTargetRect =
      targetIsAimedOutline && toNode ? getNativeConnectionRect(toNode) : null
    const aimedTarget =
      aimedTargetRect && toNode
        ? {
            id: toNode.id,
            type: toNode.type,
            rect: aimedTargetRect,
          }
        : null
    const target = hasValidNativeTarget
      ? null
      : resolveDropTarget(pointer, fromNodeId)
    // Empty space resolves to the source node, which is not a preview target.
    const hit =
      aimedTarget ?? (target && target.id !== fromNodeId ? target : null)
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
      Math.hypot(pointer.x - fromX, pointer.y - fromY) >=
      GHOST_MIN_DRAG_DISTANCE_PX

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
      targetAnchor:
        nativeAnchor ?? (hit && dropAnchorIsAimed(hit.type) ? anchor : null),
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
    connectionStatus,
    nativeTargetId,
    nativeTargetHandleId,
    nativeTargetPosition,
    panePointer,
    transform,
    toNode,
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
      const pendingTarget =
        pendingSolvedRoute?.[pendingSolvedRoute.length - 1] ?? null
      // The worker may still hold the route for a target crossed earlier in
      // the same gesture. A pinned endpoint must never display that stale route:
      // use the immediate pointer route until the worker catches up. Automatic
      // targets are allowed to choose their own seat, so endpoint equality is
      // intentionally required only when an anchor is pinned.
      const pendingRouteMatchesPinnedTarget =
        !pinnedTargetAnchor ||
        (pendingTarget !== null &&
          Math.hypot(
            pendingTarget.x - newConnection.to.x,
            pendingTarget.y - newConnection.to.y
          ) <= 0.5)
      if (
        pendingSolvedRoute &&
        pendingSolvedRoute.length >= 2 &&
        pendingRouteMatchesPinnedTarget
      ) {
        return {
          d: pointsToSvgPath(pendingSolvedRoute),
          snapPoint: pendingSolvedRoute[pendingSolvedRoute.length - 1],
        }
      }
      if (!pinnedTargetAnchor) {
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
      snapPoint: newConnection.snapPoint,
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
