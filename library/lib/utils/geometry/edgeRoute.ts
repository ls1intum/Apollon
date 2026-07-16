import { Position } from "@xyflow/react"
import { IPoint, tryFindStraightPath } from "@/edges/Connection"
import {
  routeOrthogonalPath,
  routeCrossesHardObstacle,
  removeDuplicatePoints,
} from "@/utils/edgeUtils"
import { routeConflictsWithNeighborEdges } from "@/utils/geometry/orthogonalRouter"
import type { ObstacleRect } from "@/utils/geometry/obstacles"

/**
 * Everything the router needs to turn one edge's resolved endpoints into a
 * polyline — the DEFAULT route for an edge nobody has hand-edited. Pure and
 * side-effect free. This is the single routing primitive shared by the per-edge
 * hook (`useStepPathEdge`) and the central solver, so the drag preview and the
 * committed edge can never diverge.
 */
export type StepEdgeRouteParams = {
  enableStraightPath: boolean
  /** Adjusted (padding-applied) source connection point. */
  adjustedSource: IPoint
  /** Adjusted (padding-applied) target connection point. */
  adjustedTarget: IPoint
  sourcePosition: Position
  targetPosition: Position
  padding: number
  /** Whole-pixel-rounded raw endpoints, for the straight-path handle coords. */
  rounded: {
    sourceX: number
    sourceY: number
    targetX: number
    targetY: number
  }
  sourceAbsolutePosition: IPoint
  targetAbsolutePosition: IPoint
  sourceSize: { width: number; height: number }
  targetSize: { width: number; height: number }
  obstacles: readonly ObstacleRect[]
  neighborEdges: readonly IPoint[][]
}

export function routeStepEdge(p: StepEdgeRouteParams): IPoint[] {
  const routeSource = { x: p.adjustedSource.x, y: p.adjustedSource.y }
  const routeTarget = { x: p.adjustedTarget.x, y: p.adjustedTarget.y }

  if (p.enableStraightPath) {
    const straightPathPoints = tryFindStraightPath(
      {
        position: {
          x: p.sourceAbsolutePosition.x,
          y: p.sourceAbsolutePosition.y,
        },
        width: p.sourceSize.width,
        height: p.sourceSize.height,
        direction: p.sourcePosition,
      },
      {
        position: {
          x: p.targetAbsolutePosition.x,
          y: p.targetAbsolutePosition.y,
        },
        width: p.targetSize.width,
        height: p.targetSize.height,
        direction: p.targetPosition,
      },
      p.padding,
      {
        sourceX: p.rounded.sourceX,
        sourceY: p.rounded.sourceY,
        targetX: p.rounded.targetX,
        targetY: p.rounded.targetY,
      }
    )
    // A straight shot is only allowed when it runs clear of every solid node AND
    // is not drawn on top of / across a neighbouring edge.
    if (
      straightPathPoints !== null &&
      !routeCrossesHardObstacle(straightPathPoints, p.obstacles) &&
      !routeConflictsWithNeighborEdges(straightPathPoints, p.neighborEdges)
    ) {
      return removeDuplicatePoints(straightPathPoints)
    }
  }

  return routeOrthogonalPath(
    routeSource,
    routeTarget,
    p.sourcePosition,
    p.targetPosition,
    p.obstacles,
    p.neighborEdges
  )
}
