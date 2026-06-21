import { useCallback, useMemo, useEffect, useRef, useState } from "react"
import {
  getSmoothStepPath,
  Position,
  useStore,
  useReactFlow,
} from "@xyflow/react"
import { EDGES } from "@/constants"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getPositionOnCanvas,
  isParentNodeType,
} from "@/utils"
import {
  IPoint,
  pointsToSvgPath,
  tryFindStraightPath,
} from "../edges/Connection"
import {
  useDiagramStore,
  useMetadataStore,
  useEdgeGeometryStore,
} from "@/store/context"
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
import {
  getMidSegment,
  collectNeighborPolylines,
  type Rect,
} from "@/utils/geometry/edgeLabelLayout"
import { useEdgeState } from "../edges/GenericEdge"
import { useDiagramModifiable } from "./useDiagramModifiable"
import {
  useEdgeLineJumps,
  usePublishEdgeGeometry,
  buildEdgePath,
} from "./useEdgeLineJumps"

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
  /** Bounds (flow space) of every node the edge routes near, so label placement
   * keeps the label off any node's body, not just the source/target. */
  nodeRects: Rect[]
  /** Mid-segment endpoints in source->target order — the LOCAL flow direction
   * at the middle (used for communication-message arrow direction). */
  midSegmentStart: IPoint
  midSegmentEnd: IPoint
  /** Nearby other-edge polylines, so a middle label can break a side tie toward
   * where fewer edges cross. */
  neighborGeometry: IPoint[][]
}

const arePointsEqual = (a: IPoint[], b: IPoint[]): boolean =>
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

  const [draggingHandle, setDraggingHandle] = useState<BendHandle | null>(null)
  // While a bend handle is being dragged we render from this live geometry
  // instead of the committed `activePoints`. Driving the drag through state
  // (rather than mutating the SVG `d` directly) keeps the path AND everything
  // derived from it — the bend handle, the toolbar, edge labels, and per-type
  // decorators like the SFC transition bar — in sync on every move, so they
  // follow the drag in real time instead of jumping only on release.
  const [dragPreviewPoints, setDragPreviewPoints] = useState<IPoint[] | null>(
    null
  )

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

  // Geometry to render: the in-progress drag preview when dragging, otherwise
  // the committed points. Only `renderPoints` drives the visible path and its
  // decorations; the persistence effect above stays keyed on `activePoints`
  // so a live preview never leaks into the store mid-drag.
  const renderPoints = dragPreviewPoints ?? activePoints

  // Bridge over edges this one crosses. Computed from `renderPoints` so the
  // arcs follow a live bend drag frame-by-frame (during a bend only THIS edge's
  // points change, so only its own scan re-runs — cheap). Suppressed only while
  // reconnecting, where the preview is drawn separately by ReconnectConnectionLine.
  // Publish this edge's real geometry so other edges bridge over it accurately;
  // read others' geometry to bridge over them.
  usePublishEdgeGeometry(id, renderPoints)
  const lineJumps = useEdgeLineJumps(id, renderPoints, !isReconnecting)

  const currentPath = useMemo(
    () => buildEdgePath(renderPoints, lineJumps),
    [renderPoints, lineJumps]
  )

  const markerSegmentPath = useMemo(
    () => getMarkerSegmentPath(renderPoints, offset, targetPosition),
    [renderPoints, offset, targetPosition]
  )

  const overlayPath = useMemo(() => {
    return `${currentPath} ${markerSegmentPath}`
  }, [currentPath, markerSegmentPath])

  // A segment needs room for the handle (which grows with zoom past 1x) plus
  // corner clearance on both sides. Using the handle's actual on-screen size
  // keeps a grown handle from overflowing a short segment when zoomed in.
  const minSegmentScreenLength =
    EDGES.BEND_HANDLE_SCREEN_LENGTH_PX * Math.max(1, zoom) +
    2 * EDGES.BEND_HANDLE_CORNER_CLEARANCE_PX

  const bendHandles = useMemo(() => {
    if (!allowMidpointDragging) return []
    return getBendableSegments(
      renderPoints,
      sourcePosition,
      targetPosition,
      EDGES.BEND_HANDLE_SAFE_AREA_PX,
      minSegmentScreenLength,
      zoom
    )
  }, [
    renderPoints,
    allowMidpointDragging,
    sourcePosition,
    targetPosition,
    minSegmentScreenLength,
    zoom,
  ])

  const canEditEndpoint = useMemo(() => {
    // Decided from the COMMITTED points, never the live drag preview, so an
    // endpoint's editability can't flicker mid-bend (the preview can transiently
    // drop below the handle threshold).
    // Never strand an edge: if it is too short to offer a bend handle, the
    // endpoints must stay draggable so the user can always reshape it by
    // reconnecting. (Avoids the "no handle, weird workaround" dead state.)
    const committedBendableCount = allowMidpointDragging
      ? getBendableSegments(
          activePoints,
          sourcePosition,
          targetPosition,
          EDGES.BEND_HANDLE_SAFE_AREA_PX,
          minSegmentScreenLength,
          zoom
        ).length
      : 0
    if (committedBendableCount === 0) return true

    const canvasLength = activePoints.reduce((length, point, index) => {
      if (index === 0) return length
      const previous = activePoints[index - 1]
      return (
        length + Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y)
      )
    }, 0)

    return isLengthEditableAtZoom(canvasLength, EDGES.BEND_MIN_LENGTH, zoom)
  }, [
    activePoints,
    allowMidpointDragging,
    sourcePosition,
    targetPosition,
    minSegmentScreenLength,
    zoom,
  ])

  // The mid-segment midpoint + orientation, derived synchronously and purely
  // from the polyline (no DOM measurement). This replaces a racy
  // getPointAtLength + setTimeout(0) effect that lagged a frame, could lock to
  // an off-edge/misclassified value (#634/#129), and never resolved in headless
  // export — so exported labels fell back to the straight-line guess. Computed
  // from renderPoints (pre line-jump bridges) it is also frame-stable and
  // identical interactively and in export.
  const midSegment = useMemo(
    () =>
      getMidSegment(
        renderPoints,
        renderPoints[0] ?? { x: sourceX, y: sourceY },
        renderPoints[renderPoints.length - 1] ?? { x: targetX, y: targetY }
      ),
    [renderPoints, sourceX, sourceY, targetX, targetY]
  )
  const pathMiddlePosition = midSegment.point
  const isMiddlePathHorizontal = midSegment.isHorizontal

  // Obstacle geometry for label placement, collected over the WHOLE edge (not
  // just the arc-midpoint) since the label may sit on any arm.
  const edgeBounds = useMemo(() => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const pt of renderPoints) {
      if (pt.x < minX) minX = pt.x
      if (pt.x > maxX) maxX = pt.x
      if (pt.y < minY) minY = pt.y
      if (pt.y > maxY) maxY = pt.y
    }
    return { minX, minY, maxX, maxY }
  }, [renderPoints])

  // How far (flow px) a label can reach from an arm: a wide label plus the gap.
  const LABEL_REACH = 220

  // Other edges near the edge, so a label on any arm can avoid crossing them.
  const geometryById = useEdgeGeometryStore((state) => state.geometryById)
  const neighborGeometry = useMemo(() => {
    const center = {
      x: (edgeBounds.minX + edgeBounds.maxX) / 2,
      y: (edgeBounds.minY + edgeBounds.maxY) / 2,
    }
    const radius =
      Math.max(
        edgeBounds.maxX - edgeBounds.minX,
        edgeBounds.maxY - edgeBounds.minY
      ) /
        2 +
      LABEL_REACH
    return collectNeighborPolylines(geometryById, id, center, radius)
  }, [geometryById, id, edgeBounds])

  // EVERY node the edge routes near (not only source/target), so the label
  // never lands on an unrelated node's body.
  const nearbyNodeRects = useMemo<Rect[]>(() => {
    const q = {
      x: edgeBounds.minX - LABEL_REACH,
      y: edgeBounds.minY - LABEL_REACH,
      r: edgeBounds.maxX + LABEL_REACH,
      b: edgeBounds.maxY + LABEL_REACH,
    }
    const rects: Rect[] = []
    for (const node of allNodes) {
      const w = node.width ?? 0
      const h = node.height ?? 0
      if (!w || !h) continue
      // Container nodes (pools, lanes, subprocesses, packages, …) are
      // backgrounds that labels and edges legitimately overlay — never treat
      // them as obstacles, or a label inside a pool can never be placed.
      if (isParentNodeType(node.type)) continue
      const pos = getPositionOnCanvas(node, allNodes)
      if (pos.x < q.r && pos.x + w > q.x && pos.y < q.b && pos.y + h > q.y) {
        rects.push({ x: pos.x, y: pos.y, width: w, height: h })
      }
    }
    return rects
  }, [allNodes, edgeBounds])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent, handle: BendHandle) => {
      if (!allowMidpointDragging) return

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

        // Drive the live render from state: the path, the dragged handle, and
        // every decoration derived from the geometry re-render together.
        setDragPreviewPoints(newPoints)
      }

      const handlePointerUp = () => {
        // Drop the live preview; the render falls back to the committed points
        // (or to the points we commit just below). Both updates batch into one
        // re-render, so there is no intermediate flash of the pre-drag shape.
        setDragPreviewPoints(null)

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
      targetPosition,
      sourcePosition,
      adjustedSourceCoordinates.sourceX,
      adjustedSourceCoordinates.sourceY,
      adjustedTargetCoordinates.targetX,
      adjustedTargetCoordinates.targetY,
    ]
  )

  const sourcePoint = renderPoints[0] || { x: sourceX, y: sourceY }
  const targetPoint = renderPoints[renderPoints.length - 1] || {
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
    nodeRects: nearbyNodeRects,
    midSegmentStart: midSegment.start,
    midSegmentEnd: midSegment.end,
    neighborGeometry,
  }

  return {
    pathRef,
    edgeData,
    currentPath,
    overlayPath,
    bendHandles,
    isBendDragging: draggingHandle !== null,
    draggingHandleSegmentIndex: draggingHandle?.segmentIndex ?? null,
    // The midpoint is now known synchronously on first render, so there is no
    // pre-measurement straight-line flash to fade past — always true.
    hasInitialCalculation: true,
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
