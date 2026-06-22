import { useMemo, useRef } from "react"
import { useStore } from "@xyflow/react"
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
import { BaseEdgeProps } from "../edges/GenericEdge"
import {
  computeToolbarPosition,
  isLengthEditableAtZoom,
} from "@/utils/geometry/bendHandles"
import { getMidSegment } from "@/utils/geometry/edgeLabelLayout"
import { useMetadataStore } from "@/store/context"
import {
  useEdgeLineJumps,
  usePublishEdgeGeometry,
  buildEdgePath,
} from "./useEdgeLineJumps"

export interface StraightPathEdgeData {
  pathMiddlePosition: IPoint
  toolbarPosition: IPoint
  isMiddlePathHorizontal: boolean
  sourcePoint: IPoint
  targetPoint: IPoint
}

export const useStraightPathEdge = ({
  id,
  type,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: Omit<BaseEdgeProps, "data">) => {
  const pathRef = useRef<SVGPathElement | null>(null)
  const isDiagramModifiable = useDiagramModifiable()
  const zoom = useStore((state) => state.transform[2])
  const isReconnecting = useMetadataStore(
    (state) => state.reconnectPreviewEdgeId === id
  )

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

  // Publish this edge's real geometry so other edges bridge over it accurately.
  usePublishEdgeGeometry(id, basePoints)

  // UseCase include/extend edges are dashed connectors that never read as
  // crossings to disambiguate, so they opt out of bridging.
  const lineJumps = useEdgeLineJumps(
    id,
    basePoints,
    !isReconnecting && type !== "UseCaseInclude" && type !== "UseCaseExtend"
  )

  // Midpoint + orientation derived purely from the two endpoints. A straight
  // edge's middle is analytic, so this replaces the old getPointAtLength +
  // setTimeout effect (and its two redundant fallback effects) with one
  // synchronous, DOM-free, export-stable computation.
  const { point: pathMiddlePosition, isHorizontal: isMiddlePathHorizontal } =
    useMemo(
      () => getMidSegment(basePoints, basePoints[0], basePoints[1]),
      [basePoints]
    )

  const currentPath = useMemo(() => {
    if (lineJumps.length > 0) return buildEdgePath(basePoints, lineJumps)
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
    basePoints,
    lineJumps,
  ])

  const overlayPath = useMemo(() => {
    // When bridging, the arc'd path is the hit target too, so the selectable
    // stroke matches exactly what's drawn.
    if (lineJumps.length > 0) return currentPath
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
    currentPath,
    lineJumps,
  ])

  const [sourcePoint, targetPoint] = basePoints
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
  }
}
