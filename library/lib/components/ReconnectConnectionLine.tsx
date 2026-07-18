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
import { CANVAS, EDGES } from "@/constants"
import { pointsToSvgPath, type IPoint } from "@/edges/Connection"
import { useEdgeRoutingContext } from "@/hooks/useEdgeRoutingContext"
import {
  useDiagramStore,
  useEdgeGeometryStore,
  useMetadataStore,
} from "@/store/context"
import { useFreeformDropTarget } from "@/hooks/useFreeformDropTarget"
import { useShallow } from "zustand/shallow"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getDefaultEdgeType,
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
import { computeConnectionPreviewRoute } from "@/utils/geometry/edgeGeometrySolver"
import { STRAIGHT_PATH_STEP_EDGE_TYPES } from "@/edges/edgeRoutingBehavior"

// Hide the new-connection ghost until dragged this far from the source, so a
// stray click doesn't flash a preview. Bypassed while hovering a node.
const GHOST_MIN_DRAG_DISTANCE_PX = 40
const GHOST_STROKE_WIDTH = 2
const GHOST_DASH = "6 5"
// Matches the connection indicator (`.connectionindicator`): a solid, opaque,
// ~10px primary dot marking the connection point.
const GHOST_SNAP_CIRCLE_RADIUS = 5

// Fallback id for the transient edge published while a NEW connection is drawn onto
// a node, so the solver routes every OTHER edge as if it existed (neighbours make
// room live). Never enters the diagram store. Only used before `onConnectStart` has
// minted the real id — the preview must otherwise carry the id the commit will use,
// because sibling lanes are settled by edge id (see `pendingConnectionId`).
const PENDING_CONNECTION_FALLBACK_ID = "__apollon_pending_connection__"

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
  // The pieces the auto-anchor selector needs, so a NEW connection onto a node can
  // preview the SAME route it commits to (source auto-picked, target pinned at the
  // drop) instead of a fixed-drag-handle line that jumps on release.
  const nodeLookup = useStore((state) => state.nodeLookup)
  const connectionMode = useStore((state) => state.connectionMode)
  const diagramType = useMetadataStore((state) => state.diagramType)
  const previewEdgeType = getDefaultEdgeType(diagramType)
  const previewEnableStraightPath =
    STRAIGHT_PATH_STEP_EDGE_TYPES.has(previewEdgeType)
  const setPendingConnectionEdge = useMetadataStore(
    (state) => state.setPendingConnectionEdge
  )
  // The id the commit will use, minted at drag start. Sharing it keeps the preview in
  // the same sibling lane as the committed edge, so the bundle does not re-order.
  const pendingConnectionId = useMetadataStore(
    (state) => state.pendingConnectionId
  )
  const pendingEdgeId = pendingConnectionId ?? PENDING_CONNECTION_FALLBACK_ID
  // The route the solver committed for the pending edge, so the ghost draws the
  // SAME line the neighbours reflowed around (its actual fan lane, obstacle dodges),
  // not a lane-0 approximation. Lags the solve by a frame — imperceptible.
  const pendingSolvedRoute = useEdgeGeometryStore(
    (state) => state.geometryById[pendingEdgeId]
  )

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

  // A new connection is only PREVIEWED as a solver edge when it is drawn onto a
  // real target (reconnects already have their own live override). Fully auto (no
  // pinned anchor) to match the auto commit. Memoised on source+target so hovering
  // WITHIN one node does not thrash the solver.
  const isNewConnection = !previewEdge || !reconnectPreviewHandleType
  const pendingEdge = useMemo<Edge | null>(() => {
    if (!isNewConnection || !fromNode?.id || !newConnection.targetId)
      return null
    return {
      id: pendingEdgeId,
      source: fromNode.id,
      target: newConnection.targetId,
      type: previewEdgeType,
      data: { points: [] },
    }
  }, [
    isNewConnection,
    fromNode?.id,
    newConnection.targetId,
    previewEdgeType,
    pendingEdgeId,
  ])

  // Publish/withdraw the pending edge as the hover target changes, and always
  // withdraw it when the drag ends (this component unmounts) so a stray preview
  // edge can never outlive the gesture.
  useEffect(() => {
    setPendingConnectionEdge(pendingEdge)
  }, [pendingEdge, setPendingConnectionEdge])
  useEffect(() => {
    return () => setPendingConnectionEdge(null)
  }, [setPendingConnectionEdge])

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

      // Hovering a node: preview the route the COMMITTED edge will take, so the
      // ghost matches the edge that appears on release instead of jumping to
      // re-picked anchors. Prefer the SOLVER's route for the pending edge (it is the
      // one the neighbours reflowed around — same fan lane, obstacle dodges); fall
      // back to a local single-edge solve for the first frame before the solve lands,
      // then to the plain cursor-following route in empty space / unmeasured nodes.
      if (fromNode?.id && newConnection.targetId) {
        if (pendingSolvedRoute && pendingSolvedRoute.length >= 2) {
          return {
            d: pointsToSvgPath(pendingSolvedRoute),
            // The dot marks where the edge ACTUALLY connects — the auto-anchor at the
            // route's target end — not the drop pixel or a fixed handle.
            snapPoint: pendingSolvedRoute[pendingSolvedRoute.length - 1],
          }
        }
        const previewRoute = computeConnectionPreviewRoute({
          sourceId: fromNode.id,
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

      // Dragging over empty canvas (no target yet): the line follows the cursor and
      // connects nowhere, so there is no attach point to mark.
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
    fromNode?.id,
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
    allNodes,
    nodeLookup,
    connectionMode,
    previewEdgeType,
    previewEnableStraightPath,
    pendingSolvedRoute,
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
