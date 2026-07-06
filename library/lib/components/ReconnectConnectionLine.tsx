import { useMemo } from "react"
import {
  ConnectionLineComponentProps,
  ConnectionLineType,
  getSmoothStepPath,
  getStraightPath,
  Position,
  useStore,
  type Rect,
  type XYPosition,
} from "@xyflow/react"
import { EDGES } from "@/constants"
import { pointsToSvgPath } from "@/edges/Connection"
import { useDiagramStore, useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getEdgeMarkerStyles,
  getFreeformAnchorFromPoint,
  getFreeformAnchorPoint,
  preserveOrthogonalEdgePoints,
} from "@/utils/edgeUtils"

// A new-connection ghost stays hidden until the pointer has been dragged at
// least this far (flow px) from the source handle — so a stray click or a tiny
// drag doesn't flash a preview, and the ghost reads as an intentional gesture
// once you commit to pulling away from the node. It also appears immediately
// while hovering ANY node, so short connections to a near neighbour still
// preview.
const GHOST_MIN_DRAG_DISTANCE_PX = 40

const getFallbackConnectionPath = (
  connectionLineType: ConnectionLineType,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  fromPosition: Position,
  toPosition: Position
): string => {
  if (connectionLineType === ConnectionLineType.Straight) {
    const [path] = getStraightPath({
      sourceX: fromX,
      sourceY: fromY,
      targetX: toX,
      targetY: toY,
    })
    return path
  }

  const [path] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    borderRadius: EDGES.STEP_BORDER_RADIUS,
    offset: 30,
  })

  return path
}

export const ReconnectConnectionLine = ({
  connectionLineStyle,
  connectionLineType,
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}: ConnectionLineComponentProps) => {
  const {
    reconnectPreviewEdgeId,
    reconnectPreviewHandleType,
    reconnectPreviewBasePoints,
  } = useMetadataStore(
    useShallow((state) => ({
      reconnectPreviewEdgeId: state.reconnectPreviewEdgeId,
      reconnectPreviewHandleType: state.reconnectPreviewHandleType,
      reconnectPreviewBasePoints: state.reconnectPreviewBasePoints,
    }))
  )

  const previewEdge = useDiagramStore(
    useShallow((state) =>
      reconnectPreviewEdgeId
        ? state.edges.find((edge) => edge.id === reconnectPreviewEdgeId)
        : undefined
    )
  )

  // Live node rectangles so the ghost can SNAP its free end onto the freeform
  // anchor point of whatever node the pointer is currently over — previewing
  // exactly where the edge will attach on release.
  const nodeLookup = useStore((s) => s.nodeLookup)

  const path = useMemo(() => {
    const rectOf = (
      node: typeof nodeLookup extends Map<string, infer N> ? N : never
    ): Rect | null => {
      const width = node.measured?.width ?? node.width
      const height = node.measured?.height ?? node.height
      if (!width || !height) return null
      return {
        x: node.internals.positionAbsolute.x,
        y: node.internals.positionAbsolute.y,
        width,
        height,
      }
    }
    const contains = (r: Rect, p: XYPosition, halo = 0) =>
      p.x >= r.x - halo &&
      p.x <= r.x + r.width + halo &&
      p.y >= r.y - halo &&
      p.y <= r.y + r.height + halo

    // The node the connection STARTS on (its border holds the source handle),
    // so the ghost's own source node is never treated as a snap target.
    const sourcePoint: XYPosition = { x: fromX, y: fromY }
    let sourceNodeId: string | null = null
    for (const node of nodeLookup.values()) {
      const r = rectOf(node)
      if (r && contains(r, sourcePoint, 2)) {
        sourceNodeId = node.id
        break
      }
    }

    // Snap a pointer to the freeform border point of the smallest OTHER node
    // under it (grown by a small halo so drops on the arc/just-outside still
    // snap). Null when over empty canvas or only the source node.
    const snapToNodeUnder = (
      pointer: XYPosition
    ): { point: XYPosition; position: Position } | null => {
      const HALO = 16
      let best: Rect | null = null
      let bestArea = Infinity
      for (const node of nodeLookup.values()) {
        if (node.id === sourceNodeId) continue
        const r = rectOf(node)
        if (!r || !contains(r, pointer, HALO)) continue
        const area = r.width * r.height
        if (area < bestArea) {
          bestArea = area
          best = r
        }
      }
      if (!best) return null
      const anchor = getFreeformAnchorFromPoint(pointer, best)
      return getFreeformAnchorPoint(best, anchor)
    }

    if (
      !previewEdge ||
      !reconnectPreviewHandleType ||
      reconnectPreviewBasePoints.length < 2
    ) {
      // NEW connection. Distance-gate: keep the ghost hidden until the pointer
      // is dragged away from the source, unless it is already hovering a node
      // (so short hops to a neighbour still preview).
      const pointer: XYPosition = { x: toX, y: toY }
      const snapped = snapToNodeUnder(pointer)
      const draggedFar =
        Math.hypot(toX - fromX, toY - fromY) >= GHOST_MIN_DRAG_DISTANCE_PX
      if (!draggedFar && !snapped) return ""

      const end = snapped ?? { point: pointer, position: toPosition }
      return getFallbackConnectionPath(
        connectionLineType,
        fromX,
        fromY,
        end.point.x,
        end.point.y,
        fromPosition,
        end.position
      )
    }

    const markerPadding =
      getEdgeMarkerStyles(previewEdge.type ?? "").markerPadding ??
      EDGES.MARKER_PADDING
    const movedEnd =
      reconnectPreviewHandleType === "target" ? "source" : "target"

    // React Flow reports the fixed opposite endpoint in onReconnectStart.
    const sourceAnchor =
      movedEnd === "source"
        ? { point: { x: toX, y: toY }, position: toPosition }
        : { point: { x: fromX, y: fromY }, position: fromPosition }
    const targetAnchor =
      movedEnd === "source"
        ? { point: { x: fromX, y: fromY }, position: fromPosition }
        : { point: { x: toX, y: toY }, position: toPosition }

    const adjustedSourceCoordinates = adjustSourceCoordinates(
      sourceAnchor.point.x,
      sourceAnchor.point.y,
      sourceAnchor.position,
      EDGES.SOURCE_CONNECTION_POINT_PADDING
    )
    const adjustedTargetCoordinates = adjustTargetCoordinates(
      targetAnchor.point.x,
      targetAnchor.point.y,
      targetAnchor.position,
      markerPadding
    )

    const reconnectPreviewPoints = preserveOrthogonalEdgePoints(
      reconnectPreviewBasePoints,
      {
        x: adjustedSourceCoordinates.sourceX,
        y: adjustedSourceCoordinates.sourceY,
      },
      {
        x: adjustedTargetCoordinates.targetX,
        y: adjustedTargetCoordinates.targetY,
      },
      sourceAnchor.position,
      targetAnchor.position
    )

    return pointsToSvgPath(reconnectPreviewPoints)
  }, [
    connectionLineType,
    fromPosition,
    fromX,
    fromY,
    previewEdge,
    reconnectPreviewBasePoints,
    reconnectPreviewHandleType,
    toPosition,
    toX,
    toY,
    nodeLookup,
  ])

  const edgeStrokeColor =
    previewEdge?.data &&
    typeof previewEdge.data === "object" &&
    "strokeColor" in previewEdge.data &&
    typeof previewEdge.data.strokeColor === "string"
      ? previewEdge.data.strokeColor
      : undefined

  // A prominent, dashed ghost so the preview reads clearly (the default line was
  // a faint hairline). Uses the edge's own colour while reconnecting, else the
  // primary accent for a new connection.
  return (
    <path
      d={path}
      fill="none"
      className="react-flow__connection-path apollon-connection-ghost"
      style={{
        ...connectionLineStyle,
        stroke:
          edgeStrokeColor ??
          connectionLineStyle?.stroke ??
          "var(--apollon-primary, #3e8acc)",
        strokeWidth: 2,
        strokeDasharray: "6 5",
        opacity: path ? 1 : 0,
      }}
    />
  )
}
