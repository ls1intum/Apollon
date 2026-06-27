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

/**
 * Whether a flow-space length is long enough to host an interactive handle,
 * judged by its ON-SCREEN size. Screen-based so the rule matches what the user
 * sees: zooming in always reveals more handles (a short segment becomes
 * editable once it is `minScreenLength` px long on screen) and never hides
 * them. `minScreenLength` is a screen-px budget (handle size + clearance).
 */
export function isLengthEditableAtZoom(
  canvasLength: number,
  minScreenLength: number,
  zoom: number
): boolean {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  return canvasLength * safeZoom >= minScreenLength
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
  segmentIndex: number
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

/**
 * Bend handles for every segment with enough ON-SCREEN room to host one.
 *
 * The "safe area" next to each node (`safeAreaPx`) is excluded: a terminal
 * segment loses that length at its node end, both for deciding whether a handle
 * fits AND for where the handle sits. The handle is placed at the midpoint of
 * the *bendable* region (past the safe area), never inside the locked stub —
 * so dragging always grabs a real, bendable slice instead of a detached sliver
 * hugging the node.
 *
 * Availability is judged on the bendable region's ON-SCREEN length
 * (bendable * zoom >= `minSegmentScreenLength`), so zooming in reveals handles
 * on shorter segments and never hides them.
 */
export function getBendableSegments(
  points: IPoint[],
  _sourcePosition: Position,
  _targetPosition: Position,
  safeAreaPx: number,
  minSegmentScreenLength: number,
  zoom = 1
): BendHandle[] {
  const collapsed = collapseCollinearPoints(points)
  if (collapsed.length < 2) return []

  const lastSegment = collapsed.length - 2
  const handles: BendHandle[] = []
  for (let i = 0; i <= lastSegment; i++) {
    const start = collapsed[i]
    const end = collapsed[i + 1]
    const rawLength = Math.abs(end.x - start.x) + Math.abs(end.y - start.y)
    if (rawLength <= 0) continue

    // Exclude the safe area at any terminal end of this segment.
    const safeStart = i === 0 ? safeAreaPx : 0
    const safeEnd = i === lastSegment ? safeAreaPx : 0
    const bendableLength = rawLength - safeStart - safeEnd
    if (bendableLength <= 0) continue
    if (!isLengthEditableAtZoom(bendableLength, minSegmentScreenLength, zoom)) {
      continue
    }

    // Centre of the bendable region (offset past the safe area), in flow space.
    const centreFromStart = safeStart + bendableLength / 2
    const t = centreFromStart / rawLength
    handles.push({
      segmentIndex: i,
      position: {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      },
      orientation: getSegmentOrientation(collapsed, i),
      kind: getSegmentKind(i, collapsed.length),
    })
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
