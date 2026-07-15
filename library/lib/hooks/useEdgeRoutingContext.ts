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
 * must not run through, and what it must not be drawn on top of.
 *
 * Committed edges are routed by the central solver (see computeAllEdgeGeometry);
 * this hook now serves the live reconnect preview (ReconnectConnectionLine),
 * feeding it the SAME obstacles and neighbour polylines the solver sees — the
 * neighbour set is read from the solver-populated geometry registry — so the
 * line you drag matches the route you get on release. A preview that skipped the
 * router and drew a plain smooth-step curve ignored every node, margin and edge
 * in the way; a preview that lies about the result is worse than no preview.
 *
 * `selfId` is the edge being routed, or `undefined` for a connection that does
 * not exist yet. It controls which neighbours this edge yields to:
 *
 *  - An existing edge yields only to LOWER-id neighbours. That total order turns
 *    "who routes around whom" into a DAG — the lowest-id edge never moves and the
 *    rest settle around it — so two crossing edges cannot spend forever dodging
 *    each other.
 *  - A brand-new edge has no id yet and is, by construction, the newcomer: it
 *    yields to everything already on the canvas.
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
   * Whether `otherId` is a TRUE sibling of this edge: one that leaves the very
   * same connection point, and so cannot help but share geometry with us.
   *
   * Four interfaces hanging off one component all leave the same handle. Their
   * lines are coincident at that point by construction, and running them down a
   * common bus before they split is not a defect — it is how the diagram is meant
   * to look. Price that as an overlap and each sibling spends the search fleeing
   * the others, which is how a tidy fan becomes spaghetti.
   *
   * But sharing a NODE is not sharing a POINT, and that distinction is the whole
   * rule. Two edges attached to different handles of the same class start in
   * different places and have no excuse to be drawn on top of one another — yet a
   * node-level test waves them through, and they overlap. So the test is the
   * connection point: same node AND same handle.
   *
   * Edges between the SAME PAIR are never exempt, however they attach: they run
   * coincident along their whole length, one hides the other, and an aggregation
   * drawn over an association is a semantic misread, not merely an ugly one.
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

  // Hand back the SAME arrays until their CONTENTS change, not their identity.
  //
  // Routing is a graph search, and it should be rare: an edge's route depends on
  // its endpoints, the nodes near it and the edges it must not cross, so when none
  // of those changed neither did the answer. But the arrays above are rebuilt every
  // render, so their identity churns constantly — the dragged node moves, `nodes`
  // gets a new reference, and every edge recomputes `obstacles` into a fresh array
  // even where the obstacle SET around it is unchanged. Feeding those churning
  // arrays straight into the routing memo would re-run the search for every edge on
  // every frame of any drag.
  //
  // So we stabilise by CONTENT: `useStableValue` keeps the previous array reference
  // while the new one is content-equal, so downstream identity changes only for the
  // edges a change can actually have moved. This used to be a `useMemo` keyed on a
  // string digest with a suppressed `exhaustive-deps` — but under the React Compiler
  // a memo whose declared deps do not match what it returns deopts the WHOLE hook
  // (the compiler cannot prove it is preserved, so it optimises none of it). A
  // ref-compare hook has no deps array to reject, keeps this hook optimizable, and
  // is cheaper than allocating a digest string every render. The perf suite
  // (`edge-routing.spec.ts`) holds the line at the compiled artifact.
  const stableObstacles = useStableValue(obstacles, obstaclesEqual)
  const stableNeighbors = useStableValue(neighborEdges, polylinesEqual)

  return {
    obstacles: stableObstacles,
    neighborEdges: stableNeighbors,
  }
}
