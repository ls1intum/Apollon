import { useCallback, useMemo, useEffect, useRef, useState } from "react"
import {
  getSmoothStepPath,
  Position,
  type Node,
  useReactFlow,
} from "@xyflow/react"
import { log } from "../logger"
import { EDGES } from "@/constants"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getPositionOnCanvas,
} from "@/utils"
import {
  IPoint,
  pointsToSvgPath,
  tryFindStraightPath,
} from "../edges/Connection"
import { useDiagramStore, useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import {
  getEdgeMarkerStyles,
  simplifySvgPath,
  removeDuplicatePoints,
  parseSvgPath,
  calculateInnerMidpoints,
  getMarkerSegmentPath,
  getHandleAnchor,
  preserveOrthogonalEdgePoints,
  resolveReconnectPreviewBasePoints,
} from "@/utils/edgeUtils"
import { useEdgeState, useEdgeReconnection } from "../edges/GenericEdge"
import { useDiagramModifiable } from "./useDiagramModifiable"
import { useHandleFinder } from "./useHandleFinder"

interface UseStepPathEdgeProps {
  id: string
  type: string
  source: string
  target: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  sourceHandleId?: string | null
  targetHandleId?: string | null
  data?: { points?: IPoint[] }
  allowMidpointDragging?: boolean
  enableReconnection?: boolean
  enableStraightPath?: boolean
}

export interface StepPathEdgeData {
  activePoints: IPoint[]
  pathMiddlePosition: IPoint
  isMiddlePathHorizontal: boolean
  sourcePoint: IPoint
  targetPoint: IPoint
}

const arePointsEqual = (a: IPoint[] = [], b: IPoint[] = []): boolean =>
  a.length === b.length &&
  a.every((point, index) => point.x === b[index].x && point.y === b[index].y)

export const useStepPathEdge = ({
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
  allowMidpointDragging = true,
  enableReconnection = true,
  enableStraightPath = false,
}: UseStepPathEdgeProps) => {
  const draggingIndexRef = useRef<number | null>(null)
  const dragOffsetRef = useRef<IPoint>({ x: 0, y: 0 })
  const pathRef = useRef<SVGPathElement | null>(null)
  const finalPointsRef = useRef<IPoint[]>([])
  const dragPointsRef = useRef<IPoint[]>([])
  const reconnectPreviewBasePointsRef = useRef<IPoint[]>([])

  const isDiagramModifiable = useDiagramModifiable()
  const { getNode, getNodes, screenToFlowPosition } = useReactFlow()

  const [pathMiddlePosition, setPathMiddlePosition] = useState<IPoint>({
    x: (sourceX + targetX) / 2,
    y: (sourceY + targetY) / 2,
  })
  const [isMiddlePathHorizontal, setIsMiddlePathHorizontal] =
    useState<boolean>(true)
  const [hasInitialCalculation, setHasInitialCalculation] = useState(false)

  const {
    customPoints,
    setCustomPoints,
    tempReconnectPoints,
    setTempReconnectPoints,
  } = useEdgeState(data?.points)
  const {
    isReconnectingRef,
    reconnectingEndRef,
    startReconnection,
    completeReconnection,
  } = useEdgeReconnection(id, source, target, sourceHandleId, targetHandleId)

  const { findBestHandle, findBestHandleAtClientPosition } = useHandleFinder()
  const { setConnectionGuidanceTarget } = useMetadataStore(
    useShallow((state) => ({
      setConnectionGuidanceTarget: state.setConnectionGuidanceTarget,
    }))
  )
  const { setEdges } = useDiagramStore(
    useShallow((state) => ({
      setEdges: state.setEdges,
    }))
  )

  const {
    markerPadding,
    markerEnd,
    markerStart,
    strokeDashArray,
    offset = 0,
  } = getEdgeMarkerStyles(type)
  const padding = markerPadding ?? EDGES.MARKER_PADDING
  const sourceNode = getNode(source)!
  const targetNode = getNode(target)!
  const allNodes = getNodes()

  const sourceAbsolutePosition = useMemo(() => {
    if (!sourceNode) return { x: sourceX, y: sourceY }
    return getPositionOnCanvas(sourceNode, allNodes)
  }, [sourceNode, allNodes, sourceX, sourceY])

  const targetAbsolutePosition = useMemo(() => {
    if (!targetNode) return { x: targetX, y: targetY }
    return getPositionOnCanvas(targetNode, allNodes)
  }, [targetNode, allNodes, targetX, targetY])
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
  const basePath = useMemo(() => {
    if (!enableStraightPath) {
      const [edgePath] = getSmoothStepPath({
        sourceX: adjustedSourceCoordinates.sourceX,
        sourceY: adjustedSourceCoordinates.sourceY,
        sourcePosition,
        targetX: adjustedTargetCoordinates.targetX,
        targetY: adjustedTargetCoordinates.targetY,
        targetPosition,
        borderRadius: EDGES.STEP_BORDER_RADIUS,
        offset: 30,
      })
      return edgePath
    }

    const straightPathPoints = tryFindStraightPath(
      {
        position: { x: sourceAbsolutePosition.x, y: sourceAbsolutePosition.y },
        width: sourceNode.width ?? 100,
        height: sourceNode.height ?? 160,
        direction: sourcePosition,
      },
      {
        position: { x: targetAbsolutePosition.x, y: targetAbsolutePosition.y },
        width: targetNode.width ?? 100,
        height: targetNode.height ?? 160,
        direction: targetPosition,
      },
      padding,
      {
        sourceX: roundedSourceX,
        sourceY: roundedSourceY,
        targetX: roundedTargetX,
        targetY: roundedTargetY,
      }
    )

    if (straightPathPoints !== null) {
      return pointsToSvgPath(straightPathPoints)
    } else {
      const [edgePath] = getSmoothStepPath({
        sourceX: adjustedSourceCoordinates.sourceX,
        sourceY: adjustedSourceCoordinates.sourceY,
        sourcePosition,
        targetX: adjustedTargetCoordinates.targetX,
        targetY: adjustedTargetCoordinates.targetY,
        targetPosition,
        borderRadius: EDGES.STEP_BORDER_RADIUS,
        offset: 30,
      })
      return edgePath
    }
  }, [
    enableStraightPath,
    sourceAbsolutePosition,
    targetAbsolutePosition,
    sourceNode,
    targetNode,
    sourcePosition,
    targetPosition,
    roundedSourceX,
    roundedSourceY,
    roundedTargetX,
    roundedTargetY,
    adjustedSourceCoordinates.sourceX,
    adjustedSourceCoordinates.sourceY,
    adjustedTargetCoordinates.targetX,
    adjustedTargetCoordinates.targetY,
    padding,
  ])

  const computedPoints = useMemo(() => {
    const simplifiedPath = simplifySvgPath(basePath)
    const parsed = parseSvgPath(simplifiedPath)
    const result = removeDuplicatePoints(parsed)
    return result
  }, [basePath])

  const hasManualPoints =
    (data?.points && data.points.length > 0) || customPoints.length > 0

  const activePoints = useMemo(() => {
    let points: IPoint[]
    if (tempReconnectPoints) {
      return tempReconnectPoints
    } else if (data?.points && data.points.length > 0) {
      points = data.points
    } else {
      points = customPoints.length ? customPoints : computedPoints
    }

    if (hasManualPoints && points.length >= 2) {
      return preserveOrthogonalEdgePoints(
        points,
        {
          x: adjustedSourceCoordinates.sourceX,
          y: adjustedSourceCoordinates.sourceY,
        },
        {
          x: adjustedTargetCoordinates.targetX,
          y: adjustedTargetCoordinates.targetY,
        },
        sourcePosition,
        targetPosition
      )
    }

    return points
  }, [
    customPoints,
    computedPoints,
    tempReconnectPoints,
    data?.points,
    hasManualPoints,
    adjustedSourceCoordinates.sourceX,
    adjustedSourceCoordinates.sourceY,
    adjustedTargetCoordinates.targetX,
    adjustedTargetCoordinates.targetY,
    sourcePosition,
    targetPosition,
  ])

  useEffect(() => {
    if (!hasManualPoints || tempReconnectPoints) return

    const storedPoints =
      data?.points && data.points.length > 0 ? data.points : customPoints

    if (arePointsEqual(storedPoints, activePoints)) return

    setCustomPoints(activePoints)
    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id
          ? {
              ...edge,
              data: { ...edge.data, points: activePoints },
            }
          : edge
      )
    )
  }, [
    activePoints,
    customPoints,
    data?.points,
    hasManualPoints,
    id,
    setCustomPoints,
    setEdges,
    tempReconnectPoints,
  ])

  const currentPath = useMemo(() => {
    return pointsToSvgPath(activePoints)
  }, [activePoints])

  const markerSegmentPath = useMemo(
    () => getMarkerSegmentPath(activePoints, offset, targetPosition),
    [activePoints, offset, targetPosition]
  )

  const overlayPath = useMemo(() => {
    return `${currentPath} ${markerSegmentPath}`
  }, [currentPath, markerSegmentPath])

  const midpoints = useMemo(() => {
    if (!allowMidpointDragging || activePoints.length < 3) return []
    return calculateInnerMidpoints(activePoints)
  }, [activePoints, allowMidpointDragging])

  useEffect(() => {
    if (pathRef.current && currentPath) {
      const calculateMiddlePoint = () => {
        if (!pathRef.current) return

        try {
          const totalLength = pathRef.current.getTotalLength()

          if (totalLength > 0) {
            const halfLength = totalLength / 2
            const middlePoint = pathRef.current.getPointAtLength(halfLength)
            const pointOnCloseToMiddle = pathRef.current.getPointAtLength(
              halfLength + 2
            )

            const isHorizontal =
              Math.abs(pointOnCloseToMiddle.x - middlePoint.x) >
              Math.abs(pointOnCloseToMiddle.y - middlePoint.y)

            setIsMiddlePathHorizontal(isHorizontal)
            setPathMiddlePosition({ x: middlePoint.x, y: middlePoint.y })

            if (!hasInitialCalculation) {
              setHasInitialCalculation(true)
            }
          }
        } catch (error) {
          log.warn("Path calculation error:", error)
          setPathMiddlePosition({
            x: (sourceX + targetX) / 2,
            y: (sourceY + targetY) / 2,
          })
        }
      }
      const timeoutId = setTimeout(calculateMiddlePoint, 0)

      return () => clearTimeout(timeoutId)
    }
  }, [currentPath, sourceX, sourceY, targetX, targetY, hasInitialCalculation])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent, index: number) => {
      if (!allowMidpointDragging) return

      // Store initial state
      const currentMidpoint = midpoints[index]
      draggingIndexRef.current = index
      dragOffsetRef.current = {
        x: event.clientX - currentMidpoint.x,
        y: event.clientY - currentMidpoint.y,
      }
      dragPointsRef.current = [...activePoints]

      // Get DOM elements for direct manipulation (like React Flow does for nodes)
      const circleEl = event.target as SVGCircleElement
      const container = circleEl.closest(".edge-container")
      const mainPath = container?.querySelector(
        ".react-flow__edge-path"
      ) as SVGPathElement | null
      const overlayPath = container?.querySelector(
        ".edge-overlay"
      ) as SVGPathElement | null

      const handlePointerMove = (e: PointerEvent) => {
        if (draggingIndexRef.current === null) return

        const idx = draggingIndexRef.current
        const newX = e.clientX - dragOffsetRef.current.x
        const newY = e.clientY - dragOffsetRef.current.y

        // Determine if this segment is horizontal or vertical
        const pts = dragPointsRef.current
        const isVertical = Math.abs(pts[idx + 1].x - pts[idx + 2].x) < 1

        // Update the two points that define this segment
        const newPoints = [...pts]
        if (isVertical) {
          newPoints[idx + 1] = { x: newX, y: pts[idx + 1].y }
          newPoints[idx + 2] = { x: newX, y: pts[idx + 2].y }
        } else {
          newPoints[idx + 1] = { x: pts[idx + 1].x, y: newY }
          newPoints[idx + 2] = { x: pts[idx + 2].x, y: newY }
        }
        dragPointsRef.current = newPoints
        finalPointsRef.current = newPoints

        // Direct DOM updates for instant feedback
        const pathD = pointsToSvgPath(newPoints)
        mainPath?.setAttribute("d", pathD)
        overlayPath?.setAttribute(
          "d",
          `${pathD} ${getMarkerSegmentPath(newPoints, offset, targetPosition)}`
        )

        // Update circle position
        const mids = calculateInnerMidpoints(newPoints)
        if (mids[idx]) {
          circleEl.setAttribute("cx", String(mids[idx].x))
          circleEl.setAttribute("cy", String(mids[idx].y))
        }
      }

      const handlePointerUp = () => {
        // Sync to React state only on release
        setCustomPoints(finalPointsRef.current)
        setEdges((eds) =>
          eds.map((e) =>
            e.id === id
              ? { ...e, data: { ...e.data, points: finalPointsRef.current } }
              : e
          )
        )
        draggingIndexRef.current = null
        document.removeEventListener("pointermove", handlePointerMove)
        document.removeEventListener("pointerup", handlePointerUp)
      }

      document.addEventListener("pointermove", handlePointerMove)
      document.addEventListener("pointerup", handlePointerUp, { once: true })
    },
    [
      midpoints,
      activePoints,
      id,
      setEdges,
      allowMidpointDragging,
      setCustomPoints,
      offset,
      targetPosition,
    ]
  )

  const handleEndpointPointerDown = useCallback(
    (e: React.PointerEvent, endType: "source" | "target") => {
      if (!isDiagramModifiable || !enableReconnection) return

      const endpoint =
        endType === "source"
          ? activePoints[0]
          : activePoints[activePoints.length - 1]

      reconnectPreviewBasePointsRef.current = resolveReconnectPreviewBasePoints(
        data?.points,
        customPoints,
        activePoints
      )
      startReconnection(e, endType, endpoint)

      const resolvePreviewHandle = (
        node: Node | null,
        handle: string | null
      ): {
        point: IPoint
        position: Position
        nodePosition: IPoint
        node: Node
      } | null => {
        if (!node || !handle || node.width == null || node.height == null) {
          return null
        }

        const nodePosition = getPositionOnCanvas(node, getNodes())
        const anchor = getHandleAnchor(
          {
            x: nodePosition.x,
            y: nodePosition.y,
            width: node.width,
            height: node.height,
          },
          handle
        )

        if (!anchor) return null

        return {
          point: { x: anchor.x, y: anchor.y },
          position: anchor.side,
          nodePosition,
          node,
        }
      }

      const handleEndpointPointerMove = (moveEvent: PointerEvent) => {
        if (!isReconnectingRef.current) return

        const newEndpoint = screenToFlowPosition({
          x: moveEvent.clientX,
          y: moveEvent.clientY,
        })
        const {
          handle: previewHandle,
          node: previewNode,
          shouldClearPoints: shouldClearGuidanceTarget,
        } = findBestHandleAtClientPosition(moveEvent.clientX, moveEvent.clientY)

        if (shouldClearGuidanceTarget || !previewNode || !previewHandle) {
          setConnectionGuidanceTarget(null, null)
        } else {
          setConnectionGuidanceTarget(previewNode.id, previewHandle)
        }

        const previewEndpoint = resolvePreviewHandle(previewNode, previewHandle)
        let newSourceX = sourceX
        let newSourceY = sourceY
        let newTargetX = targetX
        let newTargetY = targetY
        let previewSourcePosition = sourcePosition
        let previewTargetPosition = targetPosition
        let previewSourceAbsolute = sourceAbsolutePosition
        let previewTargetAbsolute = targetAbsolutePosition
        let previewSourceNode = sourceNode
        let previewTargetNode = targetNode

        if (reconnectingEndRef.current === "source") {
          newSourceX = previewEndpoint?.point.x ?? newEndpoint.x
          newSourceY = previewEndpoint?.point.y ?? newEndpoint.y
          previewSourcePosition = previewEndpoint?.position ?? sourcePosition
          previewSourceAbsolute = previewEndpoint?.nodePosition ?? newEndpoint
          previewSourceNode = previewEndpoint?.node ?? sourceNode
        } else {
          newTargetX = previewEndpoint?.point.x ?? newEndpoint.x
          newTargetY = previewEndpoint?.point.y ?? newEndpoint.y
          previewTargetPosition = previewEndpoint?.position ?? targetPosition
          previewTargetAbsolute = previewEndpoint?.nodePosition ?? newEndpoint
          previewTargetNode = previewEndpoint?.node ?? targetNode
        }
        const isActivityDiagram = type.startsWith("Activity")

        let newPoints: IPoint[] = []
        const adjustedTargetCoordinates = adjustTargetCoordinates(
          newTargetX,
          newTargetY,
          previewTargetPosition,
          padding
        )
        const adjustedSourceCoordinates = adjustSourceCoordinates(
          newSourceX,
          newSourceY,
          previewSourcePosition,
          EDGES.SOURCE_CONNECTION_POINT_PADDING
        )

        const previewBasePoints =
          reconnectPreviewBasePointsRef.current.length > 0
            ? reconnectPreviewBasePointsRef.current
            : resolveReconnectPreviewBasePoints(
                data?.points,
                customPoints,
                activePoints
              )

        if (hasManualPoints && previewBasePoints.length >= 2) {
          newPoints = preserveOrthogonalEdgePoints(
            previewBasePoints,
            {
              x: adjustedSourceCoordinates.sourceX,
              y: adjustedSourceCoordinates.sourceY,
            },
            {
              x: adjustedTargetCoordinates.targetX,
              y: adjustedTargetCoordinates.targetY,
            },
            previewSourcePosition,
            previewTargetPosition
          )
        } else if (isActivityDiagram || !enableStraightPath) {
          const [edgePath] = getSmoothStepPath({
            sourceX: adjustedSourceCoordinates.sourceX,
            sourceY: adjustedSourceCoordinates.sourceY,
            sourcePosition: previewSourcePosition,
            targetX: adjustedTargetCoordinates.targetX,
            targetY: adjustedTargetCoordinates.targetY,
            targetPosition: previewTargetPosition,
            borderRadius: EDGES.STEP_BORDER_RADIUS,
            offset: 30,
          })

          const simplifiedPath = simplifySvgPath(edgePath)
          newPoints = removeDuplicatePoints(parseSvgPath(simplifiedPath))
        } else {
          const straightPathPoints = tryFindStraightPath(
            {
              position: {
                x: previewSourceAbsolute.x,
                y: previewSourceAbsolute.y,
              },
              width: previewSourceNode.width ?? 100,
              height: previewSourceNode.height ?? 160,
              direction: previewSourcePosition,
            },
            {
              position: {
                x: previewTargetAbsolute.x,
                y: previewTargetAbsolute.y,
              },
              width: previewTargetNode.width ?? 100,
              height: previewTargetNode.height ?? 160,
              direction: previewTargetPosition,
            },
            padding,
            {
              sourceX: Math.round(newSourceX),
              sourceY: Math.round(newSourceY),
              targetX: Math.round(newTargetX),
              targetY: Math.round(newTargetY),
            }
          )

          if (straightPathPoints !== null) {
            newPoints = straightPathPoints
          } else {
            const [edgePath] = getSmoothStepPath({
              sourceX: adjustedSourceCoordinates.sourceX,
              sourceY: adjustedSourceCoordinates.sourceY,
              sourcePosition: previewSourcePosition,
              targetX: adjustedTargetCoordinates.targetX,
              targetY: adjustedTargetCoordinates.targetY,
              targetPosition: previewTargetPosition,
              borderRadius: EDGES.STEP_BORDER_RADIUS,
              offset: 30,
            })
            const simplifiedPath = simplifySvgPath(edgePath)
            newPoints = removeDuplicatePoints(parseSvgPath(simplifiedPath))
          }
        }

        setTempReconnectPoints(newPoints)
      }

      const handleEndpointPointerUp = (upEvent: PointerEvent) => {
        reconnectPreviewBasePointsRef.current = []
        setTempReconnectPoints(null)
        setConnectionGuidanceTarget(null, null)
        document.removeEventListener("pointermove", handleEndpointPointerMove, {
          capture: true,
        })
        document.removeEventListener("pointerup", handleEndpointPointerUp, {
          capture: true,
        })

        completeReconnection(upEvent, findBestHandle)
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
      activePoints,
      startReconnection,
      isReconnectingRef,
      screenToFlowPosition,
      reconnectingEndRef,
      setTempReconnectPoints,
      completeReconnection,
      getNodes,
      hasManualPoints,
      customPoints,
      data?.points,
      enableStraightPath,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      type,
      padding,
      sourceAbsolutePosition,
      targetAbsolutePosition,
      sourceNode,
      targetNode,
      findBestHandle,
      findBestHandleAtClientPosition,
      setConnectionGuidanceTarget,
    ]
  )

  const sourcePoint = activePoints[0] || { x: sourceX, y: sourceY }
  const targetPoint = activePoints[activePoints.length - 1] || {
    x: targetX,
    y: targetY,
  }

  const edgeData: StepPathEdgeData = {
    activePoints,
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
    midpoints,
    hasInitialCalculation,
    isReconnectingRef,
    markerEnd,
    markerStart,
    strokeDashArray,
    handlePointerDown,
    handleEndpointPointerDown,
    sourcePoint,
    targetPoint,
    isDiagramModifiable,
  }
}
