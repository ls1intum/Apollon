import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { getSmoothStepPath, useReactFlow } from "@xyflow/react"
import { log } from "../logger"
import {
  calculateOverlayPath,
  calculateStraightPath,
  getEdgeMarkerStyles,
  getAxisAlignedSegments,
  findLineJumpIntersection,
  getHandlePositionOnNode,
  getHandleSideFromId,
  buildPathWithLineJumpAtPoint,
  isStraightEdgeType,
  simplifySvgPath,
  removeDuplicatePoints,
  parseSvgPath,
  adjustSourceCoordinates,
  adjustTargetCoordinates,
} from "@/utils/edgeUtils"
import { EDGES } from "@/constants"
import { useDiagramModifiable } from "./useDiagramModifiable"
import { IPoint } from "../edges/Connection"
import { useEdgeReconnection, BaseEdgeProps } from "../edges/GenericEdge"
import { useHandleFinder } from "./useHandleFinder"
import { useDiagramStore } from "@/store/context"
import { getPositionOnCanvas } from "@/utils"

export interface StraightPathEdgeData {
  pathMiddlePosition: IPoint
  isMiddlePathHorizontal: boolean
  sourcePoint: IPoint
  targetPoint: IPoint
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
  enableReconnection = true,
}: Omit<BaseEdgeProps, "data"> & { enableReconnection?: boolean }) => {
  const pathRef = useRef<SVGPathElement | null>(null)
  const isDiagramModifiable = useDiagramModifiable()
  const { screenToFlowPosition, getNode, getNodes } = useReactFlow()
  const edges = useDiagramStore((state) => state.edges)
  const [tempReconnectPath, setTempReconnectPath] = useState<string | null>(
    null
  )

  const hasReconnectionSupport = id && source && target && enableReconnection

  // Hooks must be called unconditionally (Rules of Hooks).
  // We always call them, but only use the results when reconnection is supported.
  const reconnection = useEdgeReconnection(
    id ?? "",
    source ?? "",
    target ?? "",
    sourceHandleId,
    targetHandleId
  )
  const handleFinder = useHandleFinder()

  const { isReconnectingRef, startReconnection, completeReconnection } =
    hasReconnectionSupport
      ? reconnection
      : {
          isReconnectingRef: {
            current: false,
          } as React.MutableRefObject<boolean>,
          startReconnection:
            (() => {}) as typeof reconnection.startReconnection,
          completeReconnection:
            (() => {}) as typeof reconnection.completeReconnection,
        }

  const { findBestHandle } = hasReconnectionSupport
    ? handleFinder
    : {
        findBestHandle: (() => ({
          handle: null,
          node: null,
          shouldClearPoints: false,
        })) as typeof handleFinder.findBestHandle,
      }

  const { markerEnd, markerStart, strokeDashArray, markerPadding } =
    getEdgeMarkerStyles(type)

  const padding = markerPadding ?? EDGES.MARKER_PADDING

  // Round coordinates to whole pixels for pixel-perfect rendering
  // React Flow may return fractional values when node dimensions are odd
  const roundedSourceX = Math.round(sourceX)
  const roundedSourceY = Math.round(sourceY)
  const roundedTargetX = Math.round(targetX)
  const roundedTargetY = Math.round(targetY)

  const adjustedTargetCoordinates = adjustTargetCoordinates(
    roundedTargetX,
    roundedTargetY,
    targetPosition,
    padding
  )

  const adjustedSourceCoordinates = adjustSourceCoordinates(
    roundedSourceX,
    roundedSourceY,
    sourcePosition,
    EDGES.SOURCE_CONNECTION_POINT_PADDING
  )

  const allNodes = getNodes()

  const sourcePoint = {
    x: adjustedSourceCoordinates.sourceX,
    y: adjustedSourceCoordinates.sourceY,
  }
  const targetPoint = {
    x: adjustedTargetCoordinates.targetX,
    y: adjustedTargetCoordinates.targetY,
  }

  const getEdgePointsForJump = useCallback(
    (edge: {
      id: string
      source: string
      target: string
      type?: string | null
      sourceHandle?: string | null
      targetHandle?: string | null
      data?: { points?: IPoint[] }
    }) => {
      if (edge.data?.points && edge.data.points.length > 1) {
        return edge.data.points
      }

      const sourceNode = getNode(edge.source)
      const targetNode = getNode(edge.target)

      if (
        !sourceNode ||
        !targetNode ||
        sourceNode.width == null ||
        sourceNode.height == null ||
        targetNode.width == null ||
        targetNode.height == null
      ) {
        return null
      }

      const sourcePositionOnCanvas = getPositionOnCanvas(sourceNode, allNodes)
      const targetPositionOnCanvas = getPositionOnCanvas(targetNode, allNodes)

      const sourceHandle = edge.sourceHandle ?? "right"
      const targetHandle = edge.targetHandle ?? "left"

      const sourceHandlePoint = getHandlePositionOnNode({
        nodeType: sourceNode.type,
        nodePosition: sourcePositionOnCanvas,
        width: sourceNode.width,
        height: sourceNode.height,
        handleId: sourceHandle,
      })
      const targetHandlePoint = getHandlePositionOnNode({
        nodeType: targetNode.type,
        nodePosition: targetPositionOnCanvas,
        width: targetNode.width,
        height: targetNode.height,
        handleId: targetHandle,
      })

      if (isStraightEdgeType(edge.type)) {
        return [sourceHandlePoint, targetHandlePoint]
      }

      const sourceHandleSide = getHandleSideFromId(sourceHandle)
      const targetHandleSide = getHandleSideFromId(targetHandle)
      const { markerPadding } = getEdgeMarkerStyles(edge.type ?? type)
      const padding = markerPadding ?? EDGES.MARKER_PADDING

      const adjustedTarget = adjustTargetCoordinates(
        Math.round(targetHandlePoint.x),
        Math.round(targetHandlePoint.y),
        targetHandleSide,
        padding
      )
      const adjustedSource = adjustSourceCoordinates(
        Math.round(sourceHandlePoint.x),
        Math.round(sourceHandlePoint.y),
        sourceHandleSide,
        EDGES.SOURCE_CONNECTION_POINT_PADDING
      )

      const [edgePath] = getSmoothStepPath({
        sourceX: adjustedSource.sourceX,
        sourceY: adjustedSource.sourceY,
        sourcePosition: sourceHandleSide,
        targetX: adjustedTarget.targetX,
        targetY: adjustedTarget.targetY,
        targetPosition: targetHandleSide,
        borderRadius: EDGES.STEP_BORDER_RADIUS,
        offset: 30,
      })

      const simplifiedPath = simplifySvgPath(edgePath)
      return removeDuplicatePoints(parseSvgPath(simplifiedPath))
    },
    [allNodes, getNode, type]
  )

  const lineJump = useMemo(() => {
    if (
      !id ||
      tempReconnectPath ||
      type === "UseCaseInclude" ||
      type === "UseCaseExtend"
    ) {
      return null
    }

    const currentIndex = edges.findIndex((edge) => edge.id === id)
    if (currentIndex <= 0) return null

    const baseSegments = getAxisAlignedSegments([sourcePoint, targetPoint])
    if (baseSegments.length === 0) return null

    for (let i = 0; i < currentIndex; i += 1) {
      const otherEdge = edges[i]
      const otherPoints = getEdgePointsForJump(otherEdge)
      if (!otherPoints || otherPoints.length < 2) continue

      const otherSegments = getAxisAlignedSegments(otherPoints)
      const hit = findLineJumpIntersection(
        baseSegments,
        otherSegments,
        EDGES.EDGE_LINE_JUMP_WIDTH,
        "horizontal"
      )

      if (hit) {
        return hit
      }
    }

    return null
  }, [
    edges,
    getEdgePointsForJump,
    id,
    sourcePoint,
    targetPoint,
    tempReconnectPath,
    type,
  ])

  const [pathMiddlePosition, setPathMiddlePosition] = useState<IPoint>(() => ({
    x:
      (adjustedSourceCoordinates.sourceX + adjustedTargetCoordinates.targetX) /
      2,
    y:
      (adjustedSourceCoordinates.sourceY + adjustedTargetCoordinates.targetY) /
      2,
  }))
  const [isMiddlePathHorizontal, setIsMiddlePathHorizontal] = useState<boolean>(
    () => {
      const dx = Math.abs(
        adjustedTargetCoordinates.targetX - adjustedSourceCoordinates.sourceX
      )
      const dy = Math.abs(
        adjustedTargetCoordinates.targetY - adjustedSourceCoordinates.sourceY
      )
      return dx > dy
    }
  )

  const currentPath = useMemo(() => {
    if (lineJump) {
      return buildPathWithLineJumpAtPoint(
        [sourcePoint, targetPoint],
        lineJump.segmentIndex,
        lineJump.point,
        EDGES.EDGE_LINE_JUMP_HEIGHT,
        EDGES.EDGE_LINE_JUMP_WIDTH
      )
    }

    return calculateStraightPath(
      adjustedSourceCoordinates.sourceX,
      adjustedSourceCoordinates.sourceY,
      adjustedTargetCoordinates.targetX,
      adjustedTargetCoordinates.targetY,
      type
    )
  }, [
    adjustedSourceCoordinates.sourceX,
    adjustedSourceCoordinates.sourceY,
    adjustedTargetCoordinates.targetX,
    adjustedTargetCoordinates.targetY,
    lineJump,
    sourcePoint,
    targetPoint,
    type,
    targetPosition,
  ])

  const overlayPath = useMemo(() => {
    if (lineJump) {
      return currentPath
    }

    return calculateOverlayPath(
      adjustedSourceCoordinates.sourceX,
      adjustedSourceCoordinates.sourceY,
      adjustedTargetCoordinates.targetX,
      adjustedTargetCoordinates.targetY,
      type
    )
  }, [
    adjustedSourceCoordinates.sourceX,
    adjustedSourceCoordinates.sourceY,
    adjustedTargetCoordinates.targetX,
    adjustedTargetCoordinates.targetY,
    currentPath,
    lineJump,
    type,
    targetPosition,
  ])

  useEffect(() => {
    if (pathRef.current) {
      try {
        const totalLength = pathRef.current.getTotalLength()
        if (totalLength === 0 || !isFinite(totalLength)) {
          const middleX =
            (adjustedSourceCoordinates.sourceX +
              adjustedTargetCoordinates.targetX) /
            2
          const middleY =
            (adjustedSourceCoordinates.sourceY +
              adjustedTargetCoordinates.targetY) /
            2
          setPathMiddlePosition({ x: middleX, y: middleY })

          const dx = Math.abs(
            adjustedTargetCoordinates.targetX -
              adjustedSourceCoordinates.sourceX
          )
          const dy = Math.abs(
            adjustedTargetCoordinates.targetY -
              adjustedSourceCoordinates.sourceY
          )
          setIsMiddlePathHorizontal(dx > dy)
          return
        }

        const halfLength = totalLength / 2
        const middlePoint = pathRef.current.getPointAtLength(halfLength)
        const pointOnCloseToMiddle = pathRef.current.getPointAtLength(
          Math.min(halfLength + 2, totalLength)
        )
        const isHorizontal =
          Math.abs(pointOnCloseToMiddle.x - middlePoint.x) >
          Math.abs(pointOnCloseToMiddle.y - middlePoint.y)

        setIsMiddlePathHorizontal(isHorizontal)
        setPathMiddlePosition({ x: middlePoint.x, y: middlePoint.y })
      } catch (error) {
        log.warn("Path calculation failed, using fallback:", error)
        const middleX = (sourceX + targetX) / 2
        const middleY = (sourceY + targetY) / 2
        setPathMiddlePosition({ x: middleX, y: middleY })

        const dx = Math.abs(targetX - sourceX)
        const dy = Math.abs(
          adjustedTargetCoordinates.targetY - adjustedSourceCoordinates.sourceY
        )
        setIsMiddlePathHorizontal(dx > dy)
      }
    }
  }, [
    currentPath,
    adjustedSourceCoordinates.sourceX,
    adjustedSourceCoordinates.sourceY,
    adjustedTargetCoordinates.targetX,
    adjustedTargetCoordinates.targetY,
  ])

  useEffect(() => {
    const middleX =
      (adjustedSourceCoordinates.sourceX + adjustedTargetCoordinates.targetX) /
      2
    const middleY =
      (adjustedSourceCoordinates.sourceY + adjustedTargetCoordinates.targetY) /
      2
    setPathMiddlePosition({ x: middleX, y: middleY })

    const dx = Math.abs(
      adjustedTargetCoordinates.targetX - adjustedSourceCoordinates.sourceX
    )
    const dy = Math.abs(
      adjustedTargetCoordinates.targetY - adjustedSourceCoordinates.sourceY
    )
    setIsMiddlePathHorizontal(dx > dy)
  }, [
    adjustedSourceCoordinates.sourceX,
    adjustedSourceCoordinates.sourceY,
    adjustedTargetCoordinates.targetX,
    adjustedTargetCoordinates.targetY,
  ])

  const handleEndpointPointerDown = useCallback(
    (e: React.PointerEvent, endType: "source" | "target") => {
      if (
        !isDiagramModifiable ||
        !enableReconnection ||
        !hasReconnectionSupport
      ) {
        return
      }

      const endpoint = endType === "source" ? sourcePoint : targetPoint
      startReconnection(e, endType, endpoint)

      const handleEndpointPointerMove = (moveEvent: PointerEvent) => {
        if (!isReconnectingRef.current) return

        const newEndpoint = screenToFlowPosition({
          x: moveEvent.clientX,
          y: moveEvent.clientY,
        })

        let newSourceX = sourceX
        let newSourceY = sourceY
        let newTargetX = targetX
        let newTargetY = targetY

        if (endType === "source") {
          newSourceX = newEndpoint.x
          newSourceY = newEndpoint.y
        } else {
          newTargetX = newEndpoint.x
          newTargetY = newEndpoint.y
        }

        const tempAdjustedTargetCoordinates = adjustTargetCoordinates(
          newTargetX,
          newTargetY,
          targetPosition,
          padding
        )

        const tempAdjustedSourceCoordinates = adjustSourceCoordinates(
          newSourceX,
          newSourceY,
          sourcePosition,
          EDGES.SOURCE_CONNECTION_POINT_PADDING
        )

        const tempPath = calculateStraightPath(
          tempAdjustedSourceCoordinates.sourceX,
          tempAdjustedSourceCoordinates.sourceY,
          tempAdjustedTargetCoordinates.targetX,
          tempAdjustedTargetCoordinates.targetY,
          type
        )

        setTempReconnectPath(tempPath)
      }

      const handleEndpointPointerUp = (upEvent: PointerEvent) => {
        setTempReconnectPath(null)

        document.removeEventListener("pointermove", handleEndpointPointerMove, {
          capture: true,
        })
        document.removeEventListener("pointerup", handleEndpointPointerUp, {
          capture: true,
        })

        completeReconnection(upEvent, findBestHandle, () => {})
      }

      document.addEventListener("pointermove", handleEndpointPointerMove, {
        capture: true,
      })
      document.addEventListener("pointerup", handleEndpointPointerUp, {
        once: true,
        capture: true,
      })
    },
    [
      isDiagramModifiable,
      enableReconnection,
      hasReconnectionSupport,
      sourcePoint,
      targetPoint,
      startReconnection,
      isReconnectingRef,
      completeReconnection,
      findBestHandle,
    ]
  )

  const edgeData: StraightPathEdgeData = {
    pathMiddlePosition,
    isMiddlePathHorizontal,
    sourcePoint,
    targetPoint,
  }

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
    isReconnectingRef,
    handleEndpointPointerDown,
    tempReconnectPath,
  }
}
