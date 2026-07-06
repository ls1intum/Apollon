import { useCallback } from "react"
import { useReactFlow, type Rect, type XYPosition } from "@xyflow/react"
import { getConnectionMode } from "@/utils/connectionModes"

// Half-size of the box hit-tested around a drop point. A drop must land within
// this of a node's bounding box to attach. Kept a little generous so a drop just
// outside a rounded shape still connects: an oval's box hugs the curve at the
// cardinals but bulges out at the diagonals, and too small a slop made the
// cardinals feel like dead zones while the diagonals connected.
const DROP_HIT_RADIUS_PX = 11

export type FreeformDropTarget = { id: string; type?: string; rect: Rect }

/**
 * Resolve which node a freeform connection drop lands on, and its rectangle.
 *
 * This is the SINGLE source of truth shared by the connection commit
 * (`useConnect.onConnectEnd`) and the new-connection ghost preview
 * (`ReconnectConnectionLine`), so the preview can never promise a target the
 * drop won't actually honour. Returns the top-most intersecting node (by z
 * order, skipping the drag's own source) within the hit slop, or null over
 * empty canvas.
 */
export function useFreeformDropTarget() {
  const { getIntersectingNodes, getInternalNode } = useReactFlow()
  return useCallback(
    (point: XYPosition, fromNodeId?: string): FreeformDropTarget | null => {
      const hits = getIntersectingNodes({
        x: point.x - DROP_HIT_RADIUS_PX,
        y: point.y - DROP_HIT_RADIUS_PX,
        width: DROP_HIT_RADIUS_PX * 2,
        height: DROP_HIT_RADIUS_PX * 2,
      })
      if (hits.length === 0) return null
      const top =
        hits.findLast((node) => node.id !== fromNodeId) ?? hits[hits.length - 1]
      const internal = getInternalNode(top.id)
      if (!internal || top.width == null || top.height == null) return null
      // Legends, annotations and swimlane partitions are not connection targets.
      if (getConnectionMode(top.type) === "none") return null
      return {
        id: top.id,
        type: top.type,
        rect: {
          x: internal.internals.positionAbsolute.x,
          y: internal.internals.positionAbsolute.y,
          width: top.width,
          height: top.height,
        },
      }
    },
    [getIntersectingNodes, getInternalNode]
  )
}
