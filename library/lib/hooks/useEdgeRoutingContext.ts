import { useMemo } from "react"
import type { Node } from "@xyflow/react"
import { EDGES } from "@/constants"
import type { IPoint } from "@/edges/Connection"
import { useDiagramStore, useEdgeGeometryStore } from "@/store/context"
import type { ObstacleRect } from "@/utils/geometry/obstacles"
import {
  getEdgeObstacles,
  getContainerBorderPolylines,
} from "@/utils/geometry/obstacles"
import { useStableValue } from "./useStableValue"

/** Content equality for obstacle rects: same set, same geometry, same softness. */
const obstaclesEqual = (a: ObstacleRect[], b: ObstacleRect[]): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    if (
      x.id !== y.id ||
      x.x !== y.x ||
      x.y !== y.y ||
      x.width !== y.width ||
      x.height !== y.height ||
      !!x.soft !== !!y.soft
    ) {
      return false
    }
  }
  return true
}

/** Content equality for neighbour polylines: same lines, same points, in order. */
const polylinesEqual = (a: IPoint[][], b: IPoint[][]): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const p = a[i]
    const q = b[i]
    if (p.length !== q.length) return false
    for (let j = 0; j < p.length; j++) {
      if (p[j].x !== q[j].x || p[j].y !== q[j].y) return false
    }
  }
  return true
}

/**
 * Everything the router needs to know about the world around one edge: what it
 * must not run through, and what it must not be drawn on top of. Committed edges
 * are routed by the central solver; this hook serves the live reconnect preview
 * (ReconnectConnectionLine) the SAME obstacles and neighbour polylines (read from
 * the solver-populated geometry registry) so the drag matches the route on release.
 *
 * `selfId` is the edge being routed, or `undefined` for a connection that does not
 * exist yet. It controls which neighbours this edge yields to:
 *
 *  - An existing edge yields only to LOWER-id neighbours. That total order turns
 *    "who routes around whom" into a DAG (lowest id never moves, the rest settle
 *    around it) so two crossing edges cannot spend forever dodging each other.
 *  - A brand-new edge has no id yet and is the newcomer: it yields to everything.
 */
export const useEdgeRoutingContext = ({
  selfId,
  nodes,
  sourceId,
  targetId,
  sourcePoint,
  targetPoint,
}: {
  selfId?: string
  nodes: Node[]
  sourceId: string
  targetId: string
  sourcePoint: IPoint
  targetPoint: IPoint
}): {
  obstacles: ObstacleRect[]
  neighborEdges: IPoint[][]
} => {
  const geometryById = useEdgeGeometryStore((state) => state.geometryById)
  const edges = useDiagramStore((state) => state.edges)
  const { x: sx, y: sy } = sourcePoint
  const { x: tx, y: ty } = targetPoint

  /**
   * Whether `otherId` is a TRUE sibling: leaves the very same connection point
   * (same node AND same handle), so it is coincident with us by construction and
   * may share a bus rather than being priced as an overlap to flee. Sharing a NODE
   * is not enough — different handles start apart and must not overlap. Edges
   * between the SAME PAIR are never exempt: they run coincident end to end.
   */
  const isSibling = useMemo(() => {
    const byId = new Map(edges.map((edge) => [edge.id, edge]))
    const self = selfId ? byId.get(selfId) : undefined

    return (otherId: string): boolean => {
      const other = byId.get(otherId)
      if (!self || !other) return false

      // Two edges between the same pair are duplicates, not siblings.
      const sharedNodes = ([other.source, other.target] as string[]).filter(
        (n) => [sourceId, targetId].includes(n)
      ).length
      if (sharedNodes !== 1) return false

      const ends = [
        [self.source, self.sourceHandle],
        [self.target, self.targetHandle],
      ] as const
      const otherEnds = [
        [other.source, other.sourceHandle],
        [other.target, other.targetHandle],
      ] as const

      return ends.some(([node, handle]) =>
        otherEnds.some(
          ([otherNode, otherHandle]) =>
            node === otherNode && handle === otherHandle
        )
      )
    }
  }, [edges, selfId, sourceId, targetId])

  const obstacles = useMemo(
    () =>
      getEdgeObstacles(
        nodes,
        sourceId,
        targetId,
        { x: sx, y: sy },
        { x: tx, y: ty }
      ),
    [nodes, sourceId, targetId, sx, sy, tx, ty]
  )

  const neighborEdges = useMemo<IPoint[][]>(() => {
    // A container's frame is one more line not to lie on: the edge must cross out of
    // its own package but never be drawn along it.
    const borders = getContainerBorderPolylines(nodes, sourceId, targetId)

    // Neighbours are gathered from a box around this edge's ENDPOINTS, never from
    // its own route — routing must not depend on the thing it produces.
    const pad = EDGES.STUB_LENGTH * 6
    const minX = Math.min(sx, tx) - pad
    const maxX = Math.max(sx, tx) + pad
    const minY = Math.min(sy, ty) - pad
    const maxY = Math.max(sy, ty) + pad

    const neighbors: IPoint[][] = []
    for (const [otherId, polyline] of Object.entries(geometryById)) {
      if (otherId === selfId || polyline.length < 2) continue
      if (selfId !== undefined && otherId >= selfId) continue
      // A true sibling — one leaving the very same connection point — may share
      // a bus with us; it could not avoid us if it tried.
      if (isSibling(otherId)) continue
      const inRange = polyline.some(
        (p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY
      )
      if (inRange) neighbors.push(polyline)
    }

    neighbors.push(...borders)
    return neighbors
  }, [
    geometryById,
    selfId,
    nodes,
    sourceId,
    targetId,
    sx,
    sy,
    tx,
    ty,
    isSibling,
  ])

  // Stabilise by CONTENT: `nodes` gets a fresh reference every drag frame, so the
  // arrays above churn identity even when the obstacle/neighbour SET is unchanged.
  // `useStableValue` keeps the previous reference while content is equal, so the
  // downstream routing search only re-runs for edges a change can actually move.
  const stableObstacles = useStableValue(obstacles, obstaclesEqual)
  const stableNeighbors = useStableValue(neighborEdges, polylinesEqual)

  return {
    obstacles: stableObstacles,
    neighborEdges: stableNeighbors,
  }
}
