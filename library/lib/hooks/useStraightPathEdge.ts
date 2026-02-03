import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useReactFlow } from "@xyflow/react"
import { log } from "../logger"
import {
  calculateOverlayPath,
  calculateStraightPath,
  getEdgeMarkerStyles,
  adjustSourceCoordinates,
  adjustTargetCoordinates,
} from "@/utils/edgeUtils"
import { EDGES } from "@/constants"
import { useDiagramModifiable } from "./useDiagramModifiable"
import { IPoint } from "../edges/Connection"
import { useEdgeReconnection, BaseEdgeProps } from "../edges/GenericEdge"
import { useHandleFinder } from "./useHandleFinder"

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
  const { screenToFlowPosition } = useReactFlow()
  const [tempReconnectPath, setTempReconnectPath] = useState<string | null>(
    null
  )

  const hasReconnectionSupport = id && source && target && enableReconnection

  const { isReconnectingRef, startReconnection, completeReconnection } =
    hasReconnectionSupport
      ? useEdgeReconnection(id, source, target, sourceHandleId, targetHandleId)
      : {
          isReconnectingRef: { current: false },
          startReconnection: () => {},
          completeReconnection: () => {},
        }

  const { findBestHandle } = hasReconnectionSupport
    ? useHandleFinder()
    : {
        findBestHandle: () => ({
          handle: null,
          node: null,
          shouldClearPoints: false,
        }),
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
    type,
    targetPosition,
  ])

  const overlayPath = useMemo(() => {
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

  const sourcePoint = {
    x: adjustedSourceCoordinates.sourceX,
    y: adjustedSourceCoordinates.sourceY,
  }
  const targetPoint = {
    x: adjustedTargetCoordinates.targetX,
    y: adjustedTargetCoordinates.targetY,
  }

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
