import { Position } from "@xyflow/react"
import { IPoint } from "@/edges/Connection"
import { removeDuplicatePoints } from "@/utils/edgeUtils"
import { EDGES } from "@/constants"

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
  /** Flow-space room this handle has along its segment; the renderer sizes the
   * handle from this rather than deleting it when a fixed size would not fit. */
  bendableLength: number
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

/** Smallest grid-aligned length that strictly clears the arm-overlap width, so a jog's
 * moved arm is not read as a collapsed arm by the release cleanup (which uses `<=`).
 * Shared by the jog placement and the handle-existence test so the two cannot drift. */
const terminalArmFloorPx = (grid: number): number => {
  const g = grid > 0 ? grid : 1
  return Math.ceil((EDGES.ORTHOGONAL_ARM_OVERLAP_PX + 1) / g) * g
}

/** Shortest terminal segment that can still bend into a non-degenerate S-jog: below
 * `MIN_STUB_LENGTH + armFloor` the stub and the moved arm cannot both clear their
 * floors, the cleanup reads the jog as a spike, and the edge snaps straight — so the
 * handle is withheld and the endpoint reconnect target owns that stub instead. */
const terminalBendFloorPx = (): number =>
  EDGES.MIN_STUB_LENGTH + terminalArmFloorPx(EDGES.BEND_SNAP_GRID_PX)

/**
 * A bend handle for every segment that has room to bend. Inner segments always get
 * one (the renderer shrinks it to fit, so zoom changes a handle's SIZE, not its
 * EXISTENCE). A terminal segment gets one only while it is long enough to host a
 * non-cramped bend — see `terminalBendFloorPx`.
 *
 * The stub-inversion rule is enforced on the drag itself (`getBendLaneBounds`
 * clamps the lane), not by withholding handles. The safe area survives only as a
 * placement bias — the handle sits past it when there is room.
 */
export function getBendableSegments(
  points: IPoint[],
  safeAreaPx: number
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

    // Reserve the near-endpoint portion of a TERMINAL segment for that endpoint's
    // reconnect target, which is drawn on top and would swallow a handle placed
    // there. Capped at half the segment so a short stub still biases the handle
    // outward. `nearestHandleReach` (GenericEdge) caps the target at the same edge,
    // so the two never overlap.
    const reserveStart = i === 0 ? Math.min(safeAreaPx, rawLength / 2) : 0
    const reserveEnd =
      i === lastSegment ? Math.min(safeAreaPx, rawLength / 2) : 0
    const bendRegion = rawLength - reserveStart - reserveEnd

    // Gated on the segment's FULL length — what the jog math operates on — not the
    // reserved bend region.
    const kind = getSegmentKind(i, collapsed.length)
    const isTerminal = kind !== "inner"
    const isLoneSegment = lastSegment === 0
    if (isTerminal && !isLoneSegment && rawLength < terminalBendFloorPx()) {
      continue
    }
    // A LONE segment has an endpoint at BOTH ends, each of which owns its half for
    // reconnecting and repositioning — the primary edge interactions, present on every
    // edge. A centred bend handle between them starves both to nothing on a short edge
    // (the reconnect targets, drawn on top, cap against it). So the endpoints win: the
    // lone handle is withheld unless the region left BETWEEN the two endpoint reserves is
    // big enough for a usable, non-overlapping handle. A longer lone edge keeps its
    // handle in the clear middle; a short one is fully owned by its two grips.
    if (isLoneSegment && bendRegion < EDGES.BEND_HANDLE_MIN_SCREEN_LENGTH_PX) {
      continue
    }

    const fitsPastSafeArea = bendRegion > 0
    const centreFromStart = fitsPastSafeArea
      ? reserveStart + bendRegion / 2
      : rawLength / 2

    const t = centreFromStart / rawLength
    handles.push({
      segmentIndex: i,
      position: {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      },
      orientation: getSegmentOrientation(collapsed, i),
      kind,
      bendableLength: fitsPastSafeArea ? bendRegion : rawLength,
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

/**
 * Where, along a terminal segment's axis, to put the jog that reconnects a dragged
 * segment to its PINNED endpoint. The segment cannot move wholesale — the port fixes
 * its entry orientation — so a perpendicular drag forms an S: approach → moved segment
 * → jog → port stub. Both sides need room: the stub must stay >= MIN_STUB_LENGTH (else
 * release validation rejects the entry axis) and the moved segment must clear
 * ORTHOGONAL_ARM_OVERLAP_PX (else the release-time cleanup reads it as a collapsed arm
 * and throws the hand-drawn path away). Placing the jog at the full stub exit only
 * works while the corner sits further out than that; at ~STUB_LENGTH they coincide and
 * the drag collapses inward or spikes outward. So shrink the port stub just enough.
 */
function computeTerminalJogCoordinate(
  endpointCoord: number,
  cornerCoord: number,
  stubLength: number,
  snapGrid: number
): number {
  const grid = snapGrid > 0 ? snapGrid : 1
  // Strictly MORE than the arm-overlap width (the cleanup uses `<=`), snapped up
  // to the grid so the resulting segment lands on a grid line.
  const armFloor = terminalArmFloorPx(grid)
  const minStub = Math.min(EDGES.MIN_STUB_LENGTH, stubLength)

  const span = Math.abs(cornerCoord - endpointCoord)
  const direction = cornerCoord >= endpointCoord ? 1 : -1
  // Prefer the full stub; give it up only down to the point where the moved
  // segment still clears the arm-overlap floor, and never below the min stub.
  const stub = Math.min(stubLength, Math.max(minStub, span - armFloor))
  return snapToGrid(endpointCoord + direction * stub, snapGrid)
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
      // Reopen room between the port stub and the moved segment: on a stub-length
      // terminal segment the corner sits right on `stubExit`, and jogging there
      // would collapse (drag in) or spike (drag out).
      const jogX = computeTerminalJogCoordinate(
        points[0].x,
        updatedPoints[1].x,
        stubLength,
        snapGrid
      )
      updatedPoints[1] = { x: updatedPoints[1].x, y: newY }
      return removeDuplicatePoints([
        points[0],
        { x: jogX, y: points[0].y },
        { x: jogX, y: newY },
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
    const jogY = computeTerminalJogCoordinate(
      points[0].y,
      updatedPoints[1].y,
      stubLength,
      snapGrid
    )
    updatedPoints[1] = { x: newX, y: updatedPoints[1].y }
    return removeDuplicatePoints([
      points[0],
      { x: points[0].x, y: jogY },
      { x: newX, y: jogY },
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
      const cornerX = updatedPoints[lastSegIdx].x
      // Reopen room between the moved segment and the port stub (see the helper).
      const jogX = computeTerminalJogCoordinate(
        points[lastIdx].x,
        cornerX,
        stubLength,
        snapGrid
      )
      updatedPoints[lastSegIdx] = { x: cornerX, y: newY }
      const leading = updatedPoints.slice(0, lastSegIdx + 1)
      return removeDuplicatePoints([
        points[0],
        ...leading,
        { x: jogX, y: newY },
        { x: jogX, y: points[lastIdx].y },
        points[lastIdx],
      ])
    }

    const newX = snapToGrid(stubExit.x + delta.x, snapGrid)
    const updatedPoints = [...points]
    const cornerY = updatedPoints[lastSegIdx].y
    const jogY = computeTerminalJogCoordinate(
      points[lastIdx].y,
      cornerY,
      stubLength,
      snapGrid
    )
    updatedPoints[lastSegIdx] = { x: newX, y: cornerY }
    const leading = updatedPoints.slice(0, lastSegIdx + 1)
    return removeDuplicatePoints([
      points[0],
      ...leading,
      { x: newX, y: jogY },
      { x: points[lastIdx].x, y: jogY },
      points[lastIdx],
    ])
  }

  return points
}
