import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { Position, useReactFlow, type Edge } from "@xyflow/react"
import {
  calculateOverlayPath,
  calculateStraightPath,
  getEdgeMarkerStyles,
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getTargetConnectionPointPadding,
  getSideHandleIdForPosition,
  isFreeformEdgeAnchor,
  roundAnchorPointOutward,
  type FreeformEdgeAnchor,
} from "@/utils/edgeUtils"
import {
  getEdgeAnchorFromPoint,
  getEdgeAnchorPoint,
  pickNearestConnectable,
} from "@/utils/connectionModes"
import {
  FREEFORM_ENDPOINT_SNAP_RADIUS_PX,
  useFreeformEndpointNode,
} from "./useFreeformEndpointNode"
import { EDGES } from "@/constants"
import { useDiagramModifiable } from "./useDiagramModifiable"
import { IPoint } from "../edges/Connection"
import { BaseEdgeProps } from "../edges/GenericEdge"
import { computeToolbarPosition } from "@/utils/geometry/bendHandles"
import {
  exceedsDragThreshold,
  insertWaypoint,
  isWaypointCollapseCandidate,
  moveWaypoint,
  pruneCollinearWaypoints,
  removeWaypoint,
  snapPointToAngle,
  snapPoint,
} from "@/utils/geometry/freeWaypoints"
import { getStraightMidSegment } from "@/utils/geometry/edgeLabelLayout"
import { useEdgeLineJumps, buildEdgePath } from "./useEdgeLineJumps"
import {
  useDiagramStore,
  useEdgeGeometryStore,
  useMetadataStore,
} from "@/store/context"
import { useShallow } from "zustand/shallow"
import { getPositionOnCanvas } from "@/utils"

export interface StraightPathEdgeData {
  pathMiddlePosition: IPoint
  toolbarPosition: IPoint
  isMiddlePathHorizontal: boolean
  sourcePoint: IPoint
  targetPoint: IPoint
  /** Endpoints of the LOCAL arc-mid segment. Labels follow this segment rather
   * than the endpoint chord when obstacle avoidance or waypoints bend the edge. */
  labelSourcePoint: IPoint
  labelTargetPoint: IPoint
}

/** Stable empty interior list so an unbent edge keeps a constant reference and
 * does not churn the downstream route memos every render. */
const EMPTY_POINTS: IPoint[] = []

type EndpointType = "source" | "target"

/** Keep the selectable ribbon clear of node connection handles. Endpoint-specific
 * reconnect targets start just outside this same gap; without it an existing edge
 * ending on a handle steals pointer-down and turns "new connection" into "select
 * edge", especially on occupied use-case handles. */
const trimOverlayEndpoints = (points: IPoint[], trimPx = 10): IPoint[] => {
  if (points.length < 2) return points
  const trimmed = points.map((point) => ({ ...point }))
  const moveToward = (from: IPoint, to: IPoint, maximum: number): IPoint => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.sqrt(dx * dx + dy * dy)
    if (length === 0) return from
    const amount = Math.min(maximum, Math.max(0, length / 3))
    return {
      x: from.x + (dx / length) * amount,
      y: from.y + (dy / length) * amount,
    }
  }
  trimmed[0] = moveToward(points[0], points[1], trimPx)
  const last = points.length - 1
  trimmed[last] = moveToward(points[last], points[last - 1], trimPx)
  return trimmed
}

type StraightEndpointDragCommit = {
  endpoint: EndpointType
  nodeId: string
  handleId: string
  anchor: FreeformEdgeAnchor
  sourcePosition: Position
  targetPosition: Position
  sourceEndpoint: IPoint
  targetEndpoint: IPoint
  predictedEdge: Edge
}

export const useStraightPathEdge = ({
  id,
  type,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  targetHandleId,
  data,
}: BaseEdgeProps) => {
  const pathRef = useRef<SVGPathElement | null>(null)
  const endpointDragCommitRef = useRef<StraightEndpointDragCommit | null>(null)
  const activePointerCancelRef = useRef<(() => void) | null>(null)
  const activePointerTeardownRef = useRef<(() => void) | null>(null)
  // Per-gesture waypoint-drag state. Refs (not a captured object) keep the drag
  // closures React-Compiler-safe, mirroring useStepPathEdge's drag refs.
  const dragInteriorRef = useRef<IPoint[]>([])
  const dragMovedRef = useRef(false)
  const dragCollapseRef = useRef(false)
  const isDiagramModifiable = useDiagramModifiable()
  const setLiveEdgeOverride = useMetadataStore(
    (state) => state.setLiveEdgeOverride
  )
  const {
    getIntersectingNodes,
    getNode,
    getNodes,
    getZoom,
    screenToFlowPosition,
  } = useReactFlow()
  const [dragPreviewPoints, setDragPreviewPoints] = useState<IPoint[] | null>(
    null
  )
  // The grabbed waypoint must remain mounted while the PATH previews its
  // removal. Removing the pointer-capturing SVG node cancels the browser gesture
  // and restores the bend before pointer-up.
  const [dragHandleRoute, setDragHandleRoute] = useState<IPoint[] | null>(null)
  const [dragPreviewPositions, setDragPreviewPositions] = useState<{
    sourcePosition: Position
    targetPosition: Position
  } | null>(null)
  const [endpointPreviewCommit, setEndpointPreviewCommit] =
    useState<StraightEndpointDragCommit | null>(null)
  const [selectedWaypointIndex, setSelectedWaypointIndex] = useState<
    number | null
  >(null)
  const centralRoute = useEdgeGeometryStore(
    (state) => state.previewById[id] ?? state.geometryById[id]
  )
  // Interior waypoints authored on this edge (JointJS "vertices" model): the route
  // is [source, ...interior, target]. Never includes the endpoints.
  const interiorPoints: IPoint[] = Array.isArray(data?.points)
    ? (data.points as IPoint[])
    : EMPTY_POINTS

  useEffect(
    () => () => {
      activePointerTeardownRef.current?.()
    },
    []
  )
  const sourceAnchor = data?.sourceAnchor
  const targetAnchor = data?.targetAnchor
  const shouldSubscribeToNodeGeometry =
    isFreeformEdgeAnchor(sourceAnchor) || isFreeformEdgeAnchor(targetAnchor)
  const {
    setEdges,
    sourceNodePositionX,
    sourceNodePositionY,
    sourceNodeWidth,
    sourceNodeHeight,
    targetNodePositionX,
    targetNodePositionY,
    targetNodeWidth,
    targetNodeHeight,
  } = useDiagramStore(
    useShallow((state) => {
      if (!shouldSubscribeToNodeGeometry) {
        return {
          setEdges: state.setEdges,
          sourceNodePositionX: undefined,
          sourceNodePositionY: undefined,
          sourceNodeWidth: undefined,
          sourceNodeHeight: undefined,
          targetNodePositionX: undefined,
          targetNodePositionY: undefined,
          targetNodeWidth: undefined,
          targetNodeHeight: undefined,
        }
      }

      const storeSourceNode = state.nodes.find((node) => node.id === source)
      const storeTargetNode = state.nodes.find((node) => node.id === target)
      const storeSourcePosition = storeSourceNode
        ? getPositionOnCanvas(storeSourceNode, state.nodes)
        : null
      const storeTargetPosition = storeTargetNode
        ? getPositionOnCanvas(storeTargetNode, state.nodes)
        : null

      return {
        setEdges: state.setEdges,
        sourceNodePositionX: storeSourcePosition?.x,
        sourceNodePositionY: storeSourcePosition?.y,
        sourceNodeWidth:
          storeSourceNode?.width ?? storeSourceNode?.measured?.width,
        sourceNodeHeight:
          storeSourceNode?.height ?? storeSourceNode?.measured?.height,
        targetNodePositionX: storeTargetPosition?.x,
        targetNodePositionY: storeTargetPosition?.y,
        targetNodeWidth:
          storeTargetNode?.width ?? storeTargetNode?.measured?.width,
        targetNodeHeight:
          storeTargetNode?.height ?? storeTargetNode?.measured?.height,
      }
    })
  )

  const { markerEnd, markerStart, strokeDashArray, markerPadding } =
    getEdgeMarkerStyles(type)

  const padding = markerPadding ?? EDGES.MARKER_PADDING
  const allNodes = getNodes()
  const sourceNode =
    allNodes.find((node) => node.id === source) ?? getNode(source)
  const targetNode =
    allNodes.find((node) => node.id === target) ?? getNode(target)
  // Prefer the displayed React Flow node so a peer's live drag/resize overlay
  // (applied to the nodes prop before it is persisted) keeps anchored endpoints
  // attached during the movement; the subscribed store geometry is only a
  // fallback (and the subscription that re-renders on the settled write).
  const sourceAbsolutePosition = useMemo(() => {
    if (sourceNode) return getPositionOnCanvas(sourceNode, allNodes)
    if (sourceNodePositionX != null && sourceNodePositionY != null) {
      return { x: sourceNodePositionX, y: sourceNodePositionY }
    }
    return { x: sourceX, y: sourceY }
  }, [
    sourceNode,
    allNodes,
    sourceNodePositionX,
    sourceNodePositionY,
    sourceX,
    sourceY,
  ])
  const targetAbsolutePosition = useMemo(() => {
    if (targetNode) return getPositionOnCanvas(targetNode, allNodes)
    if (targetNodePositionX != null && targetNodePositionY != null) {
      return { x: targetNodePositionX, y: targetNodePositionY }
    }
    return { x: targetX, y: targetY }
  }, [
    targetNode,
    allNodes,
    targetNodePositionX,
    targetNodePositionY,
    targetX,
    targetY,
  ])
  const sourceRect = useMemo(
    () =>
      sourceNode
        ? {
            x: sourceAbsolutePosition.x,
            y: sourceAbsolutePosition.y,
            width: sourceNode.width ?? sourceNodeWidth ?? 0,
            height: sourceNode.height ?? sourceNodeHeight ?? 0,
          }
        : null,
    [
      sourceAbsolutePosition.x,
      sourceAbsolutePosition.y,
      sourceNode,
      sourceNodeWidth,
      sourceNodeHeight,
    ]
  )
  const targetRect = useMemo(
    () =>
      targetNode
        ? {
            x: targetAbsolutePosition.x,
            y: targetAbsolutePosition.y,
            width: targetNode.width ?? targetNodeWidth ?? 0,
            height: targetNode.height ?? targetNodeHeight ?? 0,
          }
        : null,
    [
      targetAbsolutePosition.x,
      targetAbsolutePosition.y,
      targetNode,
      targetNodeWidth,
      targetNodeHeight,
    ]
  )
  const resolvedSourceAnchor = useMemo(
    () =>
      sourceRect && isFreeformEdgeAnchor(sourceAnchor)
        ? getEdgeAnchorPoint(sourceNode?.type, sourceRect, sourceAnchor)
        : null,
    [sourceAnchor, sourceRect, sourceNode?.type]
  )
  const resolvedTargetAnchor = useMemo(
    () =>
      targetRect && isFreeformEdgeAnchor(targetAnchor)
        ? getEdgeAnchorPoint(targetNode?.type, targetRect, targetAnchor)
        : null,
    [targetAnchor, targetRect, targetNode?.type]
  )
  const resolvedSourceX = resolvedSourceAnchor?.point.x ?? sourceX
  const resolvedSourceY = resolvedSourceAnchor?.point.y ?? sourceY
  const resolvedTargetX = resolvedTargetAnchor?.point.x ?? targetX
  const resolvedTargetY = resolvedTargetAnchor?.point.y ?? targetY
  const resolvedSourcePosition =
    resolvedSourceAnchor?.position ?? sourcePosition
  const resolvedTargetPosition =
    resolvedTargetAnchor?.position ?? targetPosition
  const sourceConnectionPointPadding = resolvedSourceAnchor
    ? 0
    : EDGES.SOURCE_CONNECTION_POINT_PADDING
  const targetConnectionPointPadding = getTargetConnectionPointPadding(
    padding,
    resolvedTargetAnchor !== null
  )

  // Round coordinates to whole pixels for pixel-perfect rendering
  // React Flow may return fractional values when node dimensions are odd
  const roundedSource = resolvedSourceAnchor
    ? roundAnchorPointOutward(
        resolvedSourceAnchor.point,
        resolvedSourcePosition
      )
    : { x: Math.round(resolvedSourceX), y: Math.round(resolvedSourceY) }
  const roundedTarget = resolvedTargetAnchor
    ? roundAnchorPointOutward(
        resolvedTargetAnchor.point,
        resolvedTargetPosition
      )
    : { x: Math.round(resolvedTargetX), y: Math.round(resolvedTargetY) }
  const roundedSourceX = roundedSource.x
  const roundedSourceY = roundedSource.y
  const roundedTargetX = roundedTarget.x
  const roundedTargetY = roundedTarget.y

  const adjustedTargetCoordinates = adjustTargetCoordinates(
    roundedTargetX,
    roundedTargetY,
    resolvedTargetPosition,
    targetConnectionPointPadding
  )

  const adjustedSourceCoordinates = adjustSourceCoordinates(
    roundedSourceX,
    roundedSourceY,
    resolvedSourcePosition,
    sourceConnectionPointPadding
  )

  const sourceEndpoint = useMemo<IPoint>(
    () => ({
      x: adjustedSourceCoordinates.sourceX,
      y: adjustedSourceCoordinates.sourceY,
    }),
    [adjustedSourceCoordinates.sourceX, adjustedSourceCoordinates.sourceY]
  )
  const targetEndpoint = useMemo<IPoint>(
    () => ({
      x: adjustedTargetCoordinates.targetX,
      y: adjustedTargetCoordinates.targetY,
    }),
    [adjustedTargetCoordinates.targetX, adjustedTargetCoordinates.targetY]
  )
  // The synchronous truth: source → interior waypoints → target. Used as the
  // fallback before the solver's route lands and whenever the solver route is
  // stale (its endpoints no longer match, e.g. mid node-move) so the edge never
  // detaches from its nodes.
  const basePoints = useMemo<IPoint[]>(
    () => [sourceEndpoint, ...interiorPoints, targetEndpoint],
    [sourceEndpoint, interiorPoints, targetEndpoint]
  )
  // The solver's committed route is the source of truth: its endpoints are the
  // facing-side attachment sites the port assignment chose (not the drawn handle),
  // and it carries any automatic obstacle-avoidance bends. Fall back to the analytic
  // base polyline only before the first solve lands (never painted after that).
  const renderPoints = useMemo<IPoint[]>(
    () =>
      dragPreviewPoints ??
      (centralRoute && centralRoute.length >= 2 ? centralRoute : basePoints),
    [basePoints, centralRoute, dragPreviewPoints]
  )
  const renderSourcePosition =
    dragPreviewPositions?.sourcePosition ?? resolvedSourcePosition
  const renderTargetPosition =
    dragPreviewPositions?.targetPosition ?? resolvedTargetPosition

  // Straight-hook edges still participate in shared neighbour geometry. Publish
  // the exact predicted edge so the complete route set uses committed constraints
  // during the drag as well as after pointer-up.
  useLayoutEffect(() => {
    if (dragPreviewPoints === null) return
    setLiveEdgeOverride({
      edgeId: id,
      points: dragPreviewPoints,
      edge: endpointPreviewCommit?.predictedEdge,
      strategy: endpointPreviewCommit ? "predicted" : "authoritative",
    })
    return () => setLiveEdgeOverride(null)
  }, [dragPreviewPoints, endpointPreviewCommit, id, setLiveEdgeOverride])

  // UseCase include/extend edges are dashed connectors that never read as
  // crossings to disambiguate, so they opt out of bridging.
  const lineJumps = useEdgeLineJumps(
    id,
    renderPoints,
    type !== "UseCaseInclude" && type !== "UseCaseExtend"
  )

  // Arc midpoint + local orientation derived from the routed polyline. This stays
  // synchronous, DOM-free, and export-stable while following obstacle detours and
  // authored waypoints rather than the endpoint chord.
  const middleSegment = useMemo(
    () =>
      getStraightMidSegment(
        renderPoints,
        renderPoints[0],
        renderPoints[renderPoints.length - 1]
      ),
    [renderPoints]
  )
  const { point: pathMiddlePosition, isHorizontal: isMiddlePathHorizontal } =
    middleSegment

  // A bent edge (interior waypoints or a bridged crossing) draws its polyline via
  // buildEdgePath; a plain 2-point edge keeps calculateStraightPath so the marker
  // padding / include-extend gap on its single segment is byte-identical to before.
  const isPolyline = renderPoints.length > 2 || lineJumps.length > 0
  const currentPath = useMemo(() => {
    if (isPolyline)
      return buildEdgePath(
        renderPoints,
        lineJumps,
        type === "UseCaseInclude" || type === "UseCaseExtend"
          ? {
              segmentIndex: middleSegment.segmentIndex,
              center: middleSegment.point,
              halfSize: 40,
            }
          : undefined
      )
    return calculateStraightPath(
      renderPoints[0].x,
      renderPoints[0].y,
      renderPoints[1].x,
      renderPoints[1].y,
      type
    )
  }, [renderPoints, type, lineJumps, isPolyline, middleSegment])

  const overlayPath = useMemo(() => {
    const overlayPoints = trimOverlayEndpoints(renderPoints)
    if (lineJumps.length > 0) return buildEdgePath(overlayPoints, lineJumps)
    if (renderPoints.length > 2) return buildEdgePath(overlayPoints, [])
    return calculateOverlayPath(
      overlayPoints[0].x,
      overlayPoints[0].y,
      overlayPoints[1].x,
      overlayPoints[1].y,
      type
    )
  }, [renderPoints, type, lineJumps])

  const sourcePoint = renderPoints[0]
  const targetPoint = renderPoints[renderPoints.length - 1]
  // Every bend on the RENDERED route is editable, not only the authored ones. An
  // automatic detour is a perfectly good starting point for a hand-placed route:
  // dragging one of its bends is how the user takes ownership of it, exactly as
  // dragging a computed step edge freezes its path into manual points.
  const editableWaypoints = useMemo<IPoint[]>(
    () => (dragHandleRoute ?? renderPoints).slice(1, -1),
    [dragHandleRoute, renderPoints]
  )
  const waypointHandleRoute = dragHandleRoute ?? renderPoints
  const sourceNeighbor = renderPoints[1]
  const targetNeighbor = renderPoints[renderPoints.length - 2]
  // Always: a straight edge has no bend handles, so a minimum-length gate would
  // leave short ones with no editable affordance at all.
  const canEditEndpoint = true
  const toolbarPosition = computeToolbarPosition(
    pathMiddlePosition,
    isMiddlePathHorizontal,
    // A waypoint can sit exactly at the route's arc midpoint. The standard
    // edge-toolbar offset was designed around step segments and lets the taller
    // three-action toolbar cover that circular grip, making it impossible to
    // pick up again. Keep the toolbar one handle target farther off the route.
    EDGES.WAYPOINT_HIT_TARGET_PX + EDGES.WAYPOINT_HANDLE_RADIUS_PX * 2
  )

  const edgeData: StraightPathEdgeData = {
    pathMiddlePosition,
    toolbarPosition,
    isMiddlePathHorizontal,
    sourcePoint,
    targetPoint,
    labelSourcePoint: middleSegment.start,
    labelTargetPoint: middleSegment.end,
  }

  const { getNodeRect, findFreeformEndpointNode } = useFreeformEndpointNode()

  const handleEndpointPointerDown = useCallback(
    (event: ReactPointerEvent<SVGRectElement>, endpoint: EndpointType) => {
      if (!event.isPrimary || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      activePointerCancelRef.current?.()
      const pointerId = event.pointerId
      const pointerTarget = event.currentTarget
      pointerTarget.setPointerCapture(pointerId)
      endpointDragCommitRef.current = null
      setEndpointPreviewCommit(null)

      const ownerDocument = event.currentTarget.ownerDocument
      const currentSourceEndpoint = sourcePoint
      const currentTargetEndpoint = targetPoint

      const resolveDragCommit = (
        clientX: number,
        clientY: number
      ): StraightEndpointDragCommit | null => {
        const flowPoint = screenToFlowPosition({ x: clientX, y: clientY })
        const intersectingNodes = getIntersectingNodes({
          x: flowPoint.x - FREEFORM_ENDPOINT_SNAP_RADIUS_PX,
          y: flowPoint.y - FREEFORM_ENDPOINT_SNAP_RADIUS_PX,
          width: FREEFORM_ENDPOINT_SNAP_RADIUS_PX * 2,
          height: FREEFORM_ENDPOINT_SNAP_RADIUS_PX * 2,
        })
        // Snap to the nearest connectable node under the pointer (see
        // pickNearestConnectable); fall back to the wider freeform search.
        const candidates = intersectingNodes.flatMap((node) => {
          const rect = getNodeRect(node)
          return rect ? [{ node, type: node.type, rect }] : []
        })
        const snapTarget =
          pickNearestConnectable(candidates, flowPoint) ??
          findFreeformEndpointNode(flowPoint)

        if (!snapTarget) return null

        const { node: nodeOnTop, rect } = snapTarget
        const anchor = getEdgeAnchorFromPoint(nodeOnTop.type, flowPoint, rect)
        if (!anchor) return null // node is not a connection target (mode "none")
        const resolvedAnchor = getEdgeAnchorPoint(nodeOnTop.type, rect, anchor)
        let sourceEndpoint = currentSourceEndpoint
        let targetEndpoint = currentTargetEndpoint

        if (endpoint === "source") {
          const movingEndpoint = adjustSourceCoordinates(
            resolvedAnchor.point.x,
            resolvedAnchor.point.y,
            resolvedAnchor.position,
            0
          )
          sourceEndpoint = {
            x: movingEndpoint.sourceX,
            y: movingEndpoint.sourceY,
          }
        } else {
          const targetPreviewPadding = getTargetConnectionPointPadding(
            padding,
            true
          )
          const movingEndpoint = adjustTargetCoordinates(
            resolvedAnchor.point.x,
            resolvedAnchor.point.y,
            resolvedAnchor.position,
            targetPreviewPadding
          )
          targetEndpoint = {
            x: movingEndpoint.targetX,
            y: movingEndpoint.targetY,
          }
        }

        const predictedData = { ...data }
        if (endpoint === "source") {
          predictedData.sourceAnchor = anchor
        } else {
          predictedData.targetAnchor = anchor
        }
        const predictedEdge: Edge = {
          id,
          source: endpoint === "source" ? nodeOnTop.id : source,
          target: endpoint === "target" ? nodeOnTop.id : target,
          sourceHandle:
            endpoint === "source"
              ? getSideHandleIdForPosition(resolvedAnchor.position)
              : sourceHandleId,
          targetHandle:
            endpoint === "target"
              ? getSideHandleIdForPosition(resolvedAnchor.position)
              : targetHandleId,
          type,
          data: predictedData,
        }

        return {
          endpoint,
          nodeId: nodeOnTop.id,
          handleId: getSideHandleIdForPosition(resolvedAnchor.position),
          anchor,
          sourcePosition:
            endpoint === "source"
              ? resolvedAnchor.position
              : resolvedSourcePosition,
          targetPosition:
            endpoint === "target"
              ? resolvedAnchor.position
              : resolvedTargetPosition,
          sourceEndpoint,
          targetEndpoint,
          predictedEdge,
        }
      }

      const handlePointerMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        const commit = resolveDragCommit(e.clientX, e.clientY)
        endpointDragCommitRef.current = commit
        setEndpointPreviewCommit(commit)
        if (commit) {
          // Reconnecting an endpoint preserves authored interior waypoints.
          setDragPreviewPoints([
            commit.sourceEndpoint,
            ...interiorPoints,
            commit.targetEndpoint,
          ])
          setDragPreviewPositions({
            sourcePosition: commit.sourcePosition,
            targetPosition: commit.targetPosition,
          })
          return
        }
        // No snap target (empty canvas): free preview whose dragged end follows
        // the cursor (straight, matching this edge). No commit ⇒ reverts on
        // release. Positions are irrelevant for a straight preview (the marker
        // orients along the path, not by side).
        const flowPoint = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        setDragPreviewPoints(
          endpoint === "source"
            ? [flowPoint, ...interiorPoints, currentTargetEndpoint]
            : [currentSourceEndpoint, ...interiorPoints, flowPoint]
        )
        setDragPreviewPositions(null)
      }

      const teardownPointerGesture = () => {
        ownerDocument.removeEventListener("pointermove", handlePointerMove)
        ownerDocument.removeEventListener("pointerup", handlePointerUp)
        ownerDocument.removeEventListener("pointercancel", handlePointerCancel)
        if (pointerTarget.hasPointerCapture(pointerId))
          pointerTarget.releasePointerCapture(pointerId)
        if (activePointerTeardownRef.current === teardownPointerGesture) {
          activePointerTeardownRef.current = null
          activePointerCancelRef.current = null
        }
      }

      const restoreWithoutCommit = () => {
        endpointDragCommitRef.current = null
        setEndpointPreviewCommit(null)
        setDragPreviewPoints(null)
        setDragPreviewPositions(null)
      }

      const handlePointerCancel = (e?: PointerEvent) => {
        if (e && e.pointerId !== pointerId) return
        restoreWithoutCommit()
        teardownPointerGesture()
      }

      const handlePointerUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        const commit = endpointDragCommitRef.current
        restoreWithoutCommit()

        if (commit) {
          setEdges((edges) =>
            edges.map((edge) => {
              if (edge.id !== id) return edge

              const nextData = {
                ...((edge.data ?? {}) as Record<string, unknown>),
              }
              if (commit.endpoint === "source") {
                nextData.sourceAnchor = commit.anchor
              } else {
                nextData.targetAnchor = commit.anchor
              }

              return commit.endpoint === "source"
                ? {
                    ...edge,
                    source: commit.nodeId,
                    sourceHandle: commit.handleId,
                    data: nextData,
                  }
                : {
                    ...edge,
                    target: commit.nodeId,
                    targetHandle: commit.handleId,
                    data: nextData,
                  }
            })
          )
        }

        teardownPointerGesture()
      }

      activePointerCancelRef.current = handlePointerCancel
      activePointerTeardownRef.current = teardownPointerGesture
      ownerDocument.addEventListener("pointermove", handlePointerMove)
      ownerDocument.addEventListener("pointerup", handlePointerUp)
      ownerDocument.addEventListener("pointercancel", handlePointerCancel)
    },
    [
      sourcePoint,
      targetPoint,
      interiorPoints,
      data,
      findFreeformEndpointNode,
      getIntersectingNodes,
      getNodeRect,
      id,
      padding,
      resolvedSourcePosition,
      resolvedTargetPosition,
      screenToFlowPosition,
      setEdges,
      source,
      sourceHandleId,
      target,
      targetHandleId,
      type,
    ]
  )

  // Persist the interior waypoints. A bend customises the whole visible route,
  // including the facing-side attachment sites the port assignment chose, so on the
  // first bend the endpoints are pinned to `pinSource`/`pinTarget` (when still
  // automatic) — otherwise a newly-bent edge would snap its endpoints back to the
  // drawn handle. Mirrors the step-edge bend-commit behaviour.
  const commitWaypoints = useCallback(
    (nextInterior: IPoint[], pinSource: IPoint, pinTarget: IPoint) => {
      setEdges((edges) =>
        edges.map((edge) => {
          if (edge.id !== id) return edge
          const nextData: Record<string, unknown> = {
            ...((edge.data ?? {}) as Record<string, unknown>),
            points: nextInterior,
          }
          if (nextInterior.length > 0) {
            if (!isFreeformEdgeAnchor(sourceAnchor) && sourceRect) {
              const anchor = getEdgeAnchorFromPoint(
                sourceNode?.type,
                pinSource,
                sourceRect
              )
              if (anchor) nextData.sourceAnchor = anchor
            }
            if (!isFreeformEdgeAnchor(targetAnchor) && targetRect) {
              const anchor = getEdgeAnchorFromPoint(
                targetNode?.type,
                pinTarget,
                targetRect
              )
              if (anchor) nextData.targetAnchor = anchor
            }
          }
          return { ...edge, data: nextData }
        })
      )
    },
    [
      id,
      setEdges,
      sourceAnchor,
      targetAnchor,
      sourceRect,
      targetRect,
      sourceNode?.type,
      targetNode?.type,
    ]
  )

  // Shared drag routine for both an existing waypoint and a freshly materialised
  // one. `startInterior` is the interior array the drag operates on; `index` is the
  // waypoint being moved. The live route is published so neighbouring step edges
  // reflow around the dragged diagonal, and only pointer-up commits `data.points`.
  const beginWaypointDrag = useCallback(
    (
      pointerId: number,
      pointerTarget: SVGRectElement,
      index: number,
      startInterior: IPoint[],
      movedAtStart = false
    ) => {
      if (!pointerTarget.hasPointerCapture(pointerId))
        pointerTarget.setPointerCapture(pointerId)
      const ownerDocument = pointerTarget.ownerDocument
      dragInteriorRef.current = startInterior
      dragMovedRef.current = movedAtStart
      dragCollapseRef.current = false
      // The endpoints the drag pivots around are the CURRENTLY RENDERED attachment
      // sites (the solver's facing-side ports), captured at gesture start — not the
      // drawn handle — so the route and the pinned commit keep the edge attached
      // exactly where it is on screen.
      const routeSource = sourcePoint
      const routeTarget = targetPoint
      const collapseTolerance =
        EDGES.WAYPOINT_COLLAPSE_SNAP_SCREEN_PX / Math.max(getZoom(), 0.01)
      const routeAtStart = [routeSource, ...startInterior, routeTarget]
      // Match tldraw's stable "next vertex first" reference rule. The final
      // waypoint falls back to its previous neighbour.
      const angleReference = routeAtStart[index + 2] ?? routeAtStart[index]

      // Drive the preview through state; the existing layout effect republishes it
      // as an authoritative live override so neighbouring step edges reflow around
      // the dragged diagonal, and clears it when the drag ends.
      const publish = (
        pathInterior: IPoint[],
        handleInterior: IPoint[] = pathInterior
      ) => {
        setDragPreviewPoints([routeSource, ...pathInterior, routeTarget])
        setDragHandleRoute([routeSource, ...handleInterior, routeTarget])
      }
      // Seed the preview so the edge does not flicker to its committed shape on the
      // first frame (the inserted point starts on the segment).
      publish(dragInteriorRef.current)

      const handlePointerMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        const flowPoint = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        const candidate = e.shiftKey
          ? snapPointToAngle(flowPoint, angleReference)
          : flowPoint
        dragInteriorRef.current = moveWaypoint(
          dragInteriorRef.current,
          index,
          candidate,
          e.shiftKey ? 1 : EDGES.BEND_SNAP_GRID_PX
        )
        dragMovedRef.current = true
        dragCollapseRef.current = isWaypointCollapseCandidate(
          [routeSource, ...dragInteriorRef.current, routeTarget],
          index + 1,
          dragInteriorRef.current[index],
          collapseTolerance
        )
        // Visibly straighten while inside the magnetic band. The document-level
        // listeners keep the gesture alive while its handle is absent, so moving
        // away restores the bend naturally.
        publish(
          dragCollapseRef.current
            ? removeWaypoint(dragInteriorRef.current, index)
            : dragInteriorRef.current,
          dragInteriorRef.current
        )
      }

      const teardown = () => {
        ownerDocument.removeEventListener("pointermove", handlePointerMove)
        ownerDocument.removeEventListener("pointerup", handlePointerUp)
        ownerDocument.removeEventListener("pointercancel", handlePointerCancel)
        if (pointerTarget.hasPointerCapture(pointerId))
          pointerTarget.releasePointerCapture(pointerId)
        if (activePointerTeardownRef.current === teardown) {
          activePointerTeardownRef.current = null
          activePointerCancelRef.current = null
        }
      }

      const handlePointerCancel = (e?: PointerEvent) => {
        if (e && e.pointerId !== pointerId) return
        setDragPreviewPoints(null)
        setDragHandleRoute(null)
        teardown()
      }

      const handlePointerUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        setDragPreviewPoints(null)
        setDragHandleRoute(null)
        // Drag-to-collinear removes redundant bends (incl. the dragged one).
        const releasedInterior = dragCollapseRef.current
          ? removeWaypoint(dragInteriorRef.current, index)
          : dragInteriorRef.current
        const pruned = pruneCollinearWaypoints([
          routeSource,
          ...releasedInterior,
          routeTarget,
        ])
        // Only persist when the geometry actually changed (a click that never
        // moved must not freeze a fresh point into the model).
        if (dragMovedRef.current || pruned.length !== startInterior.length) {
          commitWaypoints(pruned, routeSource, routeTarget)
        }
        setSelectedWaypointIndex(null)
        teardown()
      }

      activePointerCancelRef.current = handlePointerCancel
      activePointerTeardownRef.current = teardown
      ownerDocument.addEventListener("pointermove", handlePointerMove)
      ownerDocument.addEventListener("pointerup", handlePointerUp)
      ownerDocument.addEventListener("pointercancel", handlePointerCancel)
    },
    [commitWaypoints, getZoom, screenToFlowPosition, sourcePoint, targetPoint]
  )

  const handleWaypointPointerDown = useCallback(
    (event: ReactPointerEvent<SVGRectElement>, index: number) => {
      if (!event.isPrimary || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      event.currentTarget.focus()
      activePointerCancelRef.current?.()
      setSelectedWaypointIndex(index)
      beginWaypointDrag(
        event.pointerId,
        event.currentTarget,
        index,
        editableWaypoints
      )
    },
    [beginWaypointDrag, editableWaypoints]
  )

  // A ghost midpoint materialises a new waypoint only once the pointer has moved
  // past the threshold (so a stray tap never litters the edge with points); the
  // gesture then continues as an ordinary waypoint drag on the new point.
  const handleGhostPointerDown = useCallback(
    (event: ReactPointerEvent<SVGRectElement>, segmentIndex: number) => {
      if (!event.isPrimary || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      activePointerCancelRef.current?.()
      const pointerId = event.pointerId
      const pointerTarget = event.currentTarget
      pointerTarget.setPointerCapture(pointerId)
      const ownerDocument = pointerTarget.ownerDocument
      const origin = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const cleanup = () => {
        ownerDocument.removeEventListener("pointermove", handleFirstMove)
        ownerDocument.removeEventListener("pointerup", handleEnd)
        ownerDocument.removeEventListener("pointercancel", handleEnd)
        if (pointerTarget.hasPointerCapture(pointerId))
          pointerTarget.releasePointerCapture(pointerId)
        if (activePointerTeardownRef.current === cleanup) {
          activePointerTeardownRef.current = null
          activePointerCancelRef.current = null
        }
      }

      const handleFirstMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        const flowPoint = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        if (!exceedsDragThreshold(origin, flowPoint)) return
        cleanup()
        const seeded = insertWaypoint(
          editableWaypoints,
          segmentIndex,
          snapPoint(flowPoint)
        )
        setSelectedWaypointIndex(segmentIndex)
        // Hand off on the same pointer/element. Crossing the threshold is already
        // a meaningful move: pointer-up may be the very next event on a quick
        // mouse, touch, or stylus gesture, so preserve that state across handoff.
        beginWaypointDrag(pointerId, pointerTarget, segmentIndex, seeded, true)
      }

      const handleEnd = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        cleanup()
      }

      activePointerCancelRef.current = cleanup
      activePointerTeardownRef.current = cleanup
      ownerDocument.addEventListener("pointermove", handleFirstMove)
      ownerDocument.addEventListener("pointerup", handleEnd)
      ownerDocument.addEventListener("pointercancel", handleEnd)
    },
    [beginWaypointDrag, editableWaypoints, screenToFlowPosition]
  )

  const handleWaypointDoubleClick = useCallback(
    (index: number) => {
      commitWaypoints(
        pruneCollinearWaypoints([
          sourcePoint,
          ...removeWaypoint(editableWaypoints, index),
          targetPoint,
        ]),
        sourcePoint,
        targetPoint
      )
      setSelectedWaypointIndex(null)
    },
    [editableWaypoints, commitWaypoints, sourcePoint, targetPoint]
  )

  const handleWaypointKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGRectElement>, index: number) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return
      event.preventDefault()
      event.stopPropagation()
      handleWaypointDoubleClick(index)
    },
    [handleWaypointDoubleClick]
  )

  return {
    pathRef,
    edgeData,
    currentPath,
    overlayPath,
    markerEnd,
    markerStart,
    strokeDashArray,
    sourcePoint,
    targetPoint,
    sourceNeighbor,
    targetNeighbor,
    route: waypointHandleRoute,
    interior: editableWaypoints,
    selectedWaypointIndex,
    isDiagramModifiable,
    canEditEndpoint,
    handleEndpointPointerDown,
    handleWaypointPointerDown,
    handleGhostPointerDown,
    handleWaypointDoubleClick,
    handleWaypointKeyDown,
    sourcePosition: renderSourcePosition,
    targetPosition: renderTargetPosition,
  }
}
