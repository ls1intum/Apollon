import {
  useCallback,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { Position, useReactFlow, useStore, type Node } from "@xyflow/react"
import { EDGES } from "@/constants"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getPositionOnCanvas,
  isParentNodeType,
} from "@/utils"
import { IPoint, tryFindStraightPath } from "../edges/Connection"
import {
  useDiagramStore,
  useMetadataStore,
  useEdgeGeometryStore,
} from "@/store/context"
import { useShallow } from "zustand/shallow"
import {
  getEdgeMarkerStyles,
  getMarkerSegmentPath,
  preserveOrthogonalEdgePoints,
  getBendLaneBounds,
  normalizeOrthogonalEdgePoints,
  resolveOrthogonalEdgeReleasePoints,
  isInvalidOrthogonalEdgeRelease,
  getSideHandleIdForPosition,
  isFreeformEdgeAnchor,
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
import {
  type BendHandle,
  applyInnerSegmentBend,
  applyTerminalSegmentBend,
  getBendableSegments,
  computeToolbarPosition,
} from "@/utils/geometry/bendHandles"
import {
  getMidSegment,
  collectNeighborPolylines,
  type Rect,
} from "@/utils/geometry/edgeLabelLayout"
import { useEdgeState } from "../edges/GenericEdge"
import { useDiagramModifiable } from "./useDiagramModifiable"
import { useEdgeLineJumps, buildEdgePath } from "./useEdgeLineJumps"

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
  data?: {
    points?: IPoint[]
    sourceAnchor?: FreeformEdgeAnchor
    targetAnchor?: FreeformEdgeAnchor
  }
  allowMidpointDragging?: boolean
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

type EndpointType = "source" | "target"

type EndpointDragCommit = {
  endpoint: EndpointType
  nodeId: string
  handleId: string
  anchor: FreeformEdgeAnchor
  points: IPoint[]
  sourceEndpoint: IPoint
  targetEndpoint: IPoint
  sourcePosition: Position
  targetPosition: Position
  sourceRect: Rect
  targetRect: Rect
  directPoints: IPoint[] | null
}

const arePointsEqual = (a: IPoint[], b: IPoint[]): boolean =>
  a.length === b.length &&
  a.every((point, index) => point.x === b[index].x && point.y === b[index].y)

export const useStepPathEdge = ({
  id,
  type,
  source,
  target,
  sourceX: reactFlowSourceX,
  sourceY: reactFlowSourceY,
  targetX: reactFlowTargetX,
  targetY: reactFlowTargetY,
  sourcePosition: reactFlowSourcePosition,
  targetPosition: reactFlowTargetPosition,
  data,
  allowMidpointDragging = true,
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
  const endpointDragCommitRef = useRef<EndpointDragCommit | null>(null)

  const isDiagramModifiable = useDiagramModifiable()
  const isReconnecting = useMetadataStore(
    (state) => state.reconnectPreviewEdgeId === id
  )
  const setLiveEdgeOverride = useMetadataStore(
    (state) => state.setLiveEdgeOverride
  )
  // This edge's route is computed by the single EdgeGeometrySolver and read back
  // from the shared store instead of routed here.
  const centralRoute = useEdgeGeometryStore((state) => state.geometryById[id])
  const { getIntersectingNodes, getNode, screenToFlowPosition } = useReactFlow()

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
  const [dragPreviewPositions, setDragPreviewPositions] = useState<{
    sourcePosition: Position
    targetPosition: Position
  } | null>(null)

  const { customPoints, setCustomPoints } = useEdgeState(data?.points)
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

  const {
    markerPadding,
    markerEnd,
    markerStart,
    strokeDashArray,
    offset = 0,
  } = getEdgeMarkerStyles(type)
  const padding = markerPadding ?? EDGES.MARKER_PADDING
  // The store's array, NOT `getNodes()`. React Flow's `getNodes()` is
  // `store.getState().nodes.map((n) => ({ ...n }))` — a fresh array of freshly
  // cloned nodes on every call — so an edge that read it got a new `allNodes`
  // identity on every render, forever, and every memo below keyed on it (the
  // obstacles, the neighbours, the endpoint positions) was dead on arrival: they
  // recomputed on every render of every edge, including renders that changed
  // nothing about the geometry (a selection, a hover, a label edit).
  //
  // Subscribing to the store's own array gives a reference that changes only when
  // the nodes actually change, which is what the memos were written to assume.
  const allNodes = useStore((state) => state.nodes) as Node[]
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
    return { x: reactFlowSourceX, y: reactFlowSourceY }
  }, [
    sourceNode,
    allNodes,
    sourceNodePositionX,
    sourceNodePositionY,
    reactFlowSourceX,
    reactFlowSourceY,
  ])

  const targetAbsolutePosition = useMemo(() => {
    if (targetNode) return getPositionOnCanvas(targetNode, allNodes)
    if (targetNodePositionX != null && targetNodePositionY != null) {
      return { x: targetNodePositionX, y: targetNodePositionY }
    }
    return { x: reactFlowTargetX, y: reactFlowTargetY }
  }, [
    targetNode,
    allNodes,
    targetNodePositionX,
    targetNodePositionY,
    reactFlowTargetX,
    reactFlowTargetY,
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

  const sourceX = resolvedSourceAnchor?.point.x ?? reactFlowSourceX
  const sourceY = resolvedSourceAnchor?.point.y ?? reactFlowSourceY
  const targetX = resolvedTargetAnchor?.point.x ?? reactFlowTargetX
  const targetY = resolvedTargetAnchor?.point.y ?? reactFlowTargetY
  const sourcePosition =
    resolvedSourceAnchor?.position ?? reactFlowSourcePosition
  const targetPosition =
    resolvedTargetAnchor?.position ?? reactFlowTargetPosition
  const sourceConnectionPointPadding = resolvedSourceAnchor
    ? 0
    : EDGES.SOURCE_CONNECTION_POINT_PADDING
  const targetConnectionPointPadding = resolvedTargetAnchor ? 0 : padding

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
    targetConnectionPointPadding
  )
  const adjustedSourceCoordinates = adjustSourceCoordinates(
    roundedSourceX,
    roundedSourceY,
    sourcePosition,
    sourceConnectionPointPadding
  )
  const hasStoredManualPoints = Boolean(data?.points && data.points.length > 0)
  const hasLocalManualPoints = customPoints.length > 0
  const hasManualPoints = hasStoredManualPoints
  // The central solver already merged this edge's manual points, so the route it
  // hands back IS the active geometry; a 2-point route means "clean auto route"
  // (nothing to persist), which the effect below acts on.
  const shouldPreferComputedPath =
    (centralRoute?.length ?? 0) === 2 && !hasManualPoints

  const centralFallback = useMemo<IPoint[]>(
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

  // The solver's route (already manual-merged) is the active geometry. Before
  // the first solve lands, fall back to a straight endpoint line — never
  // painted, since the solver commits in a pre-paint layout effect.
  const activePoints = centralRoute ?? centralFallback

  useEffect(() => {
    if (shouldPreferComputedPath) {
      if (hasLocalManualPoints) {
        setCustomPoints([])
      }
      if (hasStoredManualPoints) {
        setEdges((edges) =>
          edges.map((edge) =>
            edge.id === id
              ? { ...edge, data: { ...edge.data, points: [] } }
              : edge
          )
        )
      }
      return
    }

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
    hasLocalManualPoints,
    hasManualPoints,
    hasStoredManualPoints,
    id,
    setCustomPoints,
    setEdges,
    shouldPreferComputedPath,
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
  const renderSourcePosition =
    dragPreviewPositions?.sourcePosition ?? sourcePosition
  const renderTargetPosition =
    dragPreviewPositions?.targetPosition ?? targetPosition

  // Bridge over edges this one crosses. Computed from `renderPoints` so the
  // arcs follow a live bend drag frame-by-frame (during a bend only THIS edge's
  // points change, so only its own scan re-runs — cheap). Suppressed only while
  // reconnecting, where the preview is drawn separately by ReconnectConnectionLine.
  // Other edges' geometry is read from the shared registry the solver populates.
  const lineJumps = useEdgeLineJumps(id, renderPoints, !isReconnecting)

  // While THIS edge is being bend/endpoint-dragged (`dragPreviewPoints` set),
  // hand the live preview to the solver so every OTHER edge routes around it in
  // real time. A layout effect, so the override lands before paint, with a
  // cleanup that clears it the instant the drag ends or the edge unmounts. Only
  // the dragged edge has non-null `dragPreviewPoints`, so only it ever publishes.
  useLayoutEffect(() => {
    if (dragPreviewPoints === null) return
    setLiveEdgeOverride({ edgeId: id, points: dragPreviewPoints })
    return () => setLiveEdgeOverride(null)
  }, [dragPreviewPoints, id, setLiveEdgeOverride])

  const currentPath = useMemo(
    () => buildEdgePath(renderPoints, lineJumps),
    [renderPoints, lineJumps]
  )

  const markerSegmentPath = useMemo(
    () => getMarkerSegmentPath(renderPoints, offset, renderTargetPosition),
    [renderPoints, offset, renderTargetPosition]
  )

  const overlayPath = useMemo(() => {
    return `${currentPath} ${markerSegmentPath}`
  }, [currentPath, markerSegmentPath])

  const bendHandles = useMemo(() => {
    if (!allowMidpointDragging) return []
    return getBendableSegments(
      renderPoints,
      renderSourcePosition,
      renderTargetPosition,
      EDGES.BEND_HANDLE_SAFE_AREA_PX
    )
  }, [
    renderPoints,
    allowMidpointDragging,
    renderSourcePosition,
    renderTargetPosition,
  ])

  // Endpoints are ALWAYS draggable. They used to switch off on any edge shorter
  // than 100px, which produced a capability cliff nobody could explain from the
  // canvas: a short edge could be bent but not reconnected, and a short STRAIGHT
  // edge — no bend handles by nature — could not be edited at all. The rule was
  // really guarding against the two endpoint hit targets overlapping each other,
  // and that is now handled geometrically: each endpoint owns half the run
  // between them (see getEndpointRun), so they cannot steal each other's clicks
  // however close the nodes get.
  const canEditEndpoint = true

  // The mid-segment midpoint + orientation, derived synchronously and purely
  // from the polyline (no DOM measurement). Computed from renderPoints (pre
  // line-jump bridges) so it is frame-stable and identical interactively and in
  // headless export.
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

      // The one degree of freedom this drag has, and how far it may travel. The
      // lane is clamped to this on every move, so the released geometry is legal
      // by construction and nothing has to be vetoed (and snapped back) later.
      const laneBounds = getBendLaneBounds(
        dragBaseline,
        handle.segmentIndex,
        handle.orientation,
        dragSourcePoint,
        dragTargetPoint,
        sourcePosition,
        targetPosition
      )

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
        // Snap to the grid first, then clamp into the legal interval: the lane
        // tracks the cursor and comes to rest against the wall.
        const toLane = (value: number): number =>
          Math.min(
            Math.max(Math.round(value / grid) * grid, laneBounds.min),
            laneBounds.max
          )

        const delta: IPoint =
          activeHandle.orientation === "H"
            ? { x: 0, y: toLane(rawY) - activeHandle.position.y }
            : { x: toLane(rawX) - activeHandle.position.x, y: 0 }

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
      screenToFlowPosition,
      setCustomPoints,
      targetPosition,
      sourcePosition,
      adjustedSourceCoordinates.sourceX,
      adjustedSourceCoordinates.sourceY,
      adjustedTargetCoordinates.targetX,
      adjustedTargetCoordinates.targetY,
    ]
  )

  const { getNodeRect, findFreeformEndpointNode } = useFreeformEndpointNode()

  const handleEndpointPointerDown = useCallback(
    (event: React.PointerEvent<SVGRectElement>, endpoint: EndpointType) => {
      event.preventDefault()
      event.stopPropagation()
      endpointDragCommitRef.current = null

      const ownerDocument = event.currentTarget.ownerDocument
      const dragBaseline = [...activePoints]
      const currentSourceEndpoint = {
        x: adjustedSourceCoordinates.sourceX,
        y: adjustedSourceCoordinates.sourceY,
      }
      const currentTargetEndpoint = {
        x: adjustedTargetCoordinates.targetX,
        y: adjustedTargetCoordinates.targetY,
      }

      if (dragBaseline.length >= 2) {
        dragBaseline[0] = currentSourceEndpoint
        dragBaseline[dragBaseline.length - 1] = currentTargetEndpoint
      }

      const resolveDragCommit = (
        clientX: number,
        clientY: number
      ): EndpointDragCommit | null => {
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
        const nextSourcePosition =
          endpoint === "source" ? resolvedAnchor.position : sourcePosition
        const nextTargetPosition =
          endpoint === "target" ? resolvedAnchor.position : targetPosition
        const nextSourceRect =
          endpoint === "source" ? rect : (sourceRect ?? rect)
        const nextTargetRect =
          endpoint === "target" ? rect : (targetRect ?? rect)
        const directPoints = tryFindStraightPath(
          {
            position: { x: nextSourceRect.x, y: nextSourceRect.y },
            width: nextSourceRect.width,
            height: nextSourceRect.height,
            direction: nextSourcePosition,
          },
          {
            position: { x: nextTargetRect.x, y: nextTargetRect.y },
            width: nextTargetRect.width,
            height: nextTargetRect.height,
            direction: nextTargetPosition,
          },
          // Use the edge's real marker padding (not 0, which tryFindStraightPath
          // maps to a 15px offset) so the preview tip meets the node like the
          // committed edge does — no gap on a straight drag.
          padding,
          {
            sourceX: sourceEndpoint.x,
            sourceY: sourceEndpoint.y,
            targetX: targetEndpoint.x,
            targetY: targetEndpoint.y,
          }
        )
        const preservedPoints = preserveOrthogonalEdgePoints(
          dragBaseline,
          sourceEndpoint,
          targetEndpoint,
          nextSourcePosition,
          nextTargetPosition
        )

        return {
          endpoint,
          nodeId: nodeOnTop.id,
          handleId: getSideHandleIdForPosition(resolvedAnchor.position),
          anchor,
          sourceEndpoint,
          targetEndpoint,
          sourcePosition: nextSourcePosition,
          targetPosition: nextTargetPosition,
          sourceRect: nextSourceRect,
          targetRect: nextTargetRect,
          directPoints,
          points: directPoints ?? preservedPoints,
        }
      }

      const handlePointerMove = (e: PointerEvent) => {
        const commit = resolveDragCommit(e.clientX, e.clientY)
        endpointDragCommitRef.current = commit
        if (commit) {
          setDragPreviewPoints(commit.points)
          setDragPreviewPositions({
            sourcePosition: commit.sourcePosition,
            targetPosition: commit.targetPosition,
          })
          return
        }
        // No snap target (empty canvas): free preview whose dragged end follows
        // the cursor, still step-routed (preserved bends) to match the predicted
        // edge. No commit is set, so releasing here reverts (no reconnect).
        const flowPoint = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        const movingIsSource = endpoint === "source"
        const fixedPoint = movingIsSource
          ? currentTargetEndpoint
          : currentSourceEndpoint
        // Infer the dragged end's side from the drag direction so the step route
        // enters/exits the free endpoint facing back toward the fixed end.
        const dx = flowPoint.x - fixedPoint.x
        const dy = flowPoint.y - fixedPoint.y
        const movingPosition =
          Math.abs(dx) >= Math.abs(dy)
            ? dx >= 0
              ? Position.Left
              : Position.Right
            : dy >= 0
              ? Position.Top
              : Position.Bottom
        const previewSourcePosition = movingIsSource
          ? movingPosition
          : sourcePosition
        const previewTargetPosition = movingIsSource
          ? targetPosition
          : movingPosition
        setDragPreviewPoints(
          preserveOrthogonalEdgePoints(
            dragBaseline,
            movingIsSource ? flowPoint : currentSourceEndpoint,
            movingIsSource ? currentTargetEndpoint : flowPoint,
            previewSourcePosition,
            previewTargetPosition
          )
        )
        setDragPreviewPositions({
          sourcePosition: previewSourcePosition,
          targetPosition: previewTargetPosition,
        })
      }

      const handlePointerUp = () => {
        const commit = endpointDragCommitRef.current
        endpointDragCommitRef.current = null
        setDragPreviewPoints(null)
        setDragPreviewPositions(null)

        if (commit) {
          const normalizedPoints = hasManualPoints
            ? normalizeOrthogonalEdgePoints(
                commit.points,
                commit.sourceEndpoint,
                commit.targetEndpoint,
                commit.sourcePosition,
                commit.targetPosition
              )
            : null
          const shouldClearManualPoints = commit.directPoints !== null

          if (shouldClearManualPoints) {
            setCustomPoints([])
          } else if (normalizedPoints) {
            setCustomPoints(normalizedPoints)
          }

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
              if (shouldClearManualPoints) {
                nextData.points = []
              } else if (normalizedPoints) {
                nextData.points = normalizedPoints
              } else if (!Array.isArray(nextData.points)) {
                nextData.points = []
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
      activePoints,
      adjustedSourceCoordinates.sourceX,
      adjustedSourceCoordinates.sourceY,
      adjustedTargetCoordinates.targetX,
      adjustedTargetCoordinates.targetY,
      findFreeformEndpointNode,
      getIntersectingNodes,
      getNodeRect,
      hasManualPoints,
      id,
      padding,
      screenToFlowPosition,
      setCustomPoints,
      setEdges,
      sourceRect,
      sourcePosition,
      targetRect,
      targetPosition,
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
    // The midpoint is known synchronously on first render, so there is no
    // pre-measurement straight-line flash to fade past — always true.
    hasInitialCalculation: true,
    isReconnecting,
    markerEnd,
    markerStart,
    strokeDashArray,
    handlePointerDown,
    handleEndpointPointerDown,
    sourcePoint,
    targetPoint,
    toolbarPosition,
    isDiagramModifiable,
    canEditEndpoint,
    sourcePosition: renderSourcePosition,
    targetPosition: renderTargetPosition,
  }
}
