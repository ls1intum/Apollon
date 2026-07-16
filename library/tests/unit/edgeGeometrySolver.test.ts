import { describe, it, expect } from "vitest"
import { ConnectionMode, Position, type Edge, type Node } from "@xyflow/react"
import { computeAllEdgeGeometry } from "@/utils/geometry/edgeGeometrySolver"
import {
  STRAIGHT_HOOK_EDGE_TYPES,
  STRAIGHT_PATH_STEP_EDGE_TYPES,
} from "@/edges/edgeRoutingBehavior"

/**
 * Build a minimal RF node + its InternalNode entry with the handle bounds and
 * absolute position `getEdgePosition` needs (see `isNodeInitialized`). One
 * source handle on the right edge, one target handle on the left edge.
 */
function makeNode(
  id: string,
  x: number,
  y: number,
  w = 100,
  h = 60
): { node: Node; internal: any } {
  const node: Node = {
    id,
    position: { x, y },
    width: w,
    height: h,
    measured: { width: w, height: h },
    data: {},
    type: "Class",
  } as Node
  const internal = {
    ...node,
    measured: { width: w, height: h },
    internals: {
      positionAbsolute: { x, y },
      handleBounds: {
        source: [
          {
            id: null,
            type: "source",
            position: Position.Right,
            x: w,
            y: h / 2,
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
            y: h / 2,
            width: 1,
            height: 1,
          },
        ],
      },
    },
  }
  return { node, internal }
}

const isOrthogonal = (pts: { x: number; y: number }[]): boolean =>
  pts.every((p, i) => i === 0 || p.x === pts[i - 1].x || p.y === pts[i - 1].y)

describe("computeAllEdgeGeometry", () => {
  it("routes a single edge between two nodes as an orthogonal polyline", () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 300, 0)
    const nodes = [a.node, b.node]
    const nodeLookup = new Map<string, any>([
      ["a", a.internal],
      ["b", b.internal],
    ])
    const edges: Edge[] = [
      { id: "e1", source: "a", target: "b", type: "ClassUnidirectional" },
    ]

    const { routeById } = computeAllEdgeGeometry({
      nodes,
      nodeLookup,
      connectionMode: ConnectionMode.Loose,
      edges,
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
    })

    const route = routeById["e1"]
    expect(route).toBeDefined()
    expect(route.length).toBeGreaterThanOrEqual(2)
    expect(isOrthogonal(route)).toBe(true)
    // Leaves A's right side (x ~ 100) and reaches B's left side (x ~ 300).
    expect(route[0].x).toBeGreaterThanOrEqual(95)
    expect(route[route.length - 1].x).toBeLessThanOrEqual(305)
  })

  it("holds no route for an edge whose nodes are absent from nodeLookup", () => {
    const a = makeNode("a", 0, 0)
    const nodes = [a.node]
    const nodeLookup = new Map<string, any>([["a", a.internal]])
    const edges: Edge[] = [
      { id: "e1", source: "a", target: "missing", type: "ClassUnidirectional" },
    ]
    const { routeById } = computeAllEdgeGeometry({
      nodes,
      nodeLookup,
      connectionMode: ConnectionMode.Loose,
      edges,
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
    })
    expect(routeById["e1"]).toBeUndefined()
  })

  it("emits a plain two-point line for a straight-hook edge type", () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 300, 0)
    const nodeLookup = new Map<string, any>([
      ["a", a.internal],
      ["b", b.internal],
    ])
    const edges: Edge[] = [
      { id: "e1", source: "a", target: "b", type: "SyntaxTreeLink" },
    ]
    const { routeById } = computeAllEdgeGeometry({
      nodes: [a.node, b.node],
      nodeLookup,
      connectionMode: ConnectionMode.Loose,
      edges,
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
    })
    expect(routeById["e1"]).toHaveLength(2)
  })

  it("routes all edges when their ids arrive out of order", () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 300, 0)
    const c = makeNode("c", 0, 200)
    const d = makeNode("d", 300, 200)
    const nodeLookup = new Map<string, any>([
      ["a", a.internal],
      ["b", b.internal],
      ["c", c.internal],
      ["d", d.internal],
    ])
    const edges: Edge[] = [
      { id: "e2", source: "c", target: "d", type: "ClassUnidirectional" },
      { id: "e1", source: "a", target: "b", type: "ClassUnidirectional" },
    ]
    const { routeById } = computeAllEdgeGeometry({
      nodes: [a.node, b.node, c.node, d.node],
      nodeLookup,
      connectionMode: ConnectionMode.Loose,
      edges,
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
    })
    expect(routeById["e1"].length).toBeGreaterThanOrEqual(2)
    expect(routeById["e2"].length).toBeGreaterThanOrEqual(2)
  })

  it("uses a live override verbatim as the dragged edge's route", () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 300, 0)
    const nodeLookup = new Map<string, any>([
      ["a", a.internal],
      ["b", b.internal],
    ])
    const edges: Edge[] = [
      { id: "e1", source: "a", target: "b", type: "ClassUnidirectional" },
    ]
    const override = [
      { x: 5, y: 5 },
      { x: 5, y: 99 },
      { x: 295, y: 99 },
    ]
    const { routeById } = computeAllEdgeGeometry({
      nodes: [a.node, b.node],
      nodeLookup,
      connectionMode: ConnectionMode.Loose,
      edges,
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
      liveOverride: { edgeId: "e1", points: override },
    })
    expect(routeById["e1"]).toEqual(override)
  })

  it("a cached solve is byte-identical to an uncached one, across frames", () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 600, 0)
    const c = makeNode("c", 300, 0) // between a and b -> forces a real search
    const d = makeNode("d", 0, 300)
    const nodeLookup = new Map<string, any>([
      ["a", a.internal],
      ["b", b.internal],
      ["c", c.internal],
      ["d", d.internal],
    ])
    const edges: Edge[] = [
      { id: "e1", source: "a", target: "b", type: "ClassUnidirectional" },
      { id: "e2", source: "a", target: "d", type: "ClassUnidirectional" },
      { id: "e3", source: "c", target: "d", type: "ClassUnidirectional" },
    ]
    const base = {
      nodes: [a.node, b.node, c.node, d.node],
      nodeLookup,
      connectionMode: ConnectionMode.Loose,
      edges,
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
    }

    const noCache = computeAllEdgeGeometry(base).routeById
    const cache = new Map<string, { sig: string; computed: unknown }>()
    // First cached solve populates; the second is all cache hits.
    const warm = computeAllEdgeGeometry({
      ...base,
      solveCache: cache,
    }).routeById
    const hot = computeAllEdgeGeometry({ ...base, solveCache: cache }).routeById
    expect(warm).toEqual(noCache)
    expect(hot).toEqual(noCache)
  })

  it("invalidates only the edges a moved node changed", () => {
    const build = (bx: number) => {
      const a = makeNode("a", 0, 0)
      const b = makeNode("b", bx, 0)
      const c = makeNode("c", 300, 0)
      const d = makeNode("d", 0, 300)
      return {
        nodes: [a.node, b.node, c.node, d.node],
        nodeLookup: new Map<string, any>([
          ["a", a.internal],
          ["b", b.internal],
          ["c", c.internal],
          ["d", d.internal],
        ]),
        connectionMode: ConnectionMode.Loose,
        edges: [
          { id: "e1", source: "a", target: "b", type: "ClassUnidirectional" },
          { id: "e2", source: "a", target: "d", type: "ClassUnidirectional" },
        ] as Edge[],
        straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
        straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
      }
    }
    const cache = new Map<string, { sig: string; computed: unknown }>()
    computeAllEdgeGeometry({ ...build(600), solveCache: cache }) // frame 1
    // Frame 2 with b moved: the cached continuation must equal a fresh no-cache
    // solve of the moved layout (proves stale routes are never served).
    const moved = build(800)
    const cachedAfterMove = computeAllEdgeGeometry({
      ...moved,
      solveCache: cache,
    }).routeById
    const freshAfterMove = computeAllEdgeGeometry(moved).routeById
    expect(cachedAfterMove).toEqual(freshAfterMove)
  })
})
