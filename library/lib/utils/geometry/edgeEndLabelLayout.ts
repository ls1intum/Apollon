import type { Position } from "@xyflow/system"
import type { IPoint } from "@/edges/Connection"
import {
  calculateDynamicEdgeLabels,
  getEndpointSideFromSegment,
} from "@/utils/edgeUtils"

export type EdgeEndLabelCoordinates = ReturnType<
  typeof calculateDynamicEdgeLabels
>

export type EdgeEndLabelPlacements = Readonly<{
  source: EdgeEndLabelCoordinates
  target: EdgeEndLabelCoordinates
}>

/**
 * Pure terminal-label geometry shared by rendering and automatic layout.
 * A routed terminal segment is authoritative; declared handle sides are only
 * fallbacks for the short period before route geometry exists.
 */
export const getEdgeEndLabelPlacements = ({
  activePoints,
  source,
  target,
  sourcePosition,
  targetPosition,
}: {
  activePoints: readonly IPoint[]
  source: IPoint
  target: IPoint
  sourcePosition: Position | string
  targetPosition: Position | string
}): EdgeEndLabelPlacements => {
  if (activePoints.length < 2)
    return {
      source: calculateDynamicEdgeLabels(source.x, source.y, sourcePosition),
      target: calculateDynamicEdgeLabels(target.x, target.y, targetPosition),
    }

  const sourcePoint = activePoints[0]
  const targetPoint = activePoints[activePoints.length - 1]
  return {
    source: calculateDynamicEdgeLabels(
      sourcePoint.x,
      sourcePoint.y,
      getEndpointSideFromSegment(sourcePoint, activePoints[1])
    ),
    target: calculateDynamicEdgeLabels(
      targetPoint.x,
      targetPoint.y,
      getEndpointSideFromSegment(
        targetPoint,
        activePoints[activePoints.length - 2]
      )
    ),
  }
}
