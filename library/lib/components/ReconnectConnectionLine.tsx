import { useMemo } from "react"
import {
  ConnectionLineComponentProps,
  ConnectionLineType,
  getSmoothStepPath,
  getStraightPath,
  Position,
} from "@xyflow/react"
import { EDGES } from "@/constants"
import { pointsToSvgPath } from "@/edges/Connection"
import { useDiagramStore, useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getEdgeMarkerStyles,
  preserveOrthogonalEdgePoints,
} from "@/utils/edgeUtils"

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

  const path = useMemo(() => {
    if (
      !previewEdge ||
      !reconnectPreviewHandleType ||
      reconnectPreviewBasePoints.length < 2
    ) {
      return getFallbackConnectionPath(
        connectionLineType,
        fromX,
        fromY,
        toX,
        toY,
        fromPosition,
        toPosition
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
        ? {
            point: { x: toX, y: toY },
            position: toPosition,
          }
        : {
            point: { x: fromX, y: fromY },
            position: fromPosition,
          }
    const targetAnchor =
      movedEnd === "source"
        ? {
            point: { x: fromX, y: fromY },
            position: fromPosition,
          }
        : {
            point: { x: toX, y: toY },
            position: toPosition,
          }

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
  ])

  const edgeStrokeColor =
    previewEdge?.data &&
    typeof previewEdge.data === "object" &&
    "strokeColor" in previewEdge.data &&
    typeof previewEdge.data.strokeColor === "string"
      ? previewEdge.data.strokeColor
      : undefined

  return (
    <path
      d={path}
      fill="none"
      className="react-flow__connection-path"
      style={{
        ...connectionLineStyle,
        stroke: edgeStrokeColor ?? connectionLineStyle?.stroke,
      }}
    />
  )
}
