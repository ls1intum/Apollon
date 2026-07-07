import { useCallback } from "react"
import { useReactFlow, type Rect, type XYPosition } from "@xyflow/react"
import { getConnectionMode } from "@/utils/connectionModes"

/** Distance from a point to a rectangle (0 when the point is inside it). */
const distanceToRect = (p: XYPosition, r: Rect): number => {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.width))
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.height))
  return Math.hypot(dx, dy)
}

// Half-size of the box hit-tested around a drop point; a drop must land within
// this of a node's bounding box to attach. Kept generous so a drop just outside
// a rounded shape still connects: an oval's box hugs the curve at the cardinals
// but bulges out at the diagonals, so too small a value would reject
// near-cardinal drops that visually sit on the shape.
const DROP_HIT_RADIUS_PX = 11

export type FreeformDropTarget = { id: string; type?: string; rect: Rect }

/**
 * Resolve which node a freeform connection drop lands on, and its rectangle.
 *
 * Shared by the connection commit (`useConnect.onConnectEnd`) and the
 * connection ghost preview (`ReconnectConnectionLine`) so the preview never
 * promises a target the drop won't honour. Returns the nearest intersecting
 * node to the drop (distance to its box, 0 when inside it), skipping the drag's
 * own source, ties broken by z order, so a drop that merely grazes a
 * neighbour's box still attaches to the node it is over. Null over empty canvas.
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
      }).filter((node) => node.width != null && node.height != null)
      if (hits.length === 0) return null

      // Prefer a node other than the drag's own source; only fall back to the
      // source when it is the sole candidate (a body-drop self-loop).
      const nonSource = hits.filter((node) => node.id !== fromNodeId)
      const pool = nonSource.length > 0 ? nonSource : hits

      let best: FreeformDropTarget | null = null
      let bestDistance = Infinity
      // Iterate low→high z so, on a distance tie, the later (top-most) node wins.
      pool.forEach((node) => {
        // Legends, annotations and swimlane partitions are not targets.
        if (getConnectionMode(node.type) === "none") return
        const internal = getInternalNode(node.id)
        if (!internal) return
        const rect: Rect = {
          x: internal.internals.positionAbsolute.x,
          y: internal.internals.positionAbsolute.y,
          width: node.width!,
          height: node.height!,
        }
        const distance = distanceToRect(point, rect)
        if (distance <= bestDistance) {
          bestDistance = distance
          best = { id: node.id, type: node.type, rect }
        }
      })
      return best
    },
    [getIntersectingNodes, getInternalNode]
  )
}
