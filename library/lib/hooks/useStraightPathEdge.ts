import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { Position, useReactFlow, useStore, type Node } from "@xyflow/react"
import {
  calculateOverlayPath,
  calculateStraightPath,
  getEdgeMarkerStyles,
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getSideHandleIdForPosition,
  isFreeformEdgeAnchor,
  type FreeformEdgeAnchor,
} from "@/utils/edgeUtils"
import {
  getEdgeAnchorFromPoint,
  getEdgeAnchorPoint,
} from "@/utils/connectionModes"
import { EDGES } from "@/constants"
import { useDiagramModifiable } from "./useDiagramModifiable"
import { IPoint } from "../edges/Connection"
import { BaseEdgeProps } from "../edges/GenericEdge"
import {
  computeToolbarPosition,
  isLengthEditableAtZoom,
} from "@/utils/geometry/bendHandles"
import { getMidSegment } from "@/utils/geometry/edgeLabelLayout"
import {
  useEdgeLineJumps,
  usePublishEdgeGeometry,
  buildEdgePath,
} from "./useEdgeLineJumps"
import { useDiagramStore, useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { getPositionOnCanvas, isParentNodeType } from "@/utils"

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
}

const FREEFORM_ENDPOINT_SNAP_RADIUS_PX = 48

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
  data,
}: BaseEdgeProps) => {
  const pathRef = useRef<SVGPathElement | null>(null)
  const endpointDragCommitRef = useRef<StraightEndpointDragCommit | null>(null)
  const isDiagramModifiable = useDiagramModifiable()
  const zoom = useStore((state) => state.transform[2])
  const isReconnecting = useMetadataStore(
    (state) => state.reconnectPreviewEdgeId === id
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
    allNodes.find((node) => node.id === source) ?? getNode(source)!
  const targetNode =
    allNodes.find((node) => node.id === target) ?? getNode(target)!
  const sourceAbsolutePosition = useMemo(() => {
    if (sourceNodePositionX != null && sourceNodePositionY != null) {
      return { x: sourceNodePositionX, y: sourceNodePositionY }
    }
    if (!sourceNode) return { x: sourceX, y: sourceY }
    return getPositionOnCanvas(sourceNode, allNodes)
  }, [
    sourceNodePositionX,
    sourceNodePositionY,
    sourceNode,
    allNodes,
    sourceX,
    sourceY,
  ])
  const targetAbsolutePosition = useMemo(() => {
    if (targetNodePositionX != null && targetNodePositionY != null) {
      return { x: targetNodePositionX, y: targetNodePositionY }
    }
    if (!targetNode) return { x: targetX, y: targetY }
    return getPositionOnCanvas(targetNode, allNodes)
  }, [
    targetNodePositionX,
    targetNodePositionY,
    targetNode,
    allNodes,
    targetX,
    targetY,
  ])
  const sourceRect = useMemo(
    () =>
      sourceNode
        ? {
            x: sourceAbsolutePosition.x,
            y: sourceAbsolutePosition.y,
            width: sourceNodeWidth ?? sourceNode.width ?? 0,
            height: sourceNodeHeight ?? sourceNode.height ?? 0,
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
            width: targetNodeWidth ?? targetNode.width ?? 0,
            height: targetNodeHeight ?? targetNode.height ?? 0,
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
  const targetConnectionPointPadding = resolvedTargetAnchor ? 0 : padding

  // Round coordinates to whole pixels for pixel-perfect rendering
  // React Flow may return fractional values when node dimensions are odd
  const roundedSourceX = Math.round(resolvedSourceX)
  const roundedSourceY = Math.round(resolvedSourceY)
  const roundedTargetX = Math.round(resolvedTargetX)
  const roundedTargetY = Math.round(resolvedTargetY)

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
  const renderPoints = dragPreviewPoints ?? basePoints
  const renderSourcePosition =
    dragPreviewPositions?.sourcePosition ?? resolvedSourcePosition
  const renderTargetPosition =
    dragPreviewPositions?.targetPosition ?? resolvedTargetPosition

  // Publish this edge's real geometry so other edges bridge over it accurately.
  usePublishEdgeGeometry(id, renderPoints)

  // UseCase include/extend edges are dashed connectors that never read as
  // crossings to disambiguate, so they opt out of bridging.
  const lineJumps = useEdgeLineJumps(
    id,
    renderPoints,
    !isReconnecting && type !== "UseCaseInclude" && type !== "UseCaseExtend"
  )

  // Midpoint + orientation derived purely from the two endpoints. A straight
  // edge's middle is analytic, so this replaces the old getPointAtLength +
  // setTimeout effect (and its two redundant fallback effects) with one
  // synchronous, DOM-free, export-stable computation.
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
  const canvasLength = Math.hypot(
    targetPoint.x - sourcePoint.x,
    targetPoint.y - sourcePoint.y
  )
  const canEditEndpoint = isLengthEditableAtZoom(
    canvasLength,
    EDGES.BEND_MIN_LENGTH,
    zoom
  )
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

  const getNodeRect = useCallback(
    (node: Node) => {
      const nodes = getNodes()
      const currentNode = nodes.find((candidate) => candidate.id === node.id)
      const resolvedNode = currentNode ?? node
      const width = resolvedNode.width ?? 0
      const height = resolvedNode.height ?? 0

      if (!width || !height) return null

      const position = getPositionOnCanvas(resolvedNode, nodes)
      return { x: position.x, y: position.y, width, height }
    },
    [getNodes]
  )

  const findFreeformEndpointNode = useCallback(
    (
      flowPoint: IPoint
    ): { node: Node; rect: NonNullable<typeof sourceRect> } | null => {
      const nodes = getNodes()
      let best: {
        node: Node
        rect: NonNullable<typeof sourceRect>
        distance: number
      } | null = null

      for (const node of nodes) {
        if (isParentNodeType(node.type)) continue

        const rect = getNodeRect(node)
        if (!rect) continue

        const dx =
          flowPoint.x < rect.x
            ? rect.x - flowPoint.x
            : flowPoint.x > rect.x + rect.width
              ? flowPoint.x - (rect.x + rect.width)
              : 0
        const dy =
          flowPoint.y < rect.y
            ? rect.y - flowPoint.y
            : flowPoint.y > rect.y + rect.height
              ? flowPoint.y - (rect.y + rect.height)
              : 0
        const distance = Math.hypot(dx, dy)

        if (
          distance <= FREEFORM_ENDPOINT_SNAP_RADIUS_PX &&
          (!best || distance < best.distance)
        ) {
          best = { node, rect, distance }
        }
      }

      return best ? { node: best.node, rect: best.rect } : null
    },
    [getNodeRect, getNodes]
  )

  const handleEndpointPointerDown = useCallback(
    (event: ReactPointerEvent<SVGRectElement>, endpoint: EndpointType) => {
      event.preventDefault()
      event.stopPropagation()
      endpointDragCommitRef.current = null

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
        // Snap to the NEAREST node under the pointer (distance to its box, 0 when
        // inside), not the top-most — so with nodes close together the endpoint
        // grabs the one it is actually over, not a neighbour its box merely
        // grazed. Prefer a child; fall back to a container (parent) when that is
        // the only thing there, so an endpoint can still land on an
        // activity/package/pool/subsystem itself.
        const sizedHits = intersectingNodes.filter(
          (node) => node.width != null && node.height != null
        )
        let snapNode: (typeof sizedHits)[number] | null = null
        let snapRect: ReturnType<typeof getNodeRect> = null
        let bestDistance = Infinity
        const nonParent = sizedHits.filter(
          (node) => !isParentNodeType(node.type)
        )
        for (const node of nonParent.length > 0 ? nonParent : sizedHits) {
          const rect = getNodeRect(node)
          if (!rect) continue
          const dx = Math.max(
            rect.x - flowPoint.x,
            0,
            flowPoint.x - (rect.x + rect.width)
          )
          const dy = Math.max(
            rect.y - flowPoint.y,
            0,
            flowPoint.y - (rect.y + rect.height)
          )
          const distance = Math.hypot(dx, dy)
          if (distance <= bestDistance) {
            bestDistance = distance
            snapNode = node
            snapRect = rect
          }
        }
        const snapTarget =
          snapNode && snapRect
            ? { node: snapNode, rect: snapRect }
            : findFreeformEndpointNode(flowPoint)

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
          const movingEndpoint = adjustTargetCoordinates(
            resolvedAnchor.point.x,
            resolvedAnchor.point.y,
            resolvedAnchor.position,
            0
          )
          targetEndpoint = {
            x: movingEndpoint.targetX,
            y: movingEndpoint.targetY,
          }
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
        }
      }

      const handlePointerMove = (e: PointerEvent) => {
        const commit = resolveDragCommit(e.clientX, e.clientY)
        endpointDragCommitRef.current = commit
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

      const handlePointerUp = () => {
        const commit = endpointDragCommitRef.current
        endpointDragCommitRef.current = null
        setDragPreviewPoints(null)
        setDragPreviewPositions(null)

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

        ownerDocument.removeEventListener("pointermove", handlePointerMove)
        ownerDocument.removeEventListener("pointerup", handlePointerUp)
      }

      ownerDocument.addEventListener("pointermove", handlePointerMove)
      ownerDocument.addEventListener("pointerup", handlePointerUp, {
        once: true,
      })
    },
    [
      basePoints,
      findFreeformEndpointNode,
      getIntersectingNodes,
      getNodeRect,
      id,
      resolvedSourcePosition,
      resolvedTargetPosition,
      screenToFlowPosition,
      setEdges,
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
    isReconnecting,
    canEditEndpoint,
    handleEndpointPointerDown,
    sourcePosition: renderSourcePosition,
    targetPosition: renderTargetPosition,
  }
}
