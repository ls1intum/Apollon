import { useMemo } from "react"
import {
  ConnectionLineComponentProps,
  ConnectionLineType,
  getSmoothStepPath,
  getStraightPath,
  Position,
  type XYPosition,
} from "@xyflow/react"
import { EDGES } from "@/constants"
import { pointsToSvgPath } from "@/edges/Connection"
import { useDiagramStore, useMetadataStore } from "@/store/context"
import { useFreeformDropTarget } from "@/hooks/useFreeformDropTarget"
import { useShallow } from "zustand/shallow"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getEdgeMarkerStyles,
  preserveOrthogonalEdgePoints,
} from "@/utils/edgeUtils"
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
// Matches the app's connection indicator (`.connectionindicator`): a solid,
// opaque, ~10px primary dot that marks the connection point.
const GHOST_SNAP_CIRCLE_RADIUS = 5

const getFallbackConnectionPath = (
  connectionLineType: ConnectionLineType,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  fromPosition: Position,
  toPosition: Position
): string => {
  if (connectionLineType === ConnectionLineType.Straight) {
    const [path] = getStraightPath({
      sourceX: fromX,
      sourceY: fromY,
      targetX: toX,
      targetY: toY,
    })
    return path
  }

  const [path] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    borderRadius: EDGES.STEP_BORDER_RADIUS,
    offset: 30,
  })

  return path
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

  // Resolve the drop target the SAME way the connection commit does, so the
  // preview snaps exactly where the edge will attach on release.
  const resolveDropTarget = useFreeformDropTarget()

  const path = useMemo(() => {
    // Snap a pointer to the freeform border point of the node it would attach to
    // (null over empty canvas or only the source node).
    const snapToNodeUnder = (
      pointer: XYPosition
    ): {
      point: XYPosition
      position: Position
      showSnapCircle: boolean
    } | null => {
      const target = resolveDropTarget(pointer, fromNode?.id)
      // The resolver falls back to the source node when nothing else is under
      // the pointer (that's how a drop on your own body becomes a self-loop);
      // the ghost never previews that, so a drag near the source stays gated.
      if (!target || target.id === fromNode?.id) return null
      // Shape-aware, and shared with the commit, so the preview lands on the
      // node's real shape (oval curve, diamond vertex, interface centre, …).
      const anchor = getEdgeAnchorFromPoint(target.type, pointer, target.rect)
      if (!anchor) return null // node is not a connection target (mode "none")
      return {
        ...getEdgeAnchorPoint(target.type, target.rect, anchor),
        // Only the oval attaches purely via the freeform path (no native handle
        // circles); other shapes get React Flow's own handle highlights, so we
        // don't draw a second circle that could drift from a handle-snapped drop.
        showSnapCircle: getConnectionMode(target.type) === "ellipse",
      }
    }

    if (
      !previewEdge ||
      !reconnectPreviewHandleType ||
      reconnectPreviewBasePoints.length < 2
    ) {
      // NEW connection — hidden until dragged clear of the source, or already
      // hovering a node (see GHOST_MIN_DRAG_DISTANCE_PX).
      const pointer: XYPosition = { x: toX, y: toY }
      const snapped = snapToNodeUnder(pointer)
      const draggedFar =
        Math.hypot(toX - fromX, toY - fromY) >= GHOST_MIN_DRAG_DISTANCE_PX
      if (!draggedFar && !snapped) return { d: "", snapPoint: null }

      const end = snapped ?? { point: pointer, position: toPosition }
      return {
        d: getFallbackConnectionPath(
          connectionLineType,
          fromX,
          fromY,
          end.point.x,
          end.point.y,
          fromPosition,
          end.position
        ),
        // A snap circle at the live attach point tells you exactly where the
        // edge will connect — continuously, at any angle on the curve, not just
        // at fixed handles.
        snapPoint: snapped?.showSnapCircle ? snapped.point : null,
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
    fromNode,
    fromPosition,
    fromX,
    fromY,
    previewEdge,
    reconnectPreviewBasePoints,
    reconnectPreviewHandleType,
    resolveDropTarget,
    toPosition,
    toX,
    toY,
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

  // Dashed, primary-coloured ghost (the default line was a faint hairline);
  // an empty `d` renders nothing when the ghost is gated off. The snap circle
  // marks the exact live attach point on the target.
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
