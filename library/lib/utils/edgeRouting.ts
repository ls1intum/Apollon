import { EDGES } from "@/constants"
import { IPoint, tryFindStraightPath } from "@/edges/Connection"
import { Position, getSmoothStepPath, type Rect } from "@xyflow/react"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  orthogonalizePoints,
  parseSvgPath,
  removeDuplicatePoints,
  simplifySvgPath,
} from "./edgeUtils"

interface SidePair {
  source: Position
  target: Position
}

const STRAIGHT_SIDE_PAIRS: SidePair[] = [
  { source: Position.Right, target: Position.Left },
  { source: Position.Left, target: Position.Right },
  { source: Position.Bottom, target: Position.Top },
  { source: Position.Top, target: Position.Bottom },
]

export interface ComputeAutoEdgeRouteParams {
  sourceRect: Rect
  targetRect: Rect
  markerPadding: number
  sourcePadding?: number
  targetEndpointPadding?: number
  sourceSideInset?: number
  targetSideInset?: number
  preferStraight?: boolean
  allowOrthogonalFallback?: boolean
  borderRadius?: number
  offset?: number
}

export interface AutoEdgeRoute {
  sourcePosition: Position
  targetPosition: Position
  sourcePoint: IPoint
  targetPoint: IPoint
  points: IPoint[]
  pathType: "straight" | "step"
}

function getRectCenter(rect: Rect): IPoint {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clampAxisWithInset(
  axisValue: number,
  start: number,
  size: number,
  inset: number
): number {
  const normalizedInset = Math.max(0, inset)
  const min = start + normalizedInset
  const max = start + size - normalizedInset

  if (min <= max) {
    return clamp(axisValue, min, max)
  }

  return start + size / 2
}

function getBoundaryPoint(
  rect: Rect,
  side: Position,
  sideAxisValue: number,
  sideInset: number
): IPoint {
  switch (side) {
    case Position.Top:
      return {
        x: clampAxisWithInset(sideAxisValue, rect.x, rect.width, sideInset),
        y: rect.y,
      }
    case Position.Right:
      return {
        x: rect.x + rect.width,
        y: clampAxisWithInset(sideAxisValue, rect.y, rect.height, sideInset),
      }
    case Position.Bottom:
      return {
        x: clampAxisWithInset(sideAxisValue, rect.x, rect.width, sideInset),
        y: rect.y + rect.height,
      }
    case Position.Left:
      return {
        x: rect.x,
        y: clampAxisWithInset(sideAxisValue, rect.y, rect.height, sideInset),
      }
  }
}

function applySideInsetToBoundaryPoint(
  point: IPoint,
  rect: Rect,
  side: Position,
  sideInset: number
): IPoint {
  switch (side) {
    case Position.Top:
      return {
        x: clampAxisWithInset(point.x, rect.x, rect.width, sideInset),
        y: rect.y,
      }
    case Position.Right:
      return {
        x: rect.x + rect.width,
        y: clampAxisWithInset(point.y, rect.y, rect.height, sideInset),
      }
    case Position.Bottom:
      return {
        x: clampAxisWithInset(point.x, rect.x, rect.width, sideInset),
        y: rect.y + rect.height,
      }
    case Position.Left:
      return {
        x: rect.x,
        y: clampAxisWithInset(point.y, rect.y, rect.height, sideInset),
      }
  }
}

function adjustedEndpoint(
  point: IPoint,
  side: Position,
  padding: number,
  kind: "source" | "target"
): IPoint {
  if (kind === "source") {
    const adjusted = adjustSourceCoordinates(point.x, point.y, side, padding)
    return { x: adjusted.sourceX, y: adjusted.sourceY }
  }

  const adjusted = adjustTargetCoordinates(point.x, point.y, side, padding)
  return { x: adjusted.targetX, y: adjusted.targetY }
}

function getFallbackSidePair(sourceRect: Rect, targetRect: Rect): SidePair {
  const sourceCenter = getRectCenter(sourceRect)
  const targetCenter = getRectCenter(targetRect)
  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { source: Position.Right, target: Position.Left }
      : { source: Position.Left, target: Position.Right }
  }

  return dy >= 0
    ? { source: Position.Bottom, target: Position.Top }
    : { source: Position.Top, target: Position.Bottom }
}

function calculatePairDistance(points: IPoint[]): number {
  if (points.length < 2) return Number.POSITIVE_INFINITY
  const start = points[0]
  const end = points[points.length - 1]
  return Math.hypot(end.x - start.x, end.y - start.y)
}

export function computeAutoEdgeRoute({
  sourceRect,
  targetRect,
  markerPadding,
  sourcePadding = EDGES.SOURCE_CONNECTION_POINT_PADDING,
  targetEndpointPadding = markerPadding,
  sourceSideInset = 0,
  targetSideInset = 0,
  preferStraight = true,
  allowOrthogonalFallback = true,
  borderRadius = EDGES.STEP_BORDER_RADIUS,
  offset = 30,
}: ComputeAutoEdgeRouteParams): AutoEdgeRoute | null {
  const straightCandidates = STRAIGHT_SIDE_PAIRS.map((pair) => {
    const straightPoints = tryFindStraightPath(
      {
        position: { x: sourceRect.x, y: sourceRect.y },
        width: sourceRect.width,
        height: sourceRect.height,
        direction: pair.source,
      },
      {
        position: { x: targetRect.x, y: targetRect.y },
        width: targetRect.width,
        height: targetRect.height,
        direction: pair.target,
      },
      markerPadding
    )

    if (!straightPoints || straightPoints.length < 2) {
      return null
    }

    const sourceBoundaryPoint = applySideInsetToBoundaryPoint(
      straightPoints[0],
      sourceRect,
      pair.source,
      sourceSideInset
    )
    const targetBoundaryPoint = applySideInsetToBoundaryPoint(
      straightPoints[straightPoints.length - 1],
      targetRect,
      pair.target,
      targetSideInset
    )
    const sourcePoint = adjustedEndpoint(
      sourceBoundaryPoint,
      pair.source,
      sourcePadding,
      "source"
    )
    const targetPoint = adjustedEndpoint(
      targetBoundaryPoint,
      pair.target,
      targetEndpointPadding,
      "target"
    )

    const points = [sourcePoint, targetPoint]
    return {
      sourcePosition: pair.source,
      targetPosition: pair.target,
      sourcePoint,
      targetPoint,
      points,
      pathType: "straight" as const,
    }
  }).filter(
    (candidate): candidate is NonNullable<typeof candidate> => candidate !== null
  )

  if (preferStraight && straightCandidates.length > 0) {
    return straightCandidates.reduce((best, candidate) => {
      return calculatePairDistance(candidate.points) <
        calculatePairDistance(best.points)
        ? candidate
        : best
    })
  }

  if (!allowOrthogonalFallback) {
    return null
  }

  const pair = getFallbackSidePair(sourceRect, targetRect)
  const sourceCenter = getRectCenter(sourceRect)
  const targetCenter = getRectCenter(targetRect)
  const sharedAxisValue =
    pair.source === Position.Left || pair.source === Position.Right
      ? (sourceCenter.y + targetCenter.y) / 2
      : (sourceCenter.x + targetCenter.x) / 2

  const rawSourcePoint = getBoundaryPoint(
    sourceRect,
    pair.source,
    sharedAxisValue,
    sourceSideInset
  )
  const rawTargetPoint = getBoundaryPoint(
    targetRect,
    pair.target,
    sharedAxisValue,
    targetSideInset
  )
  const sourcePoint = adjustedEndpoint(
    rawSourcePoint,
    pair.source,
    sourcePadding,
    "source"
  )
  const targetPoint = adjustedEndpoint(
    rawTargetPoint,
    pair.target,
    targetEndpointPadding,
    "target"
  )

  const [edgePath] = getSmoothStepPath({
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    sourcePosition: pair.source,
    targetX: targetPoint.x,
    targetY: targetPoint.y,
    targetPosition: pair.target,
    borderRadius,
    offset,
  })

  const simplifiedPath = simplifySvgPath(edgePath)
  const parsedPath = removeDuplicatePoints(parseSvgPath(simplifiedPath))
  let points = orthogonalizePoints(parsedPath)

  if (points.length < 2) {
    points = [sourcePoint, targetPoint]
  } else {
    points = [...points]
    points[0] = sourcePoint
    points[points.length - 1] = targetPoint
  }

  return {
    sourcePosition: pair.source,
    targetPosition: pair.target,
    sourcePoint,
    targetPoint,
    points,
    pathType: "step",
  }
}
