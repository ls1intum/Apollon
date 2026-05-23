import { IPoint } from "@/edges/types"

type SegmentOrientation = "H" | "V"

/**
 * Calculates the new array of waypoints when a specific orthogonal segment is dragged.
 * It enforces axis-alignment: horizontal segments only move vertically,
 * and vertical segments only move horizontally.
 *
 * @param routeSegments The current full array of points representing the edge path
 * @param segmentIndex The index of the segment being dragged (start point of segment)
 * @param pointerDelta The distance the pointer has moved {x, y}
 * @returns A new array of points representing the updated waypoints
 */
export function calculateDraggedWaypoints(
  routeSegments: IPoint[],
  segmentIndex: number,
  pointerDelta: IPoint
): IPoint[] {
  if (
    routeSegments.length < 2 ||
    segmentIndex < 0 ||
    segmentIndex >= routeSegments.length - 1
  ) {
    return routeSegments
  }

  // Determine segment orientation
  const start = routeSegments[segmentIndex]
  const end = routeSegments[segmentIndex + 1]
  const orientation: SegmentOrientation = start.y === end.y ? "H" : "V"

  // We are going to build a new set of waypoints based on the drag
  const newWaypoints = [...routeSegments]

  // If H, we translate Y. If V, we translate X.
  const deltaX = orientation === "V" ? pointerDelta.x : 0
  const deltaY = orientation === "H" ? pointerDelta.y : 0

  // The dragged segment points
  const draggedStart = {
    x: start.x + deltaX,
    y: start.y + deltaY,
  }
  const draggedEnd = {
    x: end.x + deltaX,
    y: end.y + deltaY,
  }

  newWaypoints[segmentIndex] = draggedStart
  newWaypoints[segmentIndex + 1] = draggedEnd

  // Adjacent segments stretch automatically: a dragged H segment only changes
  // Y on its endpoints, so the preceding/following V segments still share an X
  // with their neighbours. Only the boundary cases (first/last segment, which
  // are anchored to a fixed node port) need an explicit bridge.

  const result: IPoint[] = []

  for (let i = 0; i < newWaypoints.length; i++) {
    const pt = newWaypoints[i]

    if (i === segmentIndex && segmentIndex === 0) {
      // Dragging the first segment. Insert a bridge from the source port to the dragged segment
      // The original source port is routeSegments[0]
      const sourcePort = routeSegments[0]
      result.push(sourcePort)
      // Bridge corner
      if (orientation === "H") {
        // Dragged segment is H (moved Y). Bridge goes V then H?
        // Wait, if dragged segment is H, it means the first segment was H.
        // It moved vertically. So we need a V segment from source to the new Y.
        result.push({ x: sourcePort.x, y: pt.y })
      } else {
        result.push({ x: pt.x, y: sourcePort.y })
      }
    }

    result.push(pt)

    if (i === segmentIndex + 1 && segmentIndex === routeSegments.length - 2) {
      // Dragging the last segment. Insert a bridge to the target port
      const targetPort = routeSegments[routeSegments.length - 1]
      // Bridge corner
      if (orientation === "H") {
        result.push({ x: targetPort.x, y: pt.y })
      } else {
        result.push({ x: pt.x, y: targetPort.y })
      }
      result.push(targetPort)
      // skip the last point in the loop since we already added it
      break
    }
  }

  // Deduplicate points (remove zero-length segments)
  const cleanResult: IPoint[] = []
  for (let i = 0; i < result.length; i++) {
    if (
      i === 0 ||
      result[i].x !== cleanResult[cleanResult.length - 1].x ||
      result[i].y !== cleanResult[cleanResult.length - 1].y
    ) {
      cleanResult.push(result[i])
    }
  }

  // We should strip the first and last points, as they are fixed node ports
  // The userWaypoints only store the *intermediate* inflection points.
  return cleanResult.slice(1, -1)
}
