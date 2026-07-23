import {
  useCallback,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import {
  Position,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
} from "@xyflow/react"
import { EDGES, INTERFACE } from "@/constants"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getPositionOnCanvas,
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
  getEndpointSideFromSegment,
  getTargetConnectionPointPadding,
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
import {
  resolveEdgeGeometryNodes,
  createNearbySettledNodeGeometrySelector,
  selectEdgeNodeSubscription,
} from "@/utils/geometry/edgeNodeSubscription"
import {
  createRouteEntriesSelector,
  selectedRoutesToRecord,
} from "@/utils/geometry/edgeGeometrySubscriptions"
import { recordEdgeRender } from "@/sync/perfCounters"

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
  /**
   * Canonical marker type while the target endpoint is over empty canvas.
   * Interface bundles may use reduced socket variants while attached, but a
   * detached edge has no bundle context and must render its full socket.
   */
  detachedTargetMarkerType?: string
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
  nodeType?: string
  handleId: string
  anchor: FreeformEdgeAnchor
  points: IPoint[]
  sourceEndpoint: IPoint
  targetEndpoint: IPoint
  sourcePosition: Position
  targetPosition: Position
  sourceRect: Rect
  targetRect: Rect
  committedPoints: IPoint[]
  predictedEdge: Edge
}

const arePointsEqual = (a: IPoint[], b: IPoint[]): boolean =>
  a.length === b.length &&
  a.every((point, index) => point.x === b[index].x && point.y === b[index].y)

const isInterfaceNodeType = (nodeType?: string): boolean =>
  nodeType === "componentInterface" || nodeType === "deploymentInterface"

const getInterfaceMarkerGeometry = (
  nodeType: string | undefined,
  rect: Rect | null
) =>
  rect && isInterfaceNodeType(nodeType)
    ? {
        // The interface SVG uses width / 2 as its circle radius. Match the
        // rendered node exactly, including older 20px imported interfaces.
        radius: rect.width / 2,
      }
    : undefined

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
  sourceHandleId,
  targetHandleId,
  data,
  allowMidpointDragging = true,
  detachedTargetMarkerType,
}: UseStepPathEdgeProps) => {
  recordEdgeRender()
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
  // Document-level listeners outlive the SVG element that started a gesture.
  // Keep explicit cancel/teardown handles so pointercancel restores the edge and
  // unmount always detaches listeners without trying to update unmounted state.
  const activePointerCancelRef = useRef<(() => void) | null>(null)
  const activePointerTeardownRef = useRef<(() => void) | null>(null)

  const isDiagramModifiable = useDiagramModifiable()
  const setLiveEdgeOverride = useMetadataStore(
    (state) => state.setLiveEdgeOverride
  )
  // This edge renders a display-only endpoint projection while the Worker owns
  // a newer solve. Neighbour scans deliberately remain on settled geometry, so
  // only routes whose own preview reference changed render during interaction.
  const centralRoute = useEdgeGeometryStore(
    (state) => state.previewById[id] ?? state.geometryById[id]
  )
  const { getIntersectingNodes, getNode, getNodes, screenToFlowPosition } =
    useReactFlow()

  const [draggingHandle, setDraggingHandle] = useState<BendHandle | null>(null)
  // Live drag geometry, rendered instead of the committed `activePoints`. Driving
  // the drag through state (not by mutating the SVG `d`) keeps everything derived
  // from the path — handle, toolbar, labels, per-type decorators — in sync per move.
  const [dragPreviewPoints, setDragPreviewPoints] = useState<IPoint[] | null>(
    null
  )
  const [dragPreviewPositions, setDragPreviewPositions] = useState<{
    sourcePosition: Position
    targetPosition: Position
  } | null>(null)
  // Render-visible counterpart to the pointer-up ref. The predicted central route
  // is display state, so React must be able to observe when its endpoints change.
  const [endpointPreviewCommit, setEndpointPreviewCommit] =
    useState<EndpointDragCommit | null>(null)
  const [isTargetEndpointDetached, setIsTargetEndpointDetached] =
    useState(false)

  useEffect(
    () => () => {
      activePointerTeardownRef.current?.()
    },
    []
  )

  const { customPoints, setCustomPoints } = useEdgeState(data?.points)
  const sourceAnchor = data?.sourceAnchor
  const targetAnchor = data?.targetAnchor
  const shouldSubscribeToNodeGeometry =
    isFreeformEdgeAnchor(sourceAnchor) || isFreeformEdgeAnchor(targetAnchor)
  const setEdges = useDiagramStore((state) => state.setEdges)
  const endpointNodeGeometry = useDiagramStore(
    useShallow((state) => {
      // Returning one stable primitive for automatic edges avoids allocating
      // and shallow-comparing an eight-field object on every node drag.
      if (!shouldSubscribeToNodeGeometry) return undefined

      const storeSourceNode = state.nodes.find((node) => node.id === source)
      const storeTargetNode = state.nodes.find((node) => node.id === target)
      const storeSourcePosition = storeSourceNode
        ? getPositionOnCanvas(storeSourceNode, state.nodes)
        : null
      const storeTargetPosition = storeTargetNode
        ? getPositionOnCanvas(storeTargetNode, state.nodes)
        : null

      return {
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
    sourceNodePositionX,
    sourceNodePositionY,
    sourceNodeWidth,
    sourceNodeHeight,
    targetNodePositionX,
    targetNodePositionY,
    targetNodeWidth,
    targetNodeHeight,
  } = endpointNodeGeometry ?? {}

  const edgeMarkerStyles = getEdgeMarkerStyles(type)
  const {
    markerPadding,
    markerStart,
    strokeDashArray,
    offset = 0,
  } = edgeMarkerStyles
  const markerEnd =
    isTargetEndpointDetached && detachedTargetMarkerType
      ? getEdgeMarkerStyles(detachedTargetMarkerType).markerEnd
      : edgeMarkerStyles.markerEnd
  const padding = markerPadding ?? EDGES.MARKER_PADDING
  // Only a pinned/freeform endpoint depends directly on every node update (its
  // absolute point may follow a nested parent). Auto edges receive their route
  // from the central geometry store; subscribing all of them to `state.nodes`
  // made one drag re-render the entire edge layer. They still read a current,
  // non-reactive snapshot whenever their own RF props/central route render, so
  // nested endpoint interaction and label avoidance retain the full node set.
  const subscribedNodes = useStore((state) =>
    selectEdgeNodeSubscription(state.nodes, shouldSubscribeToNodeGeometry)
  )
  const allNodes = resolveEdgeGeometryNodes(
    subscribedNodes,
    getNodes,
    shouldSubscribeToNodeGeometry
  ) as Node[]
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
  const committedTargetInterfaceGeometry = getInterfaceMarkerGeometry(
    targetNode?.type,
    targetRect
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
  const baseSourcePosition =
    resolvedSourceAnchor?.position ?? reactFlowSourcePosition
  const baseTargetPosition =
    resolvedTargetAnchor?.position ?? reactFlowTargetPosition
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
    ? roundAnchorPointOutward(resolvedSourceAnchor.point, baseSourcePosition)
    : { x: Math.round(sourceX), y: Math.round(sourceY) }
  const roundedTarget = resolvedTargetAnchor
    ? roundAnchorPointOutward(resolvedTargetAnchor.point, baseTargetPosition)
    : { x: Math.round(targetX), y: Math.round(targetY) }
  const roundedSourceX = roundedSource.x
  const roundedSourceY = roundedSource.y
  const roundedTargetX = roundedTarget.x
  const roundedTargetY = roundedTarget.y

  const baseAdjustedTarget = adjustTargetCoordinates(
    roundedTargetX,
    roundedTargetY,
    baseTargetPosition,
    targetConnectionPointPadding
  )
  const baseAdjustedSource = adjustSourceCoordinates(
    roundedSourceX,
    roundedSourceY,
    baseSourcePosition,
    sourceConnectionPointPadding
  )

  // The solver's committed route is the single source of truth for where this
  // edge attaches: its first/last points ARE the adjusted anchors the auto-router
  // chose, and its first/last segment directions ARE the sides. The handles, drag
  // baseline and reconnection all read them from here. Re-deriving the anchor
  // independently (as this hook once did) would let the interaction layer act on
  // endpoints the user cannot see the moment the auto-router moves them — a bend
  // dragged against a stale baseline is silently discarded. The `base*` values
  // above are only the pre-first-solve fallback.
  const routeEndpoints =
    centralRoute && centralRoute.length >= 2 ? centralRoute : null
  const sourcePosition = routeEndpoints
    ? getEndpointSideFromSegment(routeEndpoints[0], routeEndpoints[1])
    : baseSourcePosition
  const targetPosition = routeEndpoints
    ? getEndpointSideFromSegment(
        routeEndpoints[routeEndpoints.length - 1],
        routeEndpoints[routeEndpoints.length - 2]
      )
    : baseTargetPosition
  const adjustedSourceCoordinates = routeEndpoints
    ? { sourceX: routeEndpoints[0].x, sourceY: routeEndpoints[0].y }
    : baseAdjustedSource
  const adjustedTargetCoordinates = routeEndpoints
    ? {
        targetX: routeEndpoints[routeEndpoints.length - 1].x,
        targetY: routeEndpoints[routeEndpoints.length - 1].y,
      }
    : baseAdjustedTarget
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
    // The central store also carries this edge's bend/reconnect display preview.
    // It is not committed diagram state: pointer-up below owns that write. In
    // particular, a predicted reconnect of an already manual edge must not
    // overwrite its old waypoints merely by hovering a node.
    if (dragPreviewPoints !== null) return

    // Pointer-up clears local preview state before the solver's layout-effect
    // cleanup necessarily restores the stored edge route. Do not let that brief
    // handoff frame write a cursor/predicted endpoint into manual waypoints. A
    // committed manual route always begins/ends at the edge props' resolved stored
    // anchors (`baseAdjusted*`); node-move reprojection still passes this gate.
    if (
      centralRoute &&
      centralRoute.length >= 2 &&
      (centralRoute[0].x !== baseAdjustedSource.sourceX ||
        centralRoute[0].y !== baseAdjustedSource.sourceY ||
        centralRoute[centralRoute.length - 1].x !==
          baseAdjustedTarget.targetX ||
        centralRoute[centralRoute.length - 1].y !== baseAdjustedTarget.targetY)
    )
      return

    // This effect persists the SOLVER's (manual-merged, re-projected) route. Until the
    // solver's first route lands, `activePoints` is `centralFallback` — a bare
    // source→target straight line that is never painted. Re-projecting THAT would
    // normalize it to the auto route and overwrite the user's stored manual bends before
    // the solver ever preserved them. Wait for the real route: never persist the fallback.
    if (!centralRoute) return

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
    baseAdjustedSource.sourceX,
    baseAdjustedSource.sourceY,
    baseAdjustedTarget.targetX,
    baseAdjustedTarget.targetY,
    centralRoute,
    customPoints,
    data?.points,
    dragPreviewPoints,
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
  const predictedCommit = endpointPreviewCommit
  const isPredictedEndpointPreview =
    dragPreviewPoints !== null && predictedCommit !== null
  const centralPreviewMatchesCommit =
    isPredictedEndpointPreview &&
    centralRoute !== undefined &&
    centralRoute.length >= 2 &&
    (predictedCommit.endpoint === "source"
      ? centralRoute[0].x === predictedCommit.sourceEndpoint.x &&
        centralRoute[0].y === predictedCommit.sourceEndpoint.y
      : centralRoute[centralRoute.length - 1].x ===
          predictedCommit.targetEndpoint.x &&
        centralRoute[centralRoute.length - 1].y ===
          predictedCommit.targetEndpoint.y)
  // A snapped endpoint reconnect is solved as its predicted committed edge. Until
  // that layout-effect solve lands, keep the local cursor-following fallback only
  // if it already has the committed endpoints; never flash the old stored route.
  const renderPoints = centralPreviewMatchesCommit
    ? centralRoute
    : (dragPreviewPoints ?? activePoints)
  const renderSourcePosition =
    dragPreviewPositions?.sourcePosition ?? sourcePosition
  const renderTargetPosition =
    dragPreviewPositions?.targetPosition ?? targetPosition
  const targetInterfaceGeometry =
    endpointPreviewCommit?.endpoint === "target"
      ? (getInterfaceMarkerGeometry(
          endpointPreviewCommit?.nodeType,
          endpointPreviewCommit?.targetRect ?? null
        ) ?? {
          // A required marker may be dragged onto a non-interface target. It
          // remains an edge marker and uses the current interface size there.
          radius: INTERFACE.RADIUS,
        })
      : committedTargetInterfaceGeometry

  // Bridge over edges this one crosses. Computed from `renderPoints` so the
  // arcs follow a live bend drag frame-by-frame (during a bend only THIS edge's
  // points change, so only its own scan re-runs — cheap). Suppressed only while
  // Other edges' geometry is read from the shared registry the solver populates.
  const lineJumps = useEdgeLineJumps(id, renderPoints, true)

  // While THIS edge is being bend/endpoint-dragged (`dragPreviewPoints` set),
  // hand the live preview to the solver so every OTHER edge routes around it in
  // real time. A layout effect, so the override lands before paint, with a
  // cleanup that clears it the instant the drag ends or the edge unmounts. Only
  // the dragged edge has non-null `dragPreviewPoints`, so only it ever publishes.
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
    return getBendableSegments(renderPoints, EDGES.BEND_HANDLE_SAFE_AREA_PX)
  }, [renderPoints, allowMidpointDragging])

  // Endpoints are ALWAYS draggable. Overlap of the two hit targets on a short edge
  // is handled geometrically instead (each owns half the run between them, see
  // getEndpointRun), so no minimum-length gate is needed.
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
  const labelNeighborSearch = useMemo(() => {
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
    return {
      center,
      radius,
      query: {
        x: center.x - radius,
        y: center.y - radius,
        width: radius * 2,
        height: radius * 2,
      },
    }
  }, [edgeBounds])
  const selectNeighborRoutes = useMemo(
    () => createRouteEntriesSelector(labelNeighborSearch.query, id),
    [labelNeighborSearch.query, id]
  )
  const selectedNeighborRouteEntries = useEdgeGeometryStore(
    useShallow((state) => selectNeighborRoutes(state.geometryById))
  )
  const neighborGeometry = useMemo(() => {
    return collectNeighborPolylines(
      selectedRoutesToRecord(selectedNeighborRouteEntries),
      id,
      labelNeighborSearch.center,
      labelNeighborSearch.radius
    )
  }, [selectedNeighborRouteEntries, id, labelNeighborSearch])

  // EVERY node the edge routes near (not only source/target), so the label never
  // lands on an unrelated node's body. Subscribe to the primitive geometry of
  // ONLY nodes in this label corridor: a far-away drag keeps the selector
  // shallow-equal, while a node entering/moving here still updates the label.
  const selectNearbySettledNodes = useMemo(
    () => createNearbySettledNodeGeometrySelector(edgeBounds, LABEL_REACH),
    [edgeBounds]
  )
  const nearbyNodeGeometry = useEdgeGeometryStore(
    useShallow((state) => selectNearbySettledNodes(state.settledNodeGeometry))
  )
  const nearbyNodeRects = useMemo<Rect[]>(() => {
    const rects: Rect[] = []
    for (let index = 0; index < nearbyNodeGeometry.length; index += 4)
      rects.push({
        x: nearbyNodeGeometry[index],
        y: nearbyNodeGeometry[index + 1],
        width: nearbyNodeGeometry[index + 2],
        height: nearbyNodeGeometry[index + 3],
      })
    return rects
  }, [nearbyNodeGeometry])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent, handle: BendHandle) => {
      if (!allowMidpointDragging || !event.isPrimary || event.button !== 0)
        return

      event.preventDefault()
      event.stopPropagation()
      activePointerCancelRef.current?.()
      const pointerId = event.pointerId
      const pointerTarget = event.currentTarget
      pointerTarget.setPointerCapture(pointerId)

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
        if (e.pointerId !== pointerId) return
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
        // Snap the DELTA from the lane the user grabbed, not the absolute canvas
        // coordinate. Coordinated ports frequently land between grid lines; absolute
        // snapping moved such an edge on the very first pointermove even when the
        // cursor had not changed its lane, which then needlessly re-optimized every
        // automatic neighbour.
        const toLane = (value: number, origin: number): number =>
          Math.min(
            Math.max(
              origin + Math.round((value - origin) / grid) * grid,
              laneBounds.min
            ),
            laneBounds.max
          )

        const delta: IPoint =
          activeHandle.orientation === "H"
            ? {
                x: 0,
                y:
                  toLane(rawY, activeHandle.position.y) -
                  activeHandle.position.y,
              }
            : {
                x:
                  toLane(rawX, activeHandle.position.x) -
                  activeHandle.position.x,
                y: 0,
              }

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

      const ownerDocument = event.currentTarget.ownerDocument
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
        setDragPreviewPoints(null)
        draggingHandleRef.current = null
        setDraggingHandle(null)
      }

      const handlePointerCancel = (e?: PointerEvent) => {
        if (e && e.pointerId !== pointerId) return
        restoreWithoutCommit()
        teardownPointerGesture()
      }

      const handlePointerUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
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
            eds.map((e) => {
              if (e.id !== id) return e

              const nextData: Record<string, unknown> = {
                ...e.data,
                points: normalizedPoints,
              }
              // A bend customizes the complete visible route, including the
              // attachment sites the joint solver chose. Persist those sites as
              // pins when they were still automatic; otherwise the manual points
              // would be re-projected onto the edge's older stored handles on
              // release and the shape could jump at either end.
              if (!isFreeformEdgeAnchor(sourceAnchor) && sourceRect) {
                const pinnedSource = getEdgeAnchorFromPoint(
                  sourceNode?.type,
                  sourcePoint,
                  sourceRect
                )
                if (pinnedSource) nextData.sourceAnchor = pinnedSource
              }
              if (!isFreeformEdgeAnchor(targetAnchor) && targetRect) {
                const pinnedTarget = getEdgeAnchorFromPoint(
                  targetNode?.type,
                  targetPoint,
                  targetRect
                )
                if (pinnedTarget) nextData.targetAnchor = pinnedTarget
              }

              return { ...e, data: nextData }
            })
          )
        }
        draggingHandleRef.current = null
        setDraggingHandle(null)
        teardownPointerGesture()
      }

      activePointerCancelRef.current = handlePointerCancel
      activePointerTeardownRef.current = teardownPointerGesture
      ownerDocument.addEventListener("pointermove", handlePointerMove)
      ownerDocument.addEventListener("pointerup", handlePointerUp)
      ownerDocument.addEventListener("pointercancel", handlePointerCancel)
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
      sourceAnchor,
      sourceNode?.type,
      sourceRect,
      targetAnchor,
      targetNode?.type,
      targetRect,
    ]
  )

  const { getNodeRect, findFreeformEndpointNode } = useFreeformEndpointNode()

  const handleEndpointPointerDown = useCallback(
    (event: React.PointerEvent<SVGRectElement>, endpoint: EndpointType) => {
      if (!event.isPrimary || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      activePointerCancelRef.current?.()
      const pointerId = event.pointerId
      const pointerTarget = event.currentTarget
      pointerTarget.setPointerCapture(pointerId)
      endpointDragCommitRef.current = null
      setEndpointPreviewCommit(null)
      setIsTargetEndpointDetached(false)

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
        const committedPoints = normalizeOrthogonalEdgePoints(
          preservedPoints,
          sourceEndpoint,
          targetEndpoint,
          nextSourcePosition,
          nextTargetPosition
        )
        const predictedData = {
          ...data,
          // Endpoint pinning and bend authorship are independent constraints. A
          // previously automatic edge stays automatic under its predicted pins;
          // only an already-authored route carries waypoints through reconnect.
          points: hasManualPoints ? committedPoints : [],
        }
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
          nodeType: nodeOnTop.type,
          handleId: getSideHandleIdForPosition(resolvedAnchor.position),
          anchor,
          sourceEndpoint,
          targetEndpoint,
          sourcePosition: nextSourcePosition,
          targetPosition: nextTargetPosition,
          sourceRect: nextSourceRect,
          targetRect: nextTargetRect,
          committedPoints,
          points: hasManualPoints
            ? committedPoints
            : (directPoints ?? committedPoints),
          predictedEdge,
        }
      }

      const handlePointerMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        const commit = resolveDragCommit(e.clientX, e.clientY)
        endpointDragCommitRef.current = commit
        setEndpointPreviewCommit(commit)
        if (commit) {
          if (endpoint === "target") setIsTargetEndpointDetached(false)
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
        setIsTargetEndpointDetached(!movingIsSource)
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

      const restoreWithoutCommit = (clearLiveOverride = true) => {
        endpointDragCommitRef.current = null
        setEndpointPreviewCommit(null)
        setDragPreviewPoints(null)
        setDragPreviewPositions(null)
        setIsTargetEndpointDetached(false)
        // Do not wait for the preview-publishing layout effect to clean up on a
        // later render. The central solver subscribes to this shared override;
        // clearing it synchronously makes pointer-up/cancel restore committed
        // geometry in the same state transition as the local preview.
        if (clearLiveOverride) setLiveEdgeOverride(null)
      }

      const handlePointerCancel = (e?: PointerEvent) => {
        if (e && e.pointerId !== pointerId) return
        restoreWithoutCommit()
        teardownPointerGesture()
      }

      const handlePointerUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        const commit = endpointDragCommitRef.current
        // On a successful reconnect, replace the controlled edge before clearing
        // the override. The solver can then distinguish commit from cancellation
        // by edge identity and carry the authored preview until the exact release
        // generation lands.
        restoreWithoutCommit(commit === null)

        if (commit) {
          // Reconnecting an endpoint does not author bend topology. Preserve an
          // existing manual route, but keep a previously automatic edge automatic
          // so the joint solver can continue optimizing it under the new pins.
          const normalizedPoints = hasManualPoints
            ? commit.committedPoints
            : null

          if (normalizedPoints) {
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
              if (!hasManualPoints) {
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
          setLiveEdgeOverride(null)
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
      activePoints,
      adjustedSourceCoordinates.sourceX,
      adjustedSourceCoordinates.sourceY,
      adjustedTargetCoordinates.targetX,
      adjustedTargetCoordinates.targetY,
      data,
      findFreeformEndpointNode,
      getIntersectingNodes,
      getNodeRect,
      hasManualPoints,
      id,
      padding,
      screenToFlowPosition,
      setCustomPoints,
      setEdges,
      setLiveEdgeOverride,
      source,
      sourceHandleId,
      sourceRect,
      sourcePosition,
      target,
      targetHandleId,
      targetRect,
      targetPosition,
      type,
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
    targetInterfaceGeometry,
  }
}
