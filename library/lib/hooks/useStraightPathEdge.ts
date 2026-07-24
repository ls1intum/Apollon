import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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
  moveWaypoint,
  pruneCollinearWaypoints,
  removeWaypoint,
  snapPoint,
} from "@/utils/geometry/freeWaypoints"
import { getMidSegment } from "@/utils/geometry/edgeLabelLayout"
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
}

/** Stable empty interior list so an unbent edge keeps a constant reference and
 * does not churn the downstream route memos every render. */
const EMPTY_POINTS: IPoint[] = []

type EndpointType = "source" | "target"

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
  const isDiagramModifiable = useDiagramModifiable()
  const setLiveEdgeOverride = useMetadataStore(
    (state) => state.setLiveEdgeOverride
  )
  const { getIntersectingNodes, getNode, getNodes, screenToFlowPosition } =
    useReactFlow()
  const [dragPreviewPoints, setDragPreviewPoints] = useState<IPoint[] | null>(
    null
  )
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
  // Prefer the solver's committed route (which also carries any automatic
  // obstacle-avoidance bends) whenever its endpoints still match the current
  // adjusted endpoints; otherwise fall back to the analytic base polyline.
  const centralRouteMatchesEndpoints =
    centralRoute !== undefined &&
    centralRoute.length >= 2 &&
    centralRoute[0].x === sourceEndpoint.x &&
    centralRoute[0].y === sourceEndpoint.y &&
    centralRoute[centralRoute.length - 1].x === targetEndpoint.x &&
    centralRoute[centralRoute.length - 1].y === targetEndpoint.y
  const renderPoints = useMemo<IPoint[]>(
    () =>
      dragPreviewPoints ??
      (centralRouteMatchesEndpoints ? centralRoute! : basePoints),
    [basePoints, centralRoute, centralRouteMatchesEndpoints, dragPreviewPoints]
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

  // Midpoint + orientation derived purely from the two endpoints. A straight
  // edge's middle is analytic, so it is computed synchronously, DOM-free, and
  // export-stable.
  const { point: pathMiddlePosition, isHorizontal: isMiddlePathHorizontal } =
    useMemo(
      () =>
        getMidSegment(
          renderPoints,
          renderPoints[0],
          renderPoints[renderPoints.length - 1]
        ),
      [renderPoints]
    )

  // A bent edge (interior waypoints or a bridged crossing) draws its polyline via
  // buildEdgePath; a plain 2-point edge keeps calculateStraightPath so the marker
  // padding / include-extend gap on its single segment is byte-identical to before.
  const isPolyline = renderPoints.length > 2 || lineJumps.length > 0
  const currentPath = useMemo(() => {
    if (isPolyline) return buildEdgePath(renderPoints, lineJumps)
    return calculateStraightPath(
      renderPoints[0].x,
      renderPoints[0].y,
      renderPoints[1].x,
      renderPoints[1].y,
      type
    )
  }, [renderPoints, type, lineJumps, isPolyline])

  const overlayPath = useMemo(() => {
    // When bridging, the arc'd path is the hit target too, so the selectable
    // stroke matches exactly what's drawn.
    if (lineJumps.length > 0) return currentPath
    if (renderPoints.length > 2) return buildEdgePath(renderPoints, [])
    return calculateOverlayPath(
      renderPoints[0].x,
      renderPoints[0].y,
      renderPoints[1].x,
      renderPoints[1].y,
      type
    )
  }, [renderPoints, type, currentPath, lineJumps])

  const sourcePoint = renderPoints[0]
  const targetPoint = renderPoints[renderPoints.length - 1]
  const sourceNeighbor = renderPoints[1]
  const targetNeighbor = renderPoints[renderPoints.length - 2]
  // Always: a straight edge has no bend handles, so a minimum-length gate would
  // leave short ones with no editable affordance at all.
  const canEditEndpoint = true
  const toolbarPosition = computeToolbarPosition(
    pathMiddlePosition,
    isMiddlePathHorizontal
  )

  const edgeData: StraightPathEdgeData = {
    pathMiddlePosition,
    toolbarPosition,
    isMiddlePathHorizontal,
    sourcePoint,
    targetPoint,
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
      const currentSourceEndpoint = sourceEndpoint
      const currentTargetEndpoint = targetEndpoint

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
      sourceEndpoint,
      targetEndpoint,
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

  const persistInterior = useCallback(
    (nextInterior: IPoint[]) => {
      setEdges((edges) =>
        edges.map((edge) =>
          edge.id === id
            ? { ...edge, data: { ...edge.data, points: nextInterior } }
            : edge
        )
      )
    },
    [id, setEdges]
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
      startInterior: IPoint[]
    ) => {
      if (!pointerTarget.hasPointerCapture(pointerId))
        pointerTarget.setPointerCapture(pointerId)
      const ownerDocument = pointerTarget.ownerDocument
      dragInteriorRef.current = startInterior
      dragMovedRef.current = false

      // Drive the preview through state; the existing layout effect republishes it
      // as an authoritative live override so neighbouring step edges reflow around
      // the dragged diagonal, and clears it when the drag ends.
      const publish = (interior: IPoint[]) => {
        setDragPreviewPoints([sourceEndpoint, ...interior, targetEndpoint])
      }
      // Seed the preview so the edge does not flicker to its committed shape on the
      // first frame (the inserted point starts on the segment).
      publish(dragInteriorRef.current)

      const handlePointerMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        const flowPoint = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        dragInteriorRef.current = moveWaypoint(
          dragInteriorRef.current,
          index,
          flowPoint
        )
        dragMovedRef.current = true
        publish(dragInteriorRef.current)
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
        teardown()
      }

      const handlePointerUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        setDragPreviewPoints(null)
        // Drag-to-collinear removes redundant bends (incl. the dragged one).
        const pruned = pruneCollinearWaypoints([
          sourceEndpoint,
          ...dragInteriorRef.current,
          targetEndpoint,
        ])
        // Only persist when the geometry actually changed (a click that never
        // moved must not freeze a fresh point into the model).
        if (dragMovedRef.current || pruned.length !== interiorPoints.length) {
          persistInterior(pruned)
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
    [
      interiorPoints.length,
      persistInterior,
      screenToFlowPosition,
      sourceEndpoint,
      targetEndpoint,
    ]
  )

  const handleWaypointPointerDown = useCallback(
    (event: ReactPointerEvent<SVGRectElement>, index: number) => {
      if (!event.isPrimary || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      activePointerCancelRef.current?.()
      setSelectedWaypointIndex(index)
      beginWaypointDrag(
        event.pointerId,
        event.currentTarget,
        index,
        interiorPoints
      )
    },
    [beginWaypointDrag, interiorPoints]
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
          interiorPoints,
          segmentIndex,
          snapPoint(flowPoint)
        )
        setSelectedWaypointIndex(segmentIndex)
        // Hand off to the shared drag routine on the same pointer/element.
        beginWaypointDrag(pointerId, pointerTarget, segmentIndex, seeded)
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
    [beginWaypointDrag, interiorPoints, screenToFlowPosition]
  )

  const handleWaypointDoubleClick = useCallback(
    (index: number) => {
      persistInterior(
        pruneCollinearWaypoints([
          sourceEndpoint,
          ...removeWaypoint(interiorPoints, index),
          targetEndpoint,
        ])
      )
      setSelectedWaypointIndex(null)
    },
    [interiorPoints, persistInterior, sourceEndpoint, targetEndpoint]
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
    route: renderPoints,
    interior: interiorPoints,
    selectedWaypointIndex,
    isDiagramModifiable,
    canEditEndpoint,
    handleEndpointPointerDown,
    handleWaypointPointerDown,
    handleGhostPointerDown,
    handleWaypointDoubleClick,
    sourcePosition: renderSourcePosition,
    targetPosition: renderTargetPosition,
  }
}
