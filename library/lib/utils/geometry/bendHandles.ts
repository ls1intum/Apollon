import { Position } from "@xyflow/react"
import { IPoint } from "@/edges/Connection"
import { removeDuplicatePoints } from "@/utils/edgeUtils"

export function collapseCollinearPoints(points: IPoint[]): IPoint[] {
  if (points.length <= 2) return points
  const result: IPoint[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1]
    const curr = points[i]
    const next = points[i + 1]
    const collinearX =
      Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1
    const collinearY =
      Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1
    if (!collinearX && !collinearY) result.push(curr)
  }
  result.push(points[points.length - 1])
  return result
}

export type SegmentKind = "source-terminal" | "target-terminal" | "inner"

export interface BendHandle {
  segmentIndex: number
  position: IPoint
  orientation: "H" | "V"
  kind: SegmentKind
}

const ORIENTATION_TOLERANCE_PX = 1

const snapToGrid = (value: number, grid: number): number => {
  if (grid <= 0) return value
  return Math.round(value / grid) * grid
}

export function hasArmCollapse(points: IPoint[], proximityPx: number): boolean {
  if (points.length < 4) return false
  for (let i = 0; i < points.length - 1; i++) {
    const aStart = points[i]
    const aEnd = points[i + 1]
    const aIsH = Math.abs(aStart.y - aEnd.y) <= ORIENTATION_TOLERANCE_PX
    const aIsV = Math.abs(aStart.x - aEnd.x) <= ORIENTATION_TOLERANCE_PX
    if (!aIsH && !aIsV) continue

    for (let j = i + 2; j < points.length - 1; j++) {
      const bStart = points[j]
      const bEnd = points[j + 1]
      const bIsH = Math.abs(bStart.y - bEnd.y) <= ORIENTATION_TOLERANCE_PX
      const bIsV = Math.abs(bStart.x - bEnd.x) <= ORIENTATION_TOLERANCE_PX

      if (aIsH && bIsH) {
        if (Math.abs(aStart.y - bStart.y) <= proximityPx) {
          const aMinX = Math.min(aStart.x, aEnd.x)
          const aMaxX = Math.max(aStart.x, aEnd.x)
          const bMinX = Math.min(bStart.x, bEnd.x)
          const bMaxX = Math.max(bStart.x, bEnd.x)
          if (Math.max(aMinX, bMinX) < Math.min(aMaxX, bMaxX)) return true
        }
      } else if (aIsV && bIsV) {
        if (Math.abs(aStart.x - bStart.x) <= proximityPx) {
          const aMinY = Math.min(aStart.y, aEnd.y)
          const aMaxY = Math.max(aStart.y, aEnd.y)
          const bMinY = Math.min(bStart.y, bEnd.y)
          const bMaxY = Math.max(bStart.y, bEnd.y)
          if (Math.max(aMinY, bMinY) < Math.min(aMaxY, bMaxY)) return true
        }
      }
    }
  }
  return false
}

export function getSegmentOrientation(
  points: IPoint[],
  segmentIndex: number
): "H" | "V" {
  const start = points[segmentIndex]
  const end = points[segmentIndex + 1]
  if (!start || !end) return "H"
  return Math.abs(start.y - end.y) <= ORIENTATION_TOLERANCE_PX ? "H" : "V"
}

export function getSegmentKind(
  segmentIndex: number,
  totalPoints: number
): SegmentKind {
  if (segmentIndex === 0) return "source-terminal"
  if (segmentIndex === totalPoints - 2) return "target-terminal"
  return "inner"
}

export function getSegmentEffectiveLength(
  points: IPoint[],
  segmentIndex: number,
  stubLength: number
): number {
  const start = points[segmentIndex]
  const end = points[segmentIndex + 1]
  if (!start || !end) return 0

  const rawLength = Math.abs(end.x - start.x) + Math.abs(end.y - start.y)
  let deduction = 0
  if (segmentIndex === 0) deduction += stubLength
  if (segmentIndex === points.length - 2) deduction += stubLength

  return Math.max(0, rawLength - deduction)
}

export function isLengthEditableAtZoom(
  canvasLength: number,
  minLength: number,
  zoom: number
): boolean {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  return canvasLength >= minLength || canvasLength * safeZoom >= minLength
}

export function getStubExit(
  nodePoint: IPoint,
  position: Position,
  stubLength: number
): IPoint {
  switch (position) {
    case Position.Right:
      return { x: nodePoint.x + stubLength, y: nodePoint.y }
    case Position.Left:
      return { x: nodePoint.x - stubLength, y: nodePoint.y }
    case Position.Bottom:
      return { x: nodePoint.x, y: nodePoint.y + stubLength }
    case Position.Top:
    default:
      return { x: nodePoint.x, y: nodePoint.y - stubLength }
  }
}

export function getBendHandlePosition(
  points: IPoint[],
  segmentIndex: number,
  _sourcePosition: Position,
  _targetPosition: Position,
  _stubLength: number
): IPoint {
  const totalPoints = points.length
  if (totalPoints < 2) return { x: 0, y: 0 }

  const start = points[segmentIndex]
  const end = points[segmentIndex + 1]

  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  }
}

export function getBendableSegments(
  points: IPoint[],
  sourcePosition: Position,
  targetPosition: Position,
  stubLength: number,
  minLength: number,
  zoom = 1
): BendHandle[] {
  const collapsed = collapseCollinearPoints(points)
  if (collapsed.length < 2) return []

  const handles: BendHandle[] = []
  for (let i = 0; i < collapsed.length - 1; i++) {
    const effectiveLength = getSegmentEffectiveLength(collapsed, i, stubLength)
    if (isLengthEditableAtZoom(effectiveLength, minLength, zoom)) {
      handles.push({
        segmentIndex: i,
        position: getBendHandlePosition(
          collapsed,
          i,
          sourcePosition,
          targetPosition,
          stubLength
        ),
        orientation: getSegmentOrientation(collapsed, i),
        kind: getSegmentKind(i, collapsed.length),
      })
    }
  }

  return handles
}

export function applyInnerSegmentBend(
  points: IPoint[],
  segmentIndex: number,
  delta: IPoint,
  snapGrid: number
): IPoint[] {
  const collapsed = collapseCollinearPoints(points)
  if (collapsed.length < 2) return points
  if (segmentIndex < 0 || segmentIndex >= collapsed.length - 1) return points
  points = collapsed

  const lastSegmentIndex = points.length - 2
  const orientation = getSegmentOrientation(points, segmentIndex)
  const updated = [...points]

  const adjSourceSame =
    segmentIndex > 0 &&
    getSegmentOrientation(points, segmentIndex - 1) === orientation
  const adjTargetSame =
    segmentIndex < lastSegmentIndex &&
    getSegmentOrientation(points, segmentIndex + 1) === orientation

  const finalizePoints = (candidate: IPoint[]): IPoint[] => {
    const deduplicated = removeDuplicatePoints(candidate)
    if (deduplicated.length < 2) return deduplicated

    return deduplicated
  }

  if (orientation === "H") {
    const newY = snapToGrid(points[segmentIndex].y + delta.y, snapGrid)
    updated[segmentIndex] = { x: updated[segmentIndex].x, y: newY }
    updated[segmentIndex + 1] = { x: updated[segmentIndex + 1].x, y: newY }

    if (adjSourceSame && adjTargetSame) {
      return finalizePoints([
        ...updated.slice(0, segmentIndex),
        points[segmentIndex],
        updated[segmentIndex],
        updated[segmentIndex + 1],
        points[segmentIndex + 1],
        ...updated.slice(segmentIndex + 2),
      ])
    }

    if (adjTargetSame) {
      return finalizePoints([
        ...updated.slice(0, segmentIndex + 2),
        points[segmentIndex + 1],
        ...updated.slice(segmentIndex + 2),
      ])
    }

    if (adjSourceSame) {
      return finalizePoints([
        ...updated.slice(0, segmentIndex),
        points[segmentIndex],
        ...updated.slice(segmentIndex),
      ])
    }
  } else {
    const newX = snapToGrid(points[segmentIndex].x + delta.x, snapGrid)
    updated[segmentIndex] = { x: newX, y: updated[segmentIndex].y }
    updated[segmentIndex + 1] = { x: newX, y: updated[segmentIndex + 1].y }

    if (adjSourceSame && adjTargetSame) {
      return finalizePoints([
        ...updated.slice(0, segmentIndex),
        points[segmentIndex],
        updated[segmentIndex],
        updated[segmentIndex + 1],
        points[segmentIndex + 1],
        ...updated.slice(segmentIndex + 2),
      ])
    }

    if (adjTargetSame) {
      return finalizePoints([
        ...updated.slice(0, segmentIndex + 2),
        points[segmentIndex + 1],
        ...updated.slice(segmentIndex + 2),
      ])
    }

    if (adjSourceSame) {
      return finalizePoints([
        ...updated.slice(0, segmentIndex),
        points[segmentIndex],
        ...updated.slice(segmentIndex),
      ])
    }
  }

  return finalizePoints(updated)
}

export function computeToolbarPosition(
  pathMiddlePosition: IPoint,
  isMiddlePathHorizontal: boolean
): IPoint {
  return {
    x: pathMiddlePosition.x + (isMiddlePathHorizontal ? 0 : -52),
    y: pathMiddlePosition.y + (isMiddlePathHorizontal ? -64 : 0),
  }
}

export function applyTerminalSegmentBend(
  points: IPoint[],
  handle: BendHandle,
  delta: IPoint,
  sourcePosition: Position,
  targetPosition: Position,
  stubLength: number,
  snapGrid: number
): IPoint[] {
  if (points.length < 2) return points

  const orientation = getSegmentOrientation(points, handle.segmentIndex)

  if (handle.kind === "source-terminal") {
    points = collapseCollinearPoints(points)
    const stubExit = getStubExit(points[0], sourcePosition, stubLength)
    const isSingleSegment = points.length === 2
    const targetStubExit = isSingleSegment
      ? getStubExit(points[points.length - 1], targetPosition, stubLength)
      : null
    const updatedPoints = [...points]

    if (orientation === "H") {
      const newY = snapToGrid(stubExit.y + delta.y, snapGrid)
      if (isSingleSegment && targetStubExit) {
        return removeDuplicatePoints([
          points[0],
          stubExit,
          { x: stubExit.x, y: newY },
          { x: targetStubExit.x, y: newY },
          targetStubExit,
          points[1],
        ])
      }
      updatedPoints[1] = { x: updatedPoints[1].x, y: newY }
      return removeDuplicatePoints([
        points[0],
        stubExit,
        { x: stubExit.x, y: newY },
        updatedPoints[1],
        ...updatedPoints.slice(2),
        points[points.length - 1],
      ])
    }

    const newX = snapToGrid(stubExit.x + delta.x, snapGrid)
    if (isSingleSegment && targetStubExit) {
      return removeDuplicatePoints([
        points[0],
        stubExit,
        { x: newX, y: stubExit.y },
        { x: newX, y: targetStubExit.y },
        targetStubExit,
        points[1],
      ])
    }
    updatedPoints[1] = { x: newX, y: updatedPoints[1].y }
    return removeDuplicatePoints([
      points[0],
      stubExit,
      { x: newX, y: stubExit.y },
      updatedPoints[1],
      ...updatedPoints.slice(2),
      points[points.length - 1],
    ])
  }

  if (handle.kind === "target-terminal") {
    points = collapseCollinearPoints(points)
    const lastIdx = points.length - 1
    const lastSegIdx = points.length - 2
    const stubExit = getStubExit(points[lastIdx], targetPosition, stubLength)

    if (orientation === "H") {
      const newY = snapToGrid(stubExit.y + delta.y, snapGrid)
      const updatedPoints = [...points]
      updatedPoints[lastSegIdx] = { x: updatedPoints[lastSegIdx].x, y: newY }
      const leading = updatedPoints.slice(0, lastSegIdx + 1)
      return removeDuplicatePoints([
        points[0],
        ...leading,
        { x: stubExit.x, y: newY },
        stubExit,
        points[lastIdx],
      ])
    }

    const newX = snapToGrid(stubExit.x + delta.x, snapGrid)
    const updatedPoints = [...points]
    updatedPoints[lastSegIdx] = { x: newX, y: updatedPoints[lastSegIdx].y }
    const leading = updatedPoints.slice(0, lastSegIdx + 1)
    return removeDuplicatePoints([
      points[0],
      ...leading,
      { x: newX, y: stubExit.y },
      stubExit,
      points[lastIdx],
    ])
  }

  return points
}
