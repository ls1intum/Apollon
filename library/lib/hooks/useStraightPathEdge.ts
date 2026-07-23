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
  const centralRoute = useEdgeGeometryStore(
    (state) => state.previewById[id] ?? state.geometryById[id]
  )

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

  const basePoints = useMemo<IPoint[]>(
    () => [
      {
        x: adjustedSourceCoordinates.sourceX,
        y: adjustedSourceCoordinates.sourceY,
      },
      {
        x: adjustedTargetCoordinates.targetX,
        y: adjustedTargetCoordinates.targetY,
      },
    ],
    [
      adjustedSourceCoordinates.sourceX,
      adjustedSourceCoordinates.sourceY,
      adjustedTargetCoordinates.targetX,
      adjustedTargetCoordinates.targetY,
    ]
  )
  const centralPreviewMatchesCommit =
    dragPreviewPoints !== null &&
    endpointPreviewCommit !== null &&
    centralRoute !== undefined &&
    centralRoute.length >= 2 &&
    (endpointPreviewCommit.endpoint === "source"
      ? centralRoute[0].x === endpointPreviewCommit.sourceEndpoint.x &&
        centralRoute[0].y === endpointPreviewCommit.sourceEndpoint.y
      : centralRoute[centralRoute.length - 1].x ===
          endpointPreviewCommit.targetEndpoint.x &&
        centralRoute[centralRoute.length - 1].y ===
          endpointPreviewCommit.targetEndpoint.y)
  const renderPoints = useMemo<IPoint[]>(
    () =>
      centralPreviewMatchesCommit
        ? [centralRoute[0], centralRoute[centralRoute.length - 1]]
        : (dragPreviewPoints ?? basePoints),
    [basePoints, centralPreviewMatchesCommit, centralRoute, dragPreviewPoints]
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
      () => getMidSegment(renderPoints, renderPoints[0], renderPoints[1]),
      [renderPoints]
    )

  const currentPath = useMemo(() => {
    if (lineJumps.length > 0) return buildEdgePath(renderPoints, lineJumps)
    return calculateStraightPath(
      renderPoints[0].x,
      renderPoints[0].y,
      renderPoints[1].x,
      renderPoints[1].y,
      type
    )
  }, [renderPoints, type, lineJumps])

  const overlayPath = useMemo(() => {
    // When bridging, the arc'd path is the hit target too, so the selectable
    // stroke matches exactly what's drawn.
    if (lineJumps.length > 0) return currentPath
    return calculateOverlayPath(
      renderPoints[0].x,
      renderPoints[0].y,
      renderPoints[1].x,
      renderPoints[1].y,
      type
    )
  }, [renderPoints, type, currentPath, lineJumps])

  const [sourcePoint, targetPoint] = renderPoints
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
      const currentSourceEndpoint = basePoints[0]
      const currentTargetEndpoint = basePoints[1]

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
          setDragPreviewPoints([commit.sourceEndpoint, commit.targetEndpoint])
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
            ? [flowPoint, currentTargetEndpoint]
            : [currentSourceEndpoint, flowPoint]
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
      basePoints,
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
    isDiagramModifiable,
    canEditEndpoint,
    handleEndpointPointerDown,
    sourcePosition: renderSourcePosition,
    targetPosition: renderTargetPosition,
  }
}
