import { useCallback, useMemo, useEffect, useRef, useState } from "react"
import {
  getSmoothStepPath,
  Position,
  useStore,
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
  getMarkerSegmentPath,
  preserveOrthogonalEdgePoints,
  normalizeOrthogonalEdgePoints,
  resolveOrthogonalEdgeReleasePoints,
  isInvalidOrthogonalEdgeRelease,
} from "@/utils/edgeUtils"
import {
  type BendHandle,
  applyInnerSegmentBend,
  applyTerminalSegmentBend,
  getBendableSegments,
  computeToolbarPosition,
  isLengthEditableAtZoom,
} from "@/utils/geometry/bendHandles"
import { useEdgeState } from "../edges/GenericEdge"
import { useDiagramModifiable } from "./useDiagramModifiable"

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
  enableStraightPath?: boolean
}

export interface StepPathEdgeData {
  activePoints: IPoint[]
  pathMiddlePosition: IPoint
  toolbarPosition: IPoint
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
  data,
  allowMidpointDragging = true,
  enableStraightPath = false,
}: UseStepPathEdgeProps) => {
  const draggingHandleRef = useRef<BendHandle | null>(null)
  const dragOffsetRef = useRef<IPoint>({ x: 0, y: 0 })
  const pathRef = useRef<SVGPathElement | null>(null)
  const finalPointsRef = useRef<IPoint[]>([])
  const dragPointsRef = useRef<IPoint[]>([])
  // The furthest geometry the in-progress drag reached that is still valid.
  // If the user drags past a limit (e.g. a terminal stub would collapse), the
  // release falls back to THIS — clamping at the last good position — instead
  // of snapping all the way back to the pre-drag shape.
  const lastValidDragRef = useRef<IPoint[]>([])

  const isDiagramModifiable = useDiagramModifiable()
  const zoom = useStore((state) => state.transform[2])
  const isReconnecting = useMetadataStore(
    (state) => state.reconnectPreviewEdgeId === id
  )
  const { getNode, getNodes, screenToFlowPosition } = useReactFlow()

  const [pathMiddlePosition, setPathMiddlePosition] = useState<IPoint>({
    x: (sourceX + targetX) / 2,
    y: (sourceY + targetY) / 2,
  })
  const [isMiddlePathHorizontal, setIsMiddlePathHorizontal] =
    useState<boolean>(true)
  const [hasInitialCalculation, setHasInitialCalculation] = useState(false)
  const [draggingHandle, setDraggingHandle] = useState<BendHandle | null>(null)

  const { customPoints, setCustomPoints } = useEdgeState(data?.points)
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
    if (data?.points && data.points.length > 0) {
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
    if (!hasManualPoints) return

    const storedPoints =
      data?.points && data.points.length > 0 ? data.points : customPoints

    const pointsToStore = normalizeOrthogonalEdgePoints(
      activePoints,
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

    if (arePointsEqual(storedPoints, pointsToStore)) return

    setCustomPoints(pointsToStore)
    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id
          ? {
              ...edge,
              data: { ...edge.data, points: pointsToStore },
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
    adjustedSourceCoordinates.sourceX,
    adjustedSourceCoordinates.sourceY,
    adjustedTargetCoordinates.targetX,
    adjustedTargetCoordinates.targetY,
    sourcePosition,
    targetPosition,
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

  const bendHandles = useMemo(() => {
    if (!allowMidpointDragging) return []
    // A segment needs room for the handle (which grows with zoom past 1x) plus
    // corner clearance on both sides. Using the handle's actual on-screen size
    // keeps a grown handle from overflowing a short segment when zoomed in.
    const handleScreenLength =
      EDGES.BEND_HANDLE_SCREEN_LENGTH_PX * Math.max(1, zoom)
    const minSegmentScreenLength =
      handleScreenLength + 2 * EDGES.BEND_HANDLE_CORNER_CLEARANCE_PX
    return getBendableSegments(
      activePoints,
      sourcePosition,
      targetPosition,
      EDGES.BEND_HANDLE_SAFE_AREA_PX,
      minSegmentScreenLength,
      zoom
    )
  }, [
    activePoints,
    allowMidpointDragging,
    sourcePosition,
    targetPosition,
    zoom,
  ])

  const canEditEndpoint = useMemo(() => {
    // Never strand an edge: if it is too short to offer a bend handle, the
    // endpoints must stay draggable so the user can always reshape it by
    // reconnecting. (Avoids the "no handle, weird workaround" dead state.)
    if (bendHandles.length === 0) return true

    const canvasLength = activePoints.reduce((length, point, index) => {
      if (index === 0) return length
      const previous = activePoints[index - 1]
      return (
        length + Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y)
      )
    }, 0)

    return isLengthEditableAtZoom(canvasLength, EDGES.BEND_MIN_LENGTH, zoom)
  }, [activePoints, zoom, bendHandles.length])

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
    (event: React.PointerEvent, handle: BendHandle) => {
      if (!allowMidpointDragging) return

      // Store initial state
      draggingHandleRef.current = handle
      setDraggingHandle(handle)

      const initialFlowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      dragOffsetRef.current = {
        x: initialFlowPos.x - handle.position.x,
        y: initialFlowPos.y - handle.position.y,
      }
      // Canonicalise the drag baseline's endpoints to the adjusted source/target
      // anchors. A computed (unedited) path ends on the raw node edges, but the
      // release validation re-pins endpoints to the adjusted anchors — the small
      // padding delta would otherwise shrink a terminal stub below STUB_LENGTH
      // and get the very first bend rejected back to a straight line.
      const dragBaseline = [...activePoints]
      if (dragBaseline.length >= 2) {
        dragBaseline[0] = {
          x: adjustedSourceCoordinates.sourceX,
          y: adjustedSourceCoordinates.sourceY,
        }
        dragBaseline[dragBaseline.length - 1] = {
          x: adjustedTargetCoordinates.targetX,
          y: adjustedTargetCoordinates.targetY,
        }
      }
      dragPointsRef.current = dragBaseline
      finalPointsRef.current = [...dragBaseline]
      lastValidDragRef.current = [...dragBaseline]
      const dragSourcePoint = {
        x: adjustedSourceCoordinates.sourceX,
        y: adjustedSourceCoordinates.sourceY,
      }
      const dragTargetPoint = {
        x: adjustedTargetCoordinates.targetX,
        y: adjustedTargetCoordinates.targetY,
      }

      // Get DOM elements for direct manipulation (like React Flow does for nodes)
      const handleEl = event.target as SVGRectElement
      const container = handleEl.closest(".edge-container")
      const mainPath = container?.querySelector(
        ".react-flow__edge-path"
      ) as SVGPathElement | null
      const overlayPath = container?.querySelector(
        ".edge-overlay"
      ) as SVGPathElement | null

      const originalMainPathD = mainPath?.getAttribute("d")
      const originalOverlayPathD = overlayPath?.getAttribute("d")
      const originalHandleX = handleEl.getAttribute("x")
      const originalHandleY = handleEl.getAttribute("y")
      const handleWidth = Number(handleEl.getAttribute("width") ?? 0)
      const handleHeight = Number(handleEl.getAttribute("height") ?? 0)

      const handlePointerMove = (e: PointerEvent) => {
        const activeHandle = draggingHandleRef.current
        if (!activeHandle) return

        const flowPos = screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        })

        const rawX = flowPos.x - dragOffsetRef.current.x
        const rawY = flowPos.y - dragOffsetRef.current.y

        const grid = EDGES.BEND_SNAP_GRID_PX
        const snappedX = Math.round(rawX / grid) * grid
        const snappedY = Math.round(rawY / grid) * grid

        const delta: IPoint =
          activeHandle.orientation === "H"
            ? { x: 0, y: snappedY - activeHandle.position.y }
            : { x: snappedX - activeHandle.position.x, y: 0 }

        const basePoints = dragPointsRef.current
        const newPoints =
          activeHandle.kind === "inner"
            ? applyInnerSegmentBend(
                basePoints,
                activeHandle.segmentIndex,
                delta,
                EDGES.BEND_SNAP_GRID_PX
              )
            : applyTerminalSegmentBend(
                basePoints,
                activeHandle,
                delta,
                sourcePosition,
                targetPosition,
                EDGES.STUB_LENGTH,
                EDGES.BEND_SNAP_GRID_PX
              )
        finalPointsRef.current = newPoints
        // Remember the furthest still-valid geometry so a release past a limit
        // clamps here instead of snapping back to the pre-drag shape.
        if (
          !isInvalidOrthogonalEdgeRelease(
            newPoints,
            dragSourcePoint,
            dragTargetPoint,
            sourcePosition,
            targetPosition
          )
        ) {
          lastValidDragRef.current = newPoints
        }

        const pathD = pointsToSvgPath(newPoints)
        mainPath?.setAttribute("d", pathD)
        overlayPath?.setAttribute(
          "d",
          `${pathD} ${getMarkerSegmentPath(newPoints, offset, targetPosition)}`
        )

        const nextHandlePosition = {
          x: activeHandle.position.x + delta.x,
          y: activeHandle.position.y + delta.y,
        }
        handleEl.setAttribute(
          "x",
          String(nextHandlePosition.x - handleWidth / 2)
        )
        handleEl.setAttribute(
          "y",
          String(nextHandlePosition.y - handleHeight / 2)
        )
      }

      const handlePointerUp = () => {
        if (mainPath && originalMainPathD)
          mainPath.setAttribute("d", originalMainPathD)
        if (overlayPath && originalOverlayPathD)
          overlayPath.setAttribute("d", originalOverlayPathD)
        if (originalHandleX) handleEl.setAttribute("x", originalHandleX)
        if (originalHandleY) handleEl.setAttribute("y", originalHandleY)

        // A press that never moved the path (a select-click on the handle, or a
        // first gesture React Flow consumed for selection) must NOT persist
        // anything: committing here would freeze the computed path into manual
        // points — for a straight edge that reads as the bend "snapping back".
        // Only commit when the released geometry actually differs.
        const pathChanged = !arePointsEqual(
          finalPointsRef.current,
          dragPointsRef.current
        )

        if (pathChanged) {
          const sourcePoint = {
            x: adjustedSourceCoordinates.sourceX,
            y: adjustedSourceCoordinates.sourceY,
          }
          const targetPoint = {
            x: adjustedTargetCoordinates.targetX,
            y: adjustedTargetCoordinates.targetY,
          }
          const normalizedPoints = resolveOrthogonalEdgeReleasePoints(
            finalPointsRef.current,
            lastValidDragRef.current,
            sourcePoint,
            targetPoint,
            sourcePosition,
            targetPosition
          )

          setCustomPoints(normalizedPoints)
          setEdges((eds) =>
            eds.map((e) =>
              e.id === id
                ? { ...e, data: { ...e.data, points: normalizedPoints } }
                : e
            )
          )
        }
        draggingHandleRef.current = null
        setDraggingHandle(null)
        document.removeEventListener("pointermove", handlePointerMove)
        document.removeEventListener("pointerup", handlePointerUp)
      }

      document.addEventListener("pointermove", handlePointerMove)
      document.addEventListener("pointerup", handlePointerUp, { once: true })
    },
    [
      activePoints,
      id,
      setEdges,
      allowMidpointDragging,
      setCustomPoints,
      offset,
      targetPosition,
      sourcePosition,
      adjustedSourceCoordinates.sourceX,
      adjustedSourceCoordinates.sourceY,
      adjustedTargetCoordinates.targetX,
      adjustedTargetCoordinates.targetY,
    ]
  )

  const sourcePoint = activePoints[0] || { x: sourceX, y: sourceY }
  const targetPoint = activePoints[activePoints.length - 1] || {
    x: targetX,
    y: targetY,
  }

  const toolbarPosition = computeToolbarPosition(
    pathMiddlePosition,
    isMiddlePathHorizontal
  )

  const edgeData: StepPathEdgeData = {
    activePoints,
    pathMiddlePosition,
    toolbarPosition,
    isMiddlePathHorizontal,
    sourcePoint,
    targetPoint,
  }

  return {
    pathRef,
    edgeData,
    currentPath,
    overlayPath,
    bendHandles,
    isBendDragging: draggingHandle !== null,
    draggingHandleSegmentIndex: draggingHandle?.segmentIndex ?? null,
    hasInitialCalculation,
    isReconnecting,
    markerEnd,
    markerStart,
    strokeDashArray,
    handlePointerDown,
    sourcePoint,
    targetPoint,
    toolbarPosition,
    isDiagramModifiable,
    canEditEndpoint,
  }
}
