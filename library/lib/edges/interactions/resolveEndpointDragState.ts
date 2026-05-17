/**
 * Shared endpoint-drag resolution.
 *
 * Both the rAF preview loop and the final pointer-up commit must produce
 * the same shape: snapped point, found handle (or null), and the obstacle
 * set built from the *prospective* endpoint nodes. Drift between preview
 * and commit logic is exactly the bug class this consolidates away.
 *
 * Pure-ish: depends only on the inputs and the two function dependencies
 * (handle finder, obstacle builder), so it's straightforward to unit test.
 */

import { getHandleAnchor } from "@/utils/edgeUtils"
import { getPositionOnCanvas } from "@/utils/nodeUtils"
import { buildEdgeObstacleSet } from "@/utils/geometry/edgeObstacles"
import type { BBox } from "@/utils/geometry/OrthogonalVisibilityGraph"
import type { IPoint } from "../types"

export type FoundHandle = { nodeId: string; handleId: string }

export type ResolvedEndpointDragState = {
  /** Where the dragged endpoint should snap to in flow coordinates. */
  snappedPoint: IPoint
  /** The handle the pointer is over, or null if dropped on empty canvas. */
  foundHandle: FoundHandle | null
  /** Obstacle set with the prospective endpoint node excluded. */
  obstacles: BBox[]
  /** Per-obstacle padding overrides, parallel to `obstacles`. */
  paddings: Array<number | undefined>
}

type HandleFinderResult = {
  handle: string | null
  node: { id: string } | null
}

export type ResolveEndpointDragParams = {
  /** Which endpoint is being dragged. */
  draggedEnd: "source" | "target"
  /** Pointer flow-space coordinate (used as the default snap target). */
  flowPoint: IPoint
  /** Pointer client-space coordinate (passed to the handle finder). */
  clientX: number
  clientY: number
  /** All nodes — used both for handle-anchor lookup and the obstacle set. */
  nodes: any[]
  /** The edge's persisted source node id (used if no new handle is found). */
  sourceNodeId: string | undefined | null
  /** The edge's persisted target node id (used if no new handle is found). */
  targetNodeId: string | undefined | null
  /** React Flow's handle finder. */
  findBestHandleAtClientPosition: (
    clientX: number,
    clientY: number
  ) => HandleFinderResult
}

export function resolveEndpointDragState(
  params: ResolveEndpointDragParams
): ResolvedEndpointDragState {
  const {
    draggedEnd,
    flowPoint,
    clientX,
    clientY,
    nodes,
    sourceNodeId,
    targetNodeId,
    findBestHandleAtClientPosition,
  } = params

  let snappedPoint: IPoint = { x: flowPoint.x, y: flowPoint.y }
  let foundHandle: FoundHandle | null = null

  const { handle, node } = findBestHandleAtClientPosition(clientX, clientY)
  if (node && handle) {
    const internalNode = nodes.find((n: any) => n.id === node.id)
    if (internalNode) {
      const absPos = getPositionOnCanvas(internalNode as any, nodes as any)
      const anchor = getHandleAnchor(
        {
          x: absPos.x,
          y: absPos.y,
          width: internalNode.measured?.width || internalNode.width || 0,
          height: internalNode.measured?.height || internalNode.height || 0,
        },
        handle
      )
      if (anchor) {
        snappedPoint = { x: anchor.x, y: anchor.y }
        foundHandle = { nodeId: node.id, handleId: handle }
      }
    }
  }

  const prospectiveSource =
    draggedEnd === "source" && foundHandle ? foundHandle.nodeId : sourceNodeId
  const prospectiveTarget =
    draggedEnd === "target" && foundHandle ? foundHandle.nodeId : targetNodeId

  const { obstacles, paddings } = buildEdgeObstacleSet(
    nodes,
    prospectiveSource,
    prospectiveTarget
  )

  return { snappedPoint, foundHandle, obstacles, paddings }
}
