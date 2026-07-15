import { useMemo } from "react"
import {
  ConnectionLineComponentProps,
  ConnectionLineType,
  getStraightPath,
  Position,
  type XYPosition,
} from "@xyflow/react"
import { CANVAS, EDGES } from "@/constants"
import { pointsToSvgPath, type IPoint } from "@/edges/Connection"
import { useEdgeRoutingContext } from "@/hooks/useEdgeRoutingContext"
import { useDiagramStore, useMetadataStore } from "@/store/context"
import { useFreeformDropTarget } from "@/hooks/useFreeformDropTarget"
import { useShallow } from "zustand/shallow"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getEdgeMarkerStyles,
  preserveOrthogonalEdgePoints,
  routeOrthogonalPath,
} from "@/utils/edgeUtils"
import type { ObstacleRect } from "@/utils/geometry/obstacles"
import {
  getConnectionMode,
  getEdgeAnchorFromPoint,
  getEdgeAnchorPoint,
} from "@/utils/connectionModes"

// Hide the new-connection ghost until dragged this far from the source, so a
// stray click doesn't flash a preview. Bypassed while hovering a node.
const GHOST_MIN_DRAG_DISTANCE_PX = 40
const GHOST_STROKE_WIDTH = 2
const GHOST_DASH = "6 5"
// Matches the connection indicator (`.connectionindicator`): a solid, opaque,
// ~10px primary dot marking the connection point.
const GHOST_SNAP_CIRCLE_RADIUS = 5

/**
 * The ghost's path for a connection being drawn.
 *
 * This routes through exactly the same function the committed edge does, with
 * the same obstacles and the same neighbouring edges. It used to be a raw
 * `getSmoothStepPath` with a hard-coded 30px offset — which meant the preview
 * knew nothing about the nodes in its way, the margins it should keep, or the
 * edges it should not cross. You dragged one line and got a different one, and
 * the difference grew with every improvement made to the real router. A preview
 * that lies about the result is worse than no preview at all.
 */
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

export const ReconnectConnectionLine = ({
  connectionLineStyle,
  connectionLineType,
  fromNode,
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}: ConnectionLineComponentProps) => {
  const {
    reconnectPreviewEdgeId,
    reconnectPreviewHandleType,
    reconnectPreviewBasePoints,
  } = useMetadataStore(
    useShallow((state) => ({
      reconnectPreviewEdgeId: state.reconnectPreviewEdgeId,
      reconnectPreviewHandleType: state.reconnectPreviewHandleType,
      reconnectPreviewBasePoints: state.reconnectPreviewBasePoints,
    }))
  )

  const previewEdge = useDiagramStore(
    useShallow((state) =>
      reconnectPreviewEdgeId
        ? state.edges.find((edge) => edge.id === reconnectPreviewEdgeId)
        : undefined
    )
  )

  // Resolve the drop target the same way the connection commit does, so the
  // preview snaps exactly where the edge attaches on release.
  const resolveDropTarget = useFreeformDropTarget()
  const allNodes = useDiagramStore((state) => state.nodes)

  // Where a NEW connection currently starts and ends. Resolved before the route
  // is computed, because the router has to be told what the world looks like
  // around those two points — and a hook cannot be called from inside the memo
  // that used to do all of this at once.
  const newConnection = useMemo(() => {
    const snap = (v: number) =>
      Math.round(v / CANVAS.SNAP_TO_GRID_PX) * CANVAS.SNAP_TO_GRID_PX
    const pointer: XYPosition = { x: snap(toX), y: snap(toY) }

    const target = resolveDropTarget(pointer, fromNode?.id)
    // The resolver falls back to the source node when nothing else is under the
    // pointer (a drop on your own body becomes a self-loop); the ghost never
    // previews that, so a drag near the source stays gated.
    const hit = target && target.id !== fromNode?.id ? target : null
    const anchor = hit
      ? getEdgeAnchorFromPoint(hit.type, pointer, hit.rect)
      : null

    const snapped =
      hit && anchor
        ? {
            ...getEdgeAnchorPoint(hit.type, hit.rect, anchor),
            // Only the oval attaches purely via the freeform path (no native
            // handle circles); other shapes get React Flow's own handle
            // highlights, so a second circle here could drift from a
            // handle-snapped drop.
            showSnapCircle: getConnectionMode(hit.type) === "ellipse",
            id: hit.id,
          }
        : null

    const draggedFar =
      Math.hypot(toX - fromX, toY - fromY) >= GHOST_MIN_DRAG_DISTANCE_PX

    return {
      from: { x: fromX, y: fromY },
      to: snapped ? snapped.point : pointer,
      toPosition: snapped ? snapped.position : toPosition,
      targetId: snapped?.id,
      snapPoint: snapped?.showSnapCircle ? snapped.point : null,
      visible: draggedFar || snapped !== null,
    }
  }, [resolveDropTarget, fromNode?.id, fromX, fromY, toX, toY, toPosition])

  // The SAME world the committed edge is routed against: the nodes it must not
  // plough through, its own margins, the container frames it must not trace, and
  // the edges it must not be drawn on top of. A new connection has no id yet, so
  // it yields to every edge already on the canvas.
  const { obstacles, neighborEdges } = useEdgeRoutingContext({
    selfId: undefined,
    nodes: allNodes,
    sourceId: fromNode?.id ?? "",
    targetId: newConnection.targetId ?? "",
    sourcePoint: newConnection.from,
    targetPoint: newConnection.to,
  })

  const path = useMemo(() => {
    if (
      !previewEdge ||
      !reconnectPreviewHandleType ||
      reconnectPreviewBasePoints.length < 2
    ) {
      // New connection — hidden until dragged clear of the source, or already
      // hovering a node (see GHOST_MIN_DRAG_DISTANCE_PX).
      if (!newConnection.visible) return { d: "", snapPoint: null }

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
        // Snap circle marks the live attach point: the edge connects
        // continuously at any angle on the curve, not just at fixed handles.
        snapPoint: newConnection.snapPoint,
      }
    }

    const markerPadding =
      getEdgeMarkerStyles(previewEdge.type ?? "").markerPadding ??
      EDGES.MARKER_PADDING
    const movedEnd =
      reconnectPreviewHandleType === "target" ? "source" : "target"

    // React Flow reports the fixed opposite endpoint in onReconnectStart.
    const sourceAnchor =
      movedEnd === "source"
        ? { point: { x: toX, y: toY }, position: toPosition }
        : { point: { x: fromX, y: fromY }, position: fromPosition }
    const targetAnchor =
      movedEnd === "source"
        ? { point: { x: fromX, y: fromY }, position: fromPosition }
        : { point: { x: toX, y: toY }, position: toPosition }

    const adjustedSourceCoordinates = adjustSourceCoordinates(
      sourceAnchor.point.x,
      sourceAnchor.point.y,
      sourceAnchor.position,
      EDGES.SOURCE_CONNECTION_POINT_PADDING
    )
    const adjustedTargetCoordinates = adjustTargetCoordinates(
      targetAnchor.point.x,
      targetAnchor.point.y,
      targetAnchor.position,
      markerPadding
    )

    const reconnectPreviewPoints = preserveOrthogonalEdgePoints(
      reconnectPreviewBasePoints,
      {
        x: adjustedSourceCoordinates.sourceX,
        y: adjustedSourceCoordinates.sourceY,
      },
      {
        x: adjustedTargetCoordinates.targetX,
        y: adjustedTargetCoordinates.targetY,
      },
      sourceAnchor.position,
      targetAnchor.position
    )

    return { d: pointsToSvgPath(reconnectPreviewPoints), snapPoint: null }
  }, [
    connectionLineType,
    fromPosition,
    fromX,
    fromY,
    previewEdge,
    reconnectPreviewBasePoints,
    reconnectPreviewHandleType,
    toPosition,
    toX,
    toY,
    newConnection,
    obstacles,
    neighborEdges,
  ])

  const edgeStrokeColor =
    previewEdge?.data &&
    typeof previewEdge.data === "object" &&
    "strokeColor" in previewEdge.data &&
    typeof previewEdge.data.strokeColor === "string"
      ? previewEdge.data.strokeColor
      : undefined

  const stroke =
    edgeStrokeColor ??
    connectionLineStyle?.stroke ??
    "var(--apollon-primary, #3e8acc)"

  // Dashed, primary-coloured ghost; an empty `d` renders nothing when the ghost
  // is gated off. The snap circle marks the live attach point on the target.
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
          opacity: 1, // override React Flow's dimmed default; empty `d` hides it
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
