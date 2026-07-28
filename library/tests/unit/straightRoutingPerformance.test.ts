import { expect, it } from "vitest"
import {
  ConnectionMode,
  Position,
  type Edge,
  type InternalNode,
  type Node,
} from "@xyflow/react"
import { computeAllEdgeGeometry } from "@/utils/geometry/edgeGeometrySolver"
import {
  STRAIGHT_HOOK_EDGE_TYPES,
  STRAIGHT_PATH_STEP_EDGE_TYPES,
} from "@/edges/edgeRoutingBehavior"

it("keeps a crossing-heavy straight scene bounded to node-driven detours", () => {
  const count = 12
  const nodes = Array.from({ length: count * 2 }, (_, index) => {
    const side = index < count ? 0 : 1
    const slot = index % count
    const node = {
      id: `n${index}`,
      type: "syntaxTreeNonterminal",
      position: { x: side === 0 ? 220 : 1_020, y: -500 + slot * 140 },
      width: 120,
      height: 70,
      measured: { width: 120, height: 70 },
      data: {},
    } as Node
    const internal = {
      ...node,
      internals: {
        positionAbsolute: node.position,
        handleBounds: {
          source: [
            {
              id: null,
              type: "source",
              position: Position.Right,
              x: 120,
              y: 35,
              width: 1,
              height: 1,
            },
          ],
          target: [
            {
              id: null,
              type: "target",
              position: Position.Left,
              x: 0,
              y: 35,
              width: 1,
              height: 1,
            },
          ],
        },
      },
    } as unknown as InternalNode
    return { node, internal }
  })
  const edges: Edge[] = Array.from({ length: count }, (_, index) => ({
    id: `e${index}`,
    source: `n${index}`,
    target: `n${count + count - 1 - index}`,
    type: "SyntaxTreeLink",
    data: { points: [] },
  }))
  const result = computeAllEdgeGeometry({
    nodes: nodes.map(({ node }) => node),
    nodeLookup: new Map(nodes.map(({ node, internal }) => [node.id, internal])),
    connectionMode: ConnectionMode.Loose,
    edges,
    straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
    straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
  })
  expect(Object.keys(result.routeById)).toHaveLength(count)
  const segmentCounts = Object.values(result.routeById).map(
    (route) => route.length - 1
  )
  expect(segmentCounts).toContain(1)
  expect(Math.max(...segmentCounts)).toBeLessThanOrEqual(3)
})
