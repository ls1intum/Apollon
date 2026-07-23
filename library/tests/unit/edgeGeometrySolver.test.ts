import { describe, it, expect } from "vitest"
import {
  ConnectionMode,
  Position,
  type Edge,
  type InternalNode,
  type Node,
} from "@xyflow/react"
import {
  computeAllEdgeGeometry,
  polylineIntersectsBox,
} from "@/utils/geometry/edgeGeometrySolver"
import {
  STRAIGHT_HOOK_EDGE_TYPES,
  STRAIGHT_PATH_STEP_EDGE_TYPES,
} from "@/edges/edgeRoutingBehavior"
import { routeConflictScore } from "@/utils/geometry/orthogonalRouter"
import { getPerfCounters } from "@/sync/perfCounters"

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
): { node: Node; internal: InternalNode } {
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
  return { node, internal: internal as unknown as InternalNode }
}

const isOrthogonal = (pts: { x: number; y: number }[]): boolean =>
  pts.every((p, i) => i === 0 || p.x === pts[i - 1].x || p.y === pts[i - 1].y)

const crossesInterior = (
  route: readonly { x: number; y: number }[],
  rect: { x: number; y: number; width: number; height: number }
): boolean =>
  route.slice(0, -1).some((point, i) => {
    const next = route[i + 1]
    return (
      Math.min(point.x, next.x) < rect.x + rect.width &&
      Math.max(point.x, next.x) > rect.x &&
      Math.min(point.y, next.y) < rect.y + rect.height &&
      Math.max(point.y, next.y) > rect.y
    )
  })

describe("computeAllEdgeGeometry", () => {
  it("routes a single edge between two nodes as an orthogonal polyline", () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 300, 0)
    const nodes = [a.node, b.node]
    const nodeLookup = new Map<string, InternalNode>([
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
    const nodeLookup = new Map<string, InternalNode>([["a", a.internal]])
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
    const nodeLookup = new Map<string, InternalNode>([
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
    const nodeLookup = new Map<string, InternalNode>([
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
    const nodeLookup = new Map<string, InternalNode>([
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
    const nodeLookup = new Map<string, InternalNode>([
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

  it("reuses an earlier snapped-frame signature with no new search and cold-identical output", () => {
    const frame = (targetY: number) => {
      const source = makeNode("source", 0, 0)
      const blocker = makeNode("blocker", 260, -20, 100, 120)
      const target = makeNode("target", 560, targetY)
      const entries = [source, blocker, target]
      return {
        nodes: entries.map((entry) => entry.node),
        nodeLookup: new Map(
          entries.map((entry) => [entry.node.id, entry.internal])
        ) as Map<string, InternalNode>,
        connectionMode: ConnectionMode.Loose,
        edges: [
          {
            id: "route",
            source: "source",
            target: "target",
            type: "ClassUnidirectional",
          },
        ] as Edge[],
        straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
        straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
      }
    }

    const firstFrame = frame(0)
    const intermediateFrame = frame(10)
    const cache = new Map()
    const counters = getPerfCounters()!
    const searchesBeforeFirst = counters.routerSearches
    const first = computeAllEdgeGeometry({
      ...firstFrame,
      solveCache: cache,
    }).routeById
    expect(counters.routerSearches).toBeGreaterThan(searchesBeforeFirst)

    const searchesBeforeIntermediate = counters.routerSearches
    computeAllEdgeGeometry({
      ...intermediateFrame,
      solveCache: cache,
    })
    expect(counters.routerSearches).toBeGreaterThan(searchesBeforeIntermediate)

    const searchesBeforeReturn = counters.routerSearches
    const returned = computeAllEdgeGeometry({
      ...frame(0),
      solveCache: cache,
    }).routeById
    expect(counters.routerSearches).toBe(searchesBeforeReturn)

    const cold = computeAllEdgeGeometry(frame(0)).routeById
    expect(returned).toEqual(cold)
    expect(returned).toEqual(first)
  })

  it("invalidates only the edges a moved node changed", () => {
    const build = (bx: number) => {
      const a = makeNode("a", 0, 0)
      const b = makeNode("b", bx, 0)
      const c = makeNode("c", 300, 0)
      const d = makeNode("d", 0, 300)
      return {
        nodes: [a.node, b.node, c.node, d.node],
        nodeLookup: new Map<string, InternalNode>([
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

  it("keeps a searched route cached when only unreachable neighbour geometry changes", () => {
    const a = makeNode("a", 0, 0)
    const blocker = makeNode("blocker", 200, 0)
    const b = makeNode("b", 400, 0)
    const c = makeNode("c", -300, 90)
    const d = makeNode("d", 800, 90)
    const nodes = [a, blocker, b, c, d]
    const auto: Edge = {
      id: "auto",
      source: "a",
      target: "b",
      type: "ClassUnidirectional",
    }
    const neighbor = (points: { x: number; y: number }[]): Edge => ({
      id: "neighbor",
      source: "c",
      target: "d",
      type: "ClassUnidirectional",
      data: { points },
    })
    const input = (points: { x: number; y: number }[]) => ({
      nodes: nodes.map((entry) => entry.node),
      nodeLookup: new Map(
        nodes.map((entry) => [entry.node.id, entry.internal])
      ) as Map<string, InternalNode>,
      connectionMode: ConnectionMode.Loose,
      edges: [neighbor(points), auto],
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
    })
    const firstPoints = [
      { x: -200, y: 120 },
      { x: 800, y: 120 },
    ]
    const changedRemotePoints = [
      { x: -200, y: 120 },
      { x: -150, y: 120 },
      { x: -150, y: 130 },
      { x: 850, y: 130 },
      { x: 850, y: 120 },
      { x: 800, y: 120 },
    ]
    const cache = new Map()
    computeAllEdgeGeometry({ ...input(firstPoints), solveCache: cache })
    const counters = getPerfCounters()!
    const searchesBefore = counters.routerSearches

    const cached = computeAllEdgeGeometry({
      ...input(changedRemotePoints),
      solveCache: cache,
    }).routeById
    expect(counters.routerSearches).toBe(searchesBefore)
    const fresh = computeAllEdgeGeometry(input(changedRemotePoints)).routeById

    expect(cached).toEqual(fresh)
    expect(counters.routerSearches - searchesBefore).toBeGreaterThan(0)
    const searchesAfterFresh = counters.routerSearches
    computeAllEdgeGeometry({
      ...input(changedRemotePoints),
      solveCache: cache,
    })
    expect(counters.routerSearches).toBe(searchesAfterFresh)
  })

  it("rebuilds obstacle geometry after in-place measurement on the same node array", () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 600, 0)
    const mid = makeNode("mid", 300, 0)
    mid.node.width = undefined
    mid.node.height = undefined
    mid.node.measured = undefined
    const nodes = [a.node, b.node, mid.node]
    const input = {
      nodes,
      nodeLookup: new Map<string, InternalNode>([
        ["a", a.internal],
        ["b", b.internal],
        ["mid", mid.internal],
      ]),
      connectionMode: ConnectionMode.Loose,
      edges: [
        { id: "e1", source: "a", target: "b", type: "ClassUnidirectional" },
      ] as Edge[],
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
      solveCache: new Map(),
    }

    const beforeMeasurement = computeAllEdgeGeometry(input).routeById["e1"]
    expect(
      crossesInterior(beforeMeasurement, {
        x: 300,
        y: 0,
        width: 100,
        height: 60,
      })
    ).toBe(true)

    // React Flow fills measurement in place without replacing `nodes`.
    mid.node.measured = { width: 100, height: 60 }
    const afterMeasurement = computeAllEdgeGeometry(input).routeById["e1"]
    expect(afterMeasurement).not.toEqual(beforeMeasurement)
    expect(
      crossesInterior(afterMeasurement, {
        x: 300,
        y: 0,
        width: 100,
        height: 60,
      })
    ).toBe(false)
  })
})

/** The side an edge leaves a node on, read off the route's first segment. */
const exitSide = (route: { x: number; y: number }[]): string => {
  const [a, b] = route
  if (Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)) return b.x >= a.x ? "R" : "L"
  return b.y >= a.y ? "D" : "U"
}

describe("computeAllEdgeGeometry — auto anchor optimization", () => {
  const base = (
    nodes: { node: Node; internal: InternalNode }[],
    edges: Edge[]
  ) => ({
    nodes: nodes.map((n) => n.node),
    nodeLookup: new Map(nodes.map((n) => [n.node.id, n.internal])) as Map<
      string,
      InternalNode
    >,
    connectionMode: ConnectionMode.Loose,
    edges,
    straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
    straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
  })

  const anchorAtBoundaryPoint = (
    point: { x: number; y: number },
    node: { node: Node; internal: InternalNode }
  ): { side: Position; ratio: number } => {
    const { x, y } = node.node.position
    const width = node.node.width ?? 0
    const height = node.node.height ?? 0
    const candidates = [
      {
        side: Position.Left,
        distance: Math.abs(point.x - x),
        ratio: (point.y - y) / height,
      },
      {
        side: Position.Right,
        distance: Math.abs(point.x - (x + width)),
        ratio: (point.y - y) / height,
      },
      {
        side: Position.Top,
        distance: Math.abs(point.y - y),
        ratio: (point.x - x) / width,
      },
      {
        side: Position.Bottom,
        distance: Math.abs(point.y - (y + height)),
        ratio: (point.x - x) / width,
      },
    ].sort((a, b) => a.distance - b.distance)
    expect(candidates[0].distance).toBeLessThanOrEqual(1)
    return { side: candidates[0].side, ratio: candidates[0].ratio }
  }

  it("routes a plainly-facing edge with no bends by aligning the anchors", () => {
    // b sits straight to the right of a; the optimiser should align both anchors
    // to a common y and draw a straight line (zero interior points).
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 300, 0)
    const { routeById } = computeAllEdgeGeometry(
      base(
        [a, b],
        [{ id: "e1", source: "a", target: "b", type: "ClassUnidirectional" }]
      )
    )
    expect(routeById["e1"].length).toBe(2)
    expect(exitSide(routeById["e1"])).toBe("R")
  })

  it("keeps a flowchart's aligned decision branch straight as the graph is optimized", () => {
    const typedNode = (
      id: string,
      type: string,
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      const result = makeNode(id, x, y, width, height)
      result.node.type = type
      result.internal.type = type
      return result
    }
    const nodes = [
      typedNode("start", "flowchartTerminal", 150, 0, 160, 70),
      typedNode("initialize", "flowchartProcess", 150, 120, 160, 70),
      typedNode("decision", "flowchartDecision", 150, 240, 160, 70),
      typedNode("increment", "flowchartProcess", 150, 370, 160, 70),
      typedNode("print", "flowchartInputOutput", 400, 240, 140, 70),
      typedNode("cleanup", "flowchartFunctionCall", 390, 370, 160, 70),
      typedNode("end", "flowchartTerminal", 390, 490, 160, 70),
    ]
    const edges: Edge[] = [
      ["start-initialize", "start", "initialize"],
      ["initialize-decision", "initialize", "decision"],
      ["decision-increment", "decision", "increment"],
      ["increment-loopback", "increment", "initialize"],
      ["decision-print", "decision", "print"],
      ["print-cleanup", "print", "cleanup"],
      ["cleanup-end", "cleanup", "end"],
    ].map(([id, source, target]) => ({
      id,
      source,
      target,
      type: "FlowChartFlowline",
      data: { points: [] },
    }))

    const isolated = computeAllEdgeGeometry(
      base(
        nodes,
        edges.filter((edge) => edge.id === "decision-print")
      )
    ).routeById["decision-print"]
    expect(isolated).toEqual([
      { x: 310, y: 275 },
      { x: 410, y: 275 },
    ])

    const { routeById } = computeAllEdgeGeometry(base(nodes, edges))
    expect(routeById["decision-print"]).toEqual([
      { x: 310, y: 275 },
      { x: 410, y: 275 },
    ])
  })

  it("keeps the two overlapping lanes of a reachability diamond straight", () => {
    const marking = (
      id: string,
      x: number,
      y: number
    ): { node: Node; internal: InternalNode } => {
      const result = makeNode(id, x, y, 160, 120)
      result.node.type = "reachabilityGraphMarking"
      result.internal.type = "reachabilityGraphMarking"
      return result
    }
    const nodes = [
      marking("initial", 40, 80),
      marking("upper", 300, 20),
      marking("lower", 300, 200),
      marking("final", 550, 80),
    ]
    const edges: Edge[] = [
      ["initial-upper", "initial", "upper"],
      ["initial-lower", "initial", "lower"],
      ["upper-final", "upper", "final"],
      ["lower-final", "lower", "final"],
    ].map(([id, source, target]) => ({
      id,
      source,
      target,
      type: "ReachabilityGraphArc",
      data: { points: [] },
    }))

    const { routeById } = computeAllEdgeGeometry(base(nodes, edges))

    for (const id of ["initial-upper", "upper-final"]) {
      expect(routeById[id]).toHaveLength(2)
      expect(routeById[id][0].y).toBe(routeById[id][1].y)
    }
    for (const id of ["initial-lower", "lower-final"])
      expect(routeById[id].length).toBeLessThanOrEqual(3)
  })

  it("keeps the Bridge client and implementor associations straight around pinned inheritance fans", () => {
    const abstraction = makeNode("abstraction", 150, 175, 180, 70)
    const refinedLeft = makeNode("refined-left", 25, 305, 180, 70)
    const client = makeNode("client", -140, 190, 167.20445251464844, 40)
    const refinedRight = makeNode("refined-right", 270, 305, 180, 70)
    const implementor = makeNode("implementor", 635, 175, 200, 70)
    const concreteLeft = makeNode("concrete-left", 505, 305, 200, 70)
    const concreteRight = makeNode("concrete-right", 765, 305, 200, 70)
    const clientSourceHandles = client.internal.internals.handleBounds
      ?.source as Array<{ id: string | null }> | undefined
    const abstractionTargetHandles = abstraction.internal.internals.handleBounds
      ?.target as Array<{ id: string | null }> | undefined
    clientSourceHandles?.forEach((handle) => {
      handle.id = "right"
    })
    abstractionTargetHandles?.forEach((handle) => {
      handle.id = "left"
    })
    const centreTip = {
      sourceAnchor: { side: Position.Top, ratio: 0.5 },
      targetAnchor: { side: Position.Bottom, ratio: 0.5 },
      points: [],
    }
    const edges: Edge[] = [
      {
        id: "client-abstraction",
        source: "client",
        target: "abstraction",
        type: "ClassBidirectional",
        sourceHandle: "right",
        targetHandle: "left",
        data: { points: [] },
      },
      {
        id: "refined-left",
        source: "refined-left",
        target: "abstraction",
        type: "ClassInheritance",
        data: centreTip,
      },
      {
        id: "refined-right",
        source: "refined-right",
        target: "abstraction",
        type: "ClassInheritance",
        data: centreTip,
      },
      {
        id: "concrete-left",
        source: "concrete-left",
        target: "implementor",
        type: "ClassInheritance",
        data: centreTip,
      },
      {
        id: "concrete-right",
        source: "concrete-right",
        target: "implementor",
        type: "ClassInheritance",
        data: centreTip,
      },
      {
        id: "abstraction-implementor",
        source: "abstraction",
        target: "implementor",
        type: "ClassBidirectional",
        data: { points: [] },
      },
    ]
    const nodes = [
      abstraction,
      refinedLeft,
      client,
      refinedRight,
      implementor,
      concreteLeft,
      concreteRight,
    ]
    const { routeById } = computeAllEdgeGeometry(base(nodes, edges))

    for (const edgeId of ["client-abstraction", "abstraction-implementor"]) {
      const route = routeById[edgeId]
      expect(route).toHaveLength(2)
      expect(route[0].y).toBe(route[1].y)
      expect(exitSide(route)).toBe("R")
    }
  })

  it("keeps automatic branches on an explicitly shared pinned junction stable", () => {
    const product = makeNode("product", 265, 130, 250, 100)
    const left = makeNode("left", 35, 330, 210, 70)
    const middle = makeNode("middle", 275, 330, 230, 70)
    const right = makeNode("right", 535, 330, 240, 70)
    const pinned = {
      sourceAnchor: { side: Position.Top, ratio: 0.5 },
      targetAnchor: { side: Position.Bottom, ratio: 0.5 },
      points: [],
    }
    const edges: Edge[] = [
      {
        id: "left-product",
        source: "left",
        target: "product",
        type: "ClassInheritance",
        data: pinned,
      },
      {
        id: "middle-product",
        source: "middle",
        target: "product",
        type: "ClassInheritance",
        data: pinned,
      },
      {
        id: "right-product",
        source: "right",
        target: "product",
        type: "ClassInheritance",
        data: pinned,
      },
    ]
    const solve = (
      children: { node: Node; internal: InternalNode }[]
    ): Record<string, { x: number; y: number }[]> =>
      computeAllEdgeGeometry(base([product, ...children], edges)).routeById
    const pristine = solve([left, middle, right])

    left.node.position.x += 5
    left.internal.position.x += 5
    left.internal.internals.positionAbsolute.x += 5
    const nudged = solve([left, middle, right])

    for (const edgeId of edges.map((edge) => edge.id)) {
      const route = pristine[edgeId]
      const moved = nudged[edgeId]
      expect(route.at(-1)).toEqual({ x: 390, y: 230 })
      expect(moved.at(-1)).toEqual({ x: 390, y: 230 })
      expect(route.length).toBeLessThanOrEqual(4)
      expect(moved).toHaveLength(route.length)
      const final = route.slice(-2)
      const movedFinal = moved.slice(-2)
      expect(final[0].x).toBe(390)
      expect(movedFinal[0].x).toBe(390)
      expect(movedFinal[0].y).toBe(final[0].y)
    }

    expect(pristine["left-product"]).toEqual([
      { x: 140, y: 330 },
      { x: 140, y: 280 },
      { x: 390, y: 280 },
      { x: 390, y: 230 },
    ])
    expect(pristine["middle-product"]).toEqual([
      { x: 390, y: 330 },
      { x: 390, y: 230 },
    ])
    expect(pristine["right-product"]).toEqual([
      { x: 655, y: 330 },
      { x: 655, y: 280 },
      { x: 390, y: 280 },
      { x: 390, y: 230 },
    ])

    // Moving either outer branch by a full two grid cells keeps the common bus
    // and trunk fixed; only that branch's source run changes.
    for (const delta of [-10, -5, 5, 10]) {
      const shiftedLeft = makeNode("left", 35 + delta, 330, 210, 70)
      const shifted = solve([shiftedLeft, middle, right])
      expect(shifted["left-product"].slice(2)).toEqual(
        pristine["left-product"].slice(2)
      )
      expect(shifted["middle-product"]).toEqual(pristine["middle-product"])
      expect(shifted["right-product"]).toEqual(pristine["right-product"])
    }
  })

  it("balances a two-branch pinned junction on the grid midpoint", () => {
    const adapter = makeNode("adapter", 270, 120, 190, 70)
    const left = makeNode("left", 195, 265, 160, 70)
    const right = makeNode("right", 390, 265, 160, 70)
    const pinned = {
      sourceAnchor: { side: Position.Top, ratio: 0.5 },
      targetAnchor: { side: Position.Bottom, ratio: 0.5 },
      points: [],
    }
    const { routeById } = computeAllEdgeGeometry(
      base(
        [adapter, left, right],
        [
          {
            id: "left-adapter",
            source: "left",
            target: "adapter",
            type: "ClassInheritance",
            data: pinned,
          },
          {
            id: "right-adapter",
            source: "right",
            target: "adapter",
            type: "ClassInheritance",
            data: pinned,
          },
        ]
      )
    )

    expect(routeById["left-adapter"]).toEqual([
      { x: 275, y: 265 },
      { x: 275, y: 230 },
      { x: 365, y: 230 },
      { x: 365, y: 190 },
    ])
    expect(routeById["right-adapter"]).toEqual([
      { x: 470, y: 265 },
      { x: 470, y: 230 },
      { x: 365, y: 230 },
      { x: 365, y: 190 },
    ])
  })

  it("straightens an offset-but-overlapping pair by sliding both anchors", () => {
    // b is to the right of a and shifted down by less than a node height, so the
    // sides still overlap in y. Aiming each anchor at the partner's centre would
    // land them on different lines and force a Z; the straight-aligned pair slides
    // both onto one line for a bend-free edge.
    const a = makeNode("a", 0, 0, 160, 100)
    const b = makeNode("b", 420, 50, 160, 100)
    const { routeById } = computeAllEdgeGeometry(
      base(
        [a, b],
        [{ id: "e1", source: "a", target: "b", type: "ClassUnidirectional" }]
      )
    )
    expect(routeById["e1"].length).toBe(2) // straight: no interior bend
    expect(routeById["e1"][0].y).toBe(routeById["e1"][1].y) // one shared line
  })

  it("keeps a single bend when the nodes do not overlap (straight impossible)", () => {
    // b is shifted down by MORE than a node height: the sides no longer overlap,
    // so no straight run exists and the edge must bend — but only once.
    const a = makeNode("a", 0, 0, 160, 100)
    const b = makeNode("b", 420, 200, 160, 100)
    const { routeById } = computeAllEdgeGeometry(
      base(
        [a, b],
        [{ id: "e1", source: "a", target: "b", type: "ClassUnidirectional" }]
      )
    )
    expect(routeById["e1"].length).toBeLessThanOrEqual(3) // at most one bend
    expect(routeById["e1"].length).toBeGreaterThan(2) // but not straight
  })

  it("separates sibling routes that leave a nested node through the same corridor", () => {
    // edge-margin-around-a.json: one sibling exits through its package roof and
    // reaches A from above, while the other wraps around A. Their middle runs
    // have ample room to separate and must not collapse into one visible edge.
    const container = makeNode("package", -980, 410, 290, 275)
    container.node.type = "package"
    const source = makeNode("source", 60, 80, 160, 100)
    source.node.parentId = "package"
    source.internal.parentId = "package"
    source.internal.internals.positionAbsolute = { x: -920, y: 490 }
    const target = makeNode("target", -545, 490, 160, 100)
    const lower = makeNode("lower", -295, 700, 160, 100)
    const edges: Edge[] = [
      {
        id: "upper",
        source: "source",
        target: "target",
        type: "ClassUnidirectional",
      },
      {
        id: "lower",
        source: "target",
        target: "lower",
        type: "ClassUnidirectional",
      },
      {
        id: "wrapping",
        source: "source",
        target: "target",
        type: "ClassUnidirectional",
      },
    ]

    const { routeById } = computeAllEdgeGeometry(
      base([container, source, target, lower], edges)
    )

    expect(
      routeConflictScore(routeById.upper, [routeById.wrapping]).proximityPx
    ).toBe(0)
  })

  it("respects a custom source anchor and never re-chooses it", () => {
    // A pinned TOP anchor must be honoured even though the facing side is right.
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 300, 0)
    const edges: Edge[] = [
      {
        id: "e1",
        source: "a",
        target: "b",
        type: "ClassUnidirectional",
        data: { sourceAnchor: { side: Position.Top, ratio: 0.5 } },
      },
    ]
    const { routeById } = computeAllEdgeGeometry(base([a, b], edges))
    expect(exitSide(routeById["e1"])).toBe("U")
  })

  it("refines partially pinned routes jointly without moving their pins", () => {
    // A pin owns its endpoint, not the generated route after it. In canonical
    // order e2 takes a long lane through e1; route-set refinement must be free to
    // move that lane while preserving all three user-owned source seats exactly.
    const a = makeNode("a", 255, 259, 80, 50)
    const b = makeNode("b", 134, 138, 100, 100)
    const c = makeNode("c", 14, 17, 140, 70)
    const d = makeNode("d", -107, -103, 80, 50)
    const e = makeNode("e", -227, -224, 100, 100)
    const f = makeNode("f", -348, 728, 140, 70)
    const edges: Edge[] = [
      {
        id: "e0",
        source: "a",
        target: "b",
        type: "ClassUnidirectional",
        data: { sourceAnchor: { side: Position.Bottom, ratio: 0.35 } },
      },
      {
        id: "e1",
        source: "c",
        target: "d",
        type: "ClassUnidirectional",
        data: { sourceAnchor: { side: Position.Top, ratio: 0.35 } },
      },
      {
        id: "e2",
        source: "e",
        target: "f",
        type: "ClassUnidirectional",
        data: { sourceAnchor: { side: Position.Right, ratio: 0.65 } },
      },
    ]

    const { routeById } = computeAllEdgeGeometry(
      base([a, b, c, d, e, f], edges)
    )

    expect(routeById.e0[0]).toEqual({ x: 283, y: 309 })
    expect(routeById.e1[0]).toEqual({ x: 63, y: 17 })
    expect(routeById.e2[0]).toEqual({ x: -127, y: -159 })

    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const first = routeById[edges[i].id]
        const second = routeById[edges[j].id]
        const forward = routeConflictScore(first, [second]).crossings
        const reverse = routeConflictScore(second, [first]).crossings
        expect(
          Math.max(forward, reverse),
          `${edges[i].id} crosses ${edges[j].id}`
        ).toBe(0)
      }
    }
  })

  it("scores a small conflicted component without repeatedly rescanning remote pairs", () => {
    const coreNodes = [
      makeNode("a", 255, 259, 80, 50),
      makeNode("b", 134, 138, 100, 100),
      makeNode("c", 14, 17, 140, 70),
      makeNode("d", -107, -103, 80, 50),
      makeNode("e", -227, -224, 100, 100),
      makeNode("f", -348, 728, 140, 70),
    ]
    const coreEdges: Edge[] = [
      {
        id: "e0",
        source: "a",
        target: "b",
        type: "ClassUnidirectional",
        data: { sourceAnchor: { side: Position.Bottom, ratio: 0.35 } },
      },
      {
        id: "e1",
        source: "c",
        target: "d",
        type: "ClassUnidirectional",
        data: { sourceAnchor: { side: Position.Top, ratio: 0.35 } },
      },
      {
        id: "e2",
        source: "e",
        target: "f",
        type: "ClassUnidirectional",
        data: { sourceAnchor: { side: Position.Right, ratio: 0.65 } },
      },
    ]
    const remoteNodes = Array.from({ length: 40 }, (_, index) => [
      makeNode(`rs${index}`, 5_000 + index * 400, 0),
      makeNode(`rt${index}`, 5_200 + index * 400, 0),
    ]).flat()
    const remoteEdges: Edge[] = Array.from({ length: 40 }, (_, index) => ({
      id: `remote${index}`,
      source: `rs${index}`,
      target: `rt${index}`,
      type: "ClassUnidirectional",
    }))
    const counters = getPerfCounters()!
    const before = counters.routeScorePairs

    computeAllEdgeGeometry(
      base([...coreNodes, ...remoteNodes], [...coreEdges, ...remoteEdges])
    )

    // One initial whole-set score is unavoidable. Every refinement score after
    // that is component-vs-fixed (O(component × diagram)), never another O(E²)
    // remote-vs-remote scan. The old implementation exceeded 14,000 pairs here.
    expect(counters.routeScorePairs - before).toBeLessThan(100)
  })

  it("keeps the route set unchanged when the current free endpoint is pinned", () => {
    // Pinning a free end at the exact seat the solver already chose is a semantic
    // no-op. The one-pin candidate path and two-pin fixed path must therefore use
    // the same routing primitive; otherwise the terminal lane shifts by one grid
    // cell merely because the identical endpoint became user-owned.
    const hub = makeNode("hub", 0, 0, 160, 100)
    const n0 = makeNode("n0", -460, 0, 100, 60)
    const n1 = makeNode("n1", 0, -280, 140, 80)
    const n2 = makeNode("n2", 460, 0, 100, 100)
    const n3 = makeNode("n3", 0, 280, 140, 60)
    const edges: Edge[] = [
      {
        id: "e0",
        source: "hub",
        target: "n0",
        type: "ClassUnidirectional",
        data: { sourceAnchor: { side: Position.Top, ratio: 0.35 } },
      },
      {
        id: "e1",
        source: "hub",
        target: "n1",
        type: "ClassUnidirectional",
      },
      {
        id: "e2",
        source: "hub",
        target: "n2",
        type: "ClassUnidirectional",
      },
      {
        id: "e3",
        source: "hub",
        target: "n3",
        type: "ClassUnidirectional",
      },
    ]
    const input = base([hub, n0, n1, n2, n3], edges)
    const before = computeAllEdgeGeometry(input).routeById
    expect(before.e0.at(-1)).toEqual({ x: -410, y: 0 })

    const after = computeAllEdgeGeometry({
      ...input,
      edges: edges.map((edge) =>
        edge.id === "e0"
          ? {
              ...edge,
              data: {
                ...edge.data,
                targetAnchor: { side: Position.Top, ratio: 0.5 },
              },
            }
          : edge
      ),
    }).routeById

    expect(after).toEqual(before)
  })

  it("preserves authored bend topology instead of optimising against a replacement route", () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 300, 170)
    const points = [
      { x: 100, y: 30 },
      { x: 180, y: 30 },
      { x: 180, y: 200 },
      { x: 300, y: 200 },
    ]
    const { routeById } = computeAllEdgeGeometry(
      base(
        [a, b],
        [
          {
            id: "manual",
            source: "a",
            target: "b",
            type: "ClassUnidirectional",
            data: { points },
          },
        ]
      )
    )
    const route = routeById.manual
    // Endpoint padding may move the first/last pixels, but the authored vertical
    // bend lane and H-V-H topology remain authoritative.
    expect(route).toHaveLength(4)
    expect(route[1].x).toBe(180)
    expect(route[2].x).toBe(180)
    expect(route[0].y).toBe(route[1].y)
    expect(route[2].y).toBe(route[3].y)
  })

  it("keeps auto edges off authored collinear topology regardless of edge IDs", () => {
    const a = makeNode("a", -400, 0, 120, 80)
    const b = makeNode("b", 400, 0, 120, 80)
    const c = makeNode("c", 0, -300, 120, 80)
    const d = makeNode("d", 0, 300, 120, 80)
    const manualPoints = [
      { x: 120, y: -260 },
      { x: 200, y: -260 },
      { x: 200, y: 340 },
      { x: 0, y: 340 },
    ]
    const { routeById } = computeAllEdgeGeometry(
      base(
        [a, b, c, d],
        [
          {
            id: "a-auto-sorts-first",
            source: "a",
            target: "b",
            type: "ClassUnidirectional",
          },
          {
            id: "z-authored-sorts-last",
            source: "c",
            target: "d",
            type: "ClassUnidirectional",
            data: { points: manualPoints },
          },
        ]
      )
    )
    const auto = routeById["a-auto-sorts-first"]
    const manual = routeById["z-authored-sorts-last"]

    expect(manual.length).toBeGreaterThanOrEqual(4)
    // A clean perpendicular line-jump is allowed; drawing on top of the user's
    // authored line is not.
    expect(routeConflictScore(auto, [manual]).proximityPx).toBe(0)
  })

  it("keeps surrounding auto routes identical when a live bend drag is committed", () => {
    const a = makeNode("a", -400, 0, 120, 80)
    const b = makeNode("b", 400, 0, 120, 80)
    const c = makeNode("c", 0, -300, 120, 80)
    const d = makeNode("d", 0, 300, 120, 80)
    const finalPoints = [
      { x: 118, y: -259 },
      { x: 150, y: -259 },
      { x: 150, y: 40 },
      { x: -30, y: 40 },
      { x: -30, y: 341 },
      { x: 3, y: 341 },
    ]
    const auto: Edge = {
      id: "auto",
      source: "a",
      target: "b",
      type: "ClassUnidirectional",
    }
    const dragged: Edge = {
      id: "dragged",
      source: "c",
      target: "d",
      type: "ClassUnidirectional",
    }
    const live = computeAllEdgeGeometry({
      ...base([a, b, c, d], [auto, dragged]),
      liveOverride: { edgeId: "dragged", points: finalPoints },
    }).routeById
    const committed = computeAllEdgeGeometry(
      base([a, b, c, d], [auto, { ...dragged, data: { points: finalPoints } }])
    ).routeById

    expect(live.dragged).toEqual(finalPoints)
    expect(live.auto).toEqual(committed.auto)
  })

  it("keeps cached and fresh solves identical across endpoint pin transitions", () => {
    const a = makeNode("a", 0, 0, 160, 100)
    const b = makeNode("b", 420, 180, 160, 100)
    const c = makeNode("c", 160, -220, 160, 100)
    const cache = new Map()
    const auto: Edge = {
      id: "customized",
      source: "a",
      target: "b",
      type: "ClassUnidirectional",
    }
    const neighbor: Edge = {
      id: "neighbor",
      source: "c",
      target: "b",
      type: "ClassUnidirectional",
    }
    computeAllEdgeGeometry({
      ...base([a, b, c], [auto, neighbor]),
      solveCache: cache,
    })
    for (const data of [
      { sourceAnchor: { side: Position.Top, ratio: 0.35 } },
      {
        sourceAnchor: { side: Position.Top, ratio: 0.35 },
        targetAnchor: { side: Position.Left, ratio: 0.65 },
      },
    ]) {
      const frame = base([a, b, c], [{ ...auto, data }, neighbor] as Edge[])
      const cached = computeAllEdgeGeometry({ ...frame, solveCache: cache })
      const fresh = computeAllEdgeGeometry(frame)
      expect(cached.routeById).toEqual(fresh.routeById)
    }
  })

  it("does not move a balanced fan when an edge is pinned at its current seats", () => {
    const hub = makeNode("hub", 0, 0, 160, 100)
    const upper = makeNode("upper", 420, -100, 160, 100)
    const lower = makeNode("lower", 420, 100, 160, 100)
    const selected: Edge = {
      id: "selected",
      source: "hub",
      target: "upper",
      type: "ClassUnidirectional",
    }
    const sibling: Edge = {
      id: "sibling",
      source: "hub",
      target: "lower",
      type: "ClassUnidirectional",
    }
    const nodes = [hub, upper, lower]
    const autoFrame = base(nodes, [selected, sibling])
    const pristine = computeAllEdgeGeometry(autoFrame).routeById
    const cache = new Map()
    computeAllEdgeGeometry({ ...autoFrame, solveCache: cache })

    const sourceAnchor = anchorAtBoundaryPoint(pristine.selected[0], hub)
    const oneEndFrame = base(nodes, [
      { ...selected, data: { sourceAnchor } },
      sibling,
    ])
    const oneEndFresh = computeAllEdgeGeometry(oneEndFrame).routeById
    const oneEndCached = computeAllEdgeGeometry({
      ...oneEndFrame,
      solveCache: cache,
    }).routeById
    expect(oneEndFresh).toEqual(pristine)
    expect(oneEndCached).toEqual(pristine)

    const targetAnchor = anchorAtBoundaryPoint(
      pristine.selected[pristine.selected.length - 1],
      upper
    )
    const bothEndsFrame = base(nodes, [
      { ...selected, data: { sourceAnchor, targetAnchor } },
      sibling,
    ])
    const bothEndsFresh = computeAllEdgeGeometry(bothEndsFrame).routeById
    const bothEndsCached = computeAllEdgeGeometry({
      ...bothEndsFrame,
      solveCache: cache,
    }).routeById
    expect(bothEndsFresh).toEqual(pristine)
    expect(bothEndsCached).toEqual(pristine)
  })

  it("does not move a balanced fan when an auto edge starts a no-op bend drag", () => {
    const hub = makeNode("hub", 0, 0, 160, 100)
    const upper = makeNode("upper", 420, -100, 160, 100)
    const lower = makeNode("lower", 420, 100, 160, 100)
    const selected: Edge = {
      id: "selected",
      source: "hub",
      target: "upper",
      type: "ClassUnidirectional",
    }
    const sibling: Edge = {
      id: "sibling",
      source: "hub",
      target: "lower",
      type: "ClassUnidirectional",
    }
    const frame = base([hub, upper, lower], [selected, sibling])
    const pristine = computeAllEdgeGeometry(frame).routeById
    const live = computeAllEdgeGeometry({
      ...frame,
      liveOverride: { edgeId: "selected", points: pristine.selected },
    }).routeById

    expect(live).toEqual(pristine)
  })

  it("centres the lone arrival side in the diagram-91 topology", () => {
    const top = makeNode("top", 635, 145, 160, 100)
    const left = makeNode("left", 360, 420, 160, 100)
    const right = makeNode("right", 940, 420, 160, 100)
    const middle = makeNode("middle", 640, 420, 160, 100)
    const edges: Edge[] = [
      {
        id: "centre-right",
        source: "middle",
        target: "right",
        type: "ClassUnidirectional",
      },
      {
        id: "top-right",
        source: "top",
        target: "right",
        type: "ClassUnidirectional",
      },
      {
        id: "top-left",
        source: "top",
        target: "left",
        type: "ClassUnidirectional",
      },
      {
        id: "middle-top",
        source: "middle",
        target: "top",
        type: "ClassUnidirectional",
      },
      {
        id: "left-middle",
        source: "left",
        target: "middle",
        type: "ClassUnidirectional",
      },
      {
        id: "left-right",
        source: "left",
        target: "right",
        type: "ClassUnidirectional",
      },
    ]

    const { routeById } = computeAllEdgeGeometry(
      base([top, left, right, middle], edges)
    )
    const topRight = routeById["top-right"]
    const topLeft = routeById["top-left"]

    // The target is alone on that side. The two stretches it creates are equal,
    // rather than shortening the route by sliding 20px toward its partner.
    expect(topRight.at(-1)).toEqual({ x: 1020, y: 420 })
    expect(topLeft.at(-1)).toEqual({ x: 440, y: 420 })
  })

  it("centres lone ports instead of using an extreme narrow-overlap lane", () => {
    const adapter = makeNode("adapter", 270, 120, 190, 70)
    const left = makeNode("left", 120, 330, 160, 70)
    const right = makeNode("right", 435, 330, 160, 70)
    const client = makeNode("client", -90, 105, 170, 100)
    const edges: Edge[] = [
      {
        id: "client-adapter",
        source: "client",
        target: "adapter",
        type: "ClassUnidirectional",
      },
      {
        id: "left-adapter",
        source: "left",
        target: "adapter",
        type: "ClassInheritance",
      },
      {
        id: "right-adapter",
        source: "right",
        target: "adapter",
        type: "ClassInheritance",
      },
    ]

    const { routeById } = computeAllEdgeGeometry(
      base([adapter, left, right, client], edges)
    )

    // The right subclass and adapter overlap by only 25px, so their straight
    // lane would attach near both corners. One clean bend is preferable when it
    // lets each lone side divide itself into two equal stretches.
    expect(routeById["right-adapter"]).toEqual([
      { x: 515, y: 330 },
      { x: 515, y: 155 },
      { x: 460, y: 155 },
    ])
  })

  it("coordinates a live endpoint reconnect against its predicted committed node", () => {
    const target = makeNode("target", 400, 100, 160, 100)
    const siblingSource = makeNode("sibling-source", 350, 400)
    const draggedSource = makeNode("dragged-source", 430, 400)
    const oldTarget = makeNode("old-target", 850, 400)
    const sibling: Edge = {
      id: "sibling",
      source: "sibling-source",
      target: "target",
      type: "ClassUnidirectional",
    }
    const storedDragged: Edge = {
      id: "dragged",
      source: "dragged-source",
      target: "old-target",
      type: "ClassUnidirectional",
    }
    const points = [
      { x: 500, y: 400 },
      { x: 500, y: 200 },
    ]
    const predictedDragged: Edge = {
      ...storedDragged,
      target: "target",
      data: {
        sourceAnchor: { side: Position.Top, ratio: 0.7 },
        targetAnchor: { side: Position.Bottom, ratio: 0.625 },
        points,
      },
    }
    const nodes = [target, siblingSource, draggedSource, oldTarget]
    const live = computeAllEdgeGeometry({
      ...base(nodes, [sibling, storedDragged]),
      liveOverride: {
        edgeId: "dragged",
        points,
        edge: predictedDragged,
        strategy: "predicted",
      },
    }).routeById
    const committed = computeAllEdgeGeometry(
      base(nodes, [sibling, predictedDragged])
    ).routeById

    expect(live).toEqual(committed)
  })

  it("routes a predicted direct reconnect around a bystander exactly as commit does", () => {
    const source = makeNode("source", -400, 0, 120, 80)
    const target = makeNode("target", 400, 0, 120, 80)
    const oldTarget = makeNode("old-target", 400, 300, 120, 80)
    const bystander = makeNode("bystander", 0, 0, 120, 80)
    const stored: Edge = {
      id: "dragged",
      source: "source",
      target: "old-target",
      type: "ClassUnidirectional",
    }
    const predicted: Edge = {
      ...stored,
      target: "target",
      data: {
        sourceAnchor: { side: Position.Right, ratio: 0.5 },
        targetAnchor: { side: Position.Left, ratio: 0.5 },
        points: [],
      },
    }
    const directPreview = [
      { x: -280, y: 40 },
      { x: 400, y: 40 },
    ]
    const nodes = [source, target, oldTarget, bystander]
    const live = computeAllEdgeGeometry({
      ...base(nodes, [stored]),
      liveOverride: {
        edgeId: stored.id,
        points: directPreview,
        edge: predicted,
        strategy: "predicted",
      },
    }).routeById
    const committed = computeAllEdgeGeometry(base(nodes, [predicted])).routeById

    expect(live).toEqual(committed)
    expect(live.dragged).not.toEqual(directPreview)
    expect(
      crossesInterior(live.dragged, {
        x: 0,
        y: 0,
        width: 120,
        height: 80,
      })
    ).toBe(false)
  })

  it("routes a predicted reconnect around authored topology with full map parity", () => {
    const source = makeNode("source", -400, 0, 120, 80)
    const target = makeNode("target", 400, 0, 120, 80)
    const oldTarget = makeNode("old-target", 400, 300, 120, 80)
    const manualSource = makeNode("manual-source", 0, -300, 120, 80)
    const manualTarget = makeNode("manual-target", 240, 300, 120, 80)
    const stored: Edge = {
      id: "dragged",
      source: "source",
      target: "old-target",
      type: "ClassUnidirectional",
    }
    const predicted: Edge = {
      ...stored,
      target: "target",
      data: {
        sourceAnchor: { side: Position.Right, ratio: 0.5 },
        targetAnchor: { side: Position.Left, ratio: 0.5 },
        points: [],
      },
    }
    const authored: Edge = {
      id: "authored",
      source: "manual-source",
      target: "manual-target",
      type: "ClassUnidirectional",
      data: {
        sourceAnchor: { side: Position.Bottom, ratio: 0.5 },
        targetAnchor: { side: Position.Top, ratio: 0.5 },
        points: [
          { x: 60, y: -220 },
          { x: 60, y: 40 },
          { x: 300, y: 40 },
          { x: 300, y: 300 },
        ],
      },
    }
    const directPreview = [
      { x: -280, y: 40 },
      { x: 400, y: 40 },
    ]
    const nodes = [source, target, oldTarget, manualSource, manualTarget]
    const live = computeAllEdgeGeometry({
      ...base(nodes, [authored, stored]),
      liveOverride: {
        edgeId: "dragged",
        points: directPreview,
        edge: predicted,
        strategy: "predicted",
      },
    }).routeById
    const committed = computeAllEdgeGeometry(
      base(nodes, [authored, predicted])
    ).routeById

    expect(live).toEqual(committed)
    expect(live.dragged).not.toEqual(directPreview)
    expect(routeConflictScore(live.dragged, [live.authored]).proximityPx).toBe(
      0
    )
  })

  it("fans two parallel edges onto distinct, evenly separated straight lanes", () => {
    // Two edges between one pair of facing nodes must read as two lines: each a clean
    // straight run, a full lane apart. "Different by a pixel" is not enough.
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 300, 0)
    const { routeById } = computeAllEdgeGeometry(
      base(
        [a, b],
        [
          { id: "e1", source: "a", target: "b", type: "ClassUnidirectional" },
          { id: "e2", source: "a", target: "b", type: "ClassUnidirectional" },
        ]
      )
    )
    const [r1, r2] = [routeById["e1"], routeById["e2"]]
    expect(r1).not.toEqual(r2)
    // Both stay clean straight runs, a full lane apart — not merely "different".
    expect(r1.length).toBe(2)
    expect(r2.length).toBe(2)
    expect(Math.abs(r1[0].y - r2[0].y)).toBeGreaterThanOrEqual(3 * 5)
  })

  it("is byte-identical regardless of the edge input order", () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 340, 120)
    const c = makeNode("c", 40, 260)
    const forward: Edge[] = [
      { id: "e1", source: "a", target: "b", type: "ClassUnidirectional" },
      { id: "e2", source: "a", target: "c", type: "ClassUnidirectional" },
      { id: "e3", source: "c", target: "b", type: "ClassUnidirectional" },
    ]
    const shuffled = [forward[2], forward[0], forward[1]]
    const one = computeAllEdgeGeometry(base([a, b, c], forward)).routeById
    const two = computeAllEdgeGeometry(base([a, b, c], shuffled)).routeById
    expect(two).toEqual(one)
  })

  it("does not oscillate in wide bands while sweeping a node past it", () => {
    // Sweep b's y from far above a to far below while it stays to the right. The
    // exit side should progress U → R → D (roughly) with only isolated one-step
    // blips where a node edge momentarily aligns — NOT the wide, repeated bands a
    // regression in the memoryless chooser would produce. Every route stays clean
    // (≤ 2 bends), and the collapsed run count stays small.
    const runs: string[] = []
    for (let y = -260; y <= 260; y += 5) {
      const a = makeNode("a", 0, 0)
      const b = makeNode("b", 300, y)
      const route = computeAllEdgeGeometry(
        base(
          [a, b],
          [{ id: "e1", source: "a", target: "b", type: "ClassUnidirectional" }]
        )
      ).routeById["e1"]
      expect(route.length - 2).toBeLessThanOrEqual(2) // ≤ 2 bends, always clean
      const side = exitSide(route)
      if (runs[runs.length - 1] !== side) runs.push(side)
    }
    // A clean sweep is ≤ 3 genuine transitions; wide oscillation would blow past.
    expect(runs.length).toBeLessThanOrEqual(4)
  })

  it("is deterministic: an identical layout re-solves byte-for-byte", () => {
    const layout = () => {
      const a = makeNode("a", 0, 0)
      const b = makeNode("b", 260, 140)
      const c = makeNode("c", 300, -40)
      return base(
        [a, b, c],
        [
          { id: "e1", source: "a", target: "b", type: "ClassUnidirectional" },
          { id: "e2", source: "a", target: "c", type: "ClassUnidirectional" },
        ]
      )
    }
    expect(computeAllEdgeGeometry(layout()).routeById).toEqual(
      computeAllEdgeGeometry(layout()).routeById
    )
  })

  it("attaches a diagonal neighbour at a centred anchor with one bend", () => {
    // b sits far below-right of a with no overlap, so one bend is the independent
    // lower bound. Either the right or bottom side can attain it; prescribing one
    // side encodes the old heuristic rather than route quality. What matters is
    // that the chosen side is centred instead of jammed into a corner.
    const a = makeNode("a", 0, 0, 160, 100) // right side spans y 0..100, centre 50
    const b = makeNode("b", 420, 300, 160, 100)
    const { routeById } = computeAllEdgeGeometry(
      base(
        [a, b],
        [{ id: "e1", source: "a", target: "b", type: "ClassUnidirectional" }]
      )
    )
    const route = routeById["e1"]
    expect(route).toHaveLength(3)
    const side = exitSide(route)
    const offCentre =
      side === "L" || side === "R"
        ? Math.abs(route[0].y - 50)
        : Math.abs(route[0].x - 80)
    expect(offCentre).toBeLessThanOrEqual(3 * 5)
  })

  it("fans edges leaving one node side for different partners, in partner order", () => {
    // One source with two edges to targets ABOVE and BELOW it on the same (left)
    // side. Centring each alone would stack both on one point; the node-side fan
    // must give them DISTINCT anchors, ordered so the upper target gets the upper
    // anchor (no crossing).
    const s = makeNode("s", 400, 250, 180, 120) // left side spans y 250..370
    const up = makeNode("up", 0, 210, 40, 40) // partner above
    const down = makeNode("down", 0, 380, 40, 40) // partner below
    const { routeById } = computeAllEdgeGeometry(
      base(
        [s, up, down],
        [
          {
            id: "e-up",
            source: "s",
            target: "up",
            type: "ClassUnidirectional",
          },
          {
            id: "e-down",
            source: "s",
            target: "down",
            type: "ClassUnidirectional",
          },
        ]
      )
    )
    const upAnchor = routeById["e-up"][0]
    const downAnchor = routeById["e-down"][0]
    expect(exitSide(routeById["e-up"])).toBe("L")
    expect(exitSide(routeById["e-down"])).toBe("L")
    expect(upAnchor.y).not.toBe(downAnchor.y) // no collapse onto one point
    expect(upAnchor.y).toBeLessThan(downAnchor.y) // upper partner ⇒ upper anchor
    // Both stay near the side's centre (310), just fanned a lane apart.
    for (const p of [upAnchor, downAnchor])
      expect(Math.abs(p.y - 310)).toBeLessThanOrEqual(2 * 3 * 5)
  })

  it("reflows an existing edge when a tentative sibling joins its target", () => {
    const c = makeNode("C", 400, 100, 160, 100)
    const a = makeNode("A", 350, 400, 160, 100)
    const b = makeNode("B", 430, 400, 160, 100)
    const existing: Edge = {
      id: "AC",
      source: "A",
      target: "C",
      type: "ClassUnidirectional",
      data: { points: [] },
    }
    const before = computeAllEdgeGeometry(base([c, a, b], [existing])).routeById
      .AC
    const pending: Edge = {
      id: "pending",
      source: "B",
      target: "C",
      type: "ClassUnidirectional",
      data: { points: [] },
    }
    const during = computeAllEdgeGeometry(
      base([c, a, b], [existing, pending])
    ).routeById
    expect(during.AC).not.toEqual(before)
  })

  // A node whose type resolves to a specific connection mode (e.g. the
  // four-center merge/decision/gateway nodes). Its anchors are pinned to the four
  // side-midpoints, so the along-side fan cannot slide two of its edges apart.
  const makeTypedNode = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    type: string
  ) => {
    const { node, internal } = makeNode(id, x, y, w, h)
    return { node: { ...node, type } as Node, internal: { ...internal, type } }
  }

  it("does not stack two four-center edges on one node side (activity merge)", () => {
    // The activity-diagram fixture regression: a FOUR-CENTRE merge node with two
    // free source edges — one east to Ship, one south to Backorder. Both would pick
    // the east midpoint (a cost tie the shorter east route used to win), stacking
    // the two edges on one corner. The four-center facing nudge must send the
    // southbound edge out the SOUTH side instead, so the source anchors differ.
    const merge = makeTypedNode("merge", 370, 70, 160, 110, "activityMergeNode")
    const ship = makeTypedNode("ship", 590, 100, 90, 50, "activityActionNode")
    const back = makeTypedNode("back", 490, 230, 160, 120, "activityObjectNode")
    const { routeById } = computeAllEdgeGeometry(
      base(
        [merge, ship, back],
        [
          // Plain step edges (neither straight-path nor straight-hook), like the
          // fixture's ActivityControlFlow.
          {
            id: "e-ship",
            source: "merge",
            target: "ship",
            type: "ActivityFlow",
          },
          {
            id: "e-back",
            source: "merge",
            target: "back",
            type: "ActivityFlow",
          },
        ]
      )
    )
    const shipRoute = routeById["e-ship"]
    const backRoute = routeById["e-back"]
    // Ship stays straight out the east midpoint; Backorder leaves the SOUTH side —
    // distinct source anchors, no coincident stub.
    expect(shipRoute[0]).not.toEqual(backRoute[0])
    expect(exitSide(shipRoute)).toBe("R")
    expect(exitSide(backRoute)).toBe("D")
    // Backorder's south exit is the merge node's bottom midpoint (x 450, y 180).
    expect(backRoute[0]).toEqual({ x: 450, y: 180 })
  })

  it("centres a freeform target anchor on a bending edge (class bidirectional)", () => {
    // The class-diagram bidir edge: Dog (below-left) to IMovable (above-right),
    // both FREEFORM. The IMovable left side spans y 50..160 (centre 105); the target
    // anchor must land at that centre, not creep to a corner. Animal sits between
    // them as an obstacle forcing the bend, mirroring the fixture.
    const dog = makeNode("dog", 80, 280, 200, 130)
    const imov = makeNode("imov", 390, 50, 200, 110)
    const animal = makeNode("animal", 80, 70, 200, 100)
    const { routeById } = computeAllEdgeGeometry(
      base(
        [dog, imov, animal],
        [
          {
            id: "bidir",
            source: "dog",
            target: "imov",
            type: "ClassBidirectional",
          },
        ]
      )
    )
    const route = routeById["bidir"]
    const target = route[route.length - 1]
    // The anchor must be CENTRED on whichever side it enters — never crept into a
    // corner. The side itself is the cost's to choose: entering IMovable's bottom
    // clears Animal in one corner, where entering its left has to get past Animal,
    // so pinning the side here would encode the worse route.
    const enters = exitSide([target, route[route.length - 2]])
    const offCentre =
      enters === "L" || enters === "R"
        ? Math.abs(target.y - (50 + 110 / 2))
        : Math.abs(target.x - (390 + 200 / 2))
    expect(offCentre).toBeLessThanOrEqual(3 * 5)
    // And it must not be driven through Animal, the node sitting between them.
    const throughAnimal = route.slice(0, -1).some((p, i) => {
      const q = route[i + 1]
      return (
        Math.min(p.x, q.x) < 279 &&
        Math.max(p.x, q.x) > 81 &&
        Math.min(p.y, q.y) < 169 &&
        Math.max(p.y, q.y) > 71
      )
    })
    expect(throughAnimal, "route driven through Animal").toBe(false)
  })

  it("does not run an auto route along a THIRD-PARTY node's border (graze)", () => {
    // diagram (23): ClassB (left) to ClassA (right) with ClassC sitting BETWEEN them at
    // the same height. The old auto route drew a straight horizontal line along ClassC's
    // whole bottom border (both anchors dragged off-centre onto that grazing lane). The
    // anchors must now stay centred and the committed route must CLEAR ClassC — never
    // graze or cross a node that is neither endpoint.
    const b = makeNode("b", 335, 245, 160, 100)
    const a = makeNode("a", 750, 185, 160, 100)
    const c = makeNode("c", 545, 165, 160, 100)
    const { routeById } = computeAllEdgeGeometry(
      base(
        [b, a, c],
        [{ id: "e", source: "b", target: "a", type: "ClassUnidirectional" }]
      )
    )
    const route = routeById["e"]
    const cRect = { x: 545, y: 165, width: 160, height: 100 }
    // Distance from a segment's bounding box to ClassC; 0 ⇒ touching or crossing.
    const segToC = (
      p: { x: number; y: number },
      q: { x: number; y: number }
    ) => {
      const dx = Math.max(
        0,
        Math.min(p.x, q.x) - (cRect.x + cRect.width),
        cRect.x - Math.max(p.x, q.x)
      )
      const dy = Math.max(
        0,
        Math.min(p.y, q.y) - (cRect.y + cRect.height),
        cRect.y - Math.max(p.y, q.y)
      )
      return Math.hypot(dx, dy)
    }
    for (let i = 0; i < route.length - 1; i++) {
      expect(
        segToC(route[i], route[i + 1]),
        `segment ${i} of the route grazes/crosses ClassC`
      ).toBeGreaterThan(0)
    }
  })

  it("fans MANY siblings on a sliver of overlap instead of tangling them", () => {
    // diagram (29): four edges between two near-aligned nodes with a tiny facing
    // overlap. Seating all four as parallel STRAIGHT lines clamps them onto one line;
    // the losers then detour into U-turns and spirals (7+ point routes). When the band
    // cannot seat the fan, the siblings must fan along the SIDES instead — a clean
    // single-bend L each, never a spiral.
    const a = makeNode("af43473f", -315, 80, 160, 100)
    const b = makeNode("1f52c36b", 50, 0, 160, 100)
    const { routeById } = computeAllEdgeGeometry(
      base(
        [a, b],
        [
          {
            id: "1dc2e9a9",
            source: "1f52c36b",
            target: "af43473f",
            type: "ClassUnidirectional",
          },
          {
            id: "b74bc00c",
            source: "1f52c36b",
            target: "af43473f",
            type: "ClassUnidirectional",
          },
          {
            id: "17d671b3",
            source: "1f52c36b",
            target: "af43473f",
            type: "ClassUnidirectional",
          },
          {
            id: "55fe20ea",
            source: "af43473f",
            target: "1f52c36b",
            type: "ClassUnidirectional",
          },
        ]
      )
    )
    const ids = ["1dc2e9a9", "b74bc00c", "17d671b3", "55fe20ea"]
    for (const id of ids) {
      const route = routeById[id]
      expect(isOrthogonal(route)).toBe(true)
      // A clean L is 3 points; a clean outer U is 5. Point count alone is only a
      // complexity guard: the real quality conditions below are that siblings do
      // not cross/smudge and that avoiding them does not buy a diagram-sized lap.
      expect(
        route.length,
        `edge ${id} tangled (${route.length} points)`
      ).toBeLessThanOrEqual(5)

      const direct =
        Math.abs(route.at(-1)!.x - route[0].x) +
        Math.abs(route.at(-1)!.y - route[0].y)
      const travelled = route
        .slice(1)
        .reduce(
          (sum, point, index) =>
            sum +
            Math.abs(point.x - route[index].x) +
            Math.abs(point.y - route[index].y),
          0
        )
      expect(
        travelled,
        `edge ${id} takes an excessive detour`
      ).toBeLessThanOrEqual(direct * 1.25)
    }

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const conflict = routeConflictScore(routeById[ids[i]], [
          routeById[ids[j]],
        ])
        expect(conflict.crossings, `${ids[i]} crosses ${ids[j]}`).toBe(0)
        expect(conflict.proximityPx, `${ids[i]} smudges ${ids[j]}`).toBe(0)
      }
    }
  })

  // Do two axis-aligned polylines properly cross (touching at a shared endpoint or
  // running collinear does not count)?
  const routesCross = (
    a: { x: number; y: number }[],
    b: { x: number; y: number }[]
  ): boolean => {
    const segs = (r: { x: number; y: number }[]) =>
      r.slice(0, -1).map((p, i) => ({ p, q: r[i + 1] }))
    for (const s of segs(a)) {
      const sH = s.p.y === s.q.y
      for (const t of segs(b)) {
        const tH = t.p.y === t.q.y
        if (sH === tH) continue // parallel: an overlap is not a crossing
        const h = sH ? s : t
        const v = sH ? t : s
        const hy = h.p.y
        const vx = v.p.x
        const strictlyBetween = (m: number, lo: number, hi: number) =>
          m > Math.min(lo, hi) && m < Math.max(lo, hi)
        if (
          strictlyBetween(vx, h.p.x, h.q.x) &&
          strictlyBetween(hy, v.p.y, v.q.y)
        )
          return true
      }
    }
    return false
  }

  it("routes a FOUR-edge diagonal bundle planar (no crossings)", () => {
    // diagram (30): three edges one way plus one reverse, between diagonal nodes.
    // Every pair must nest — the bundle is fanned on its real attachment sides, so the
    // order at one end mirrors the order at the other across the turn.
    const a = makeNode("af43473f", -315, 80, 160, 100)
    const b = makeNode("1f52c36b", -495, -105, 160, 100)
    const ids = ["1dc2e9a9", "b74bc00c", "17d671b3", "55fe20ea"]
    const { routeById } = computeAllEdgeGeometry(
      base(
        [a, b],
        [
          {
            id: "1dc2e9a9",
            source: "1f52c36b",
            target: "af43473f",
            type: "ClassUnidirectional",
          },
          {
            id: "b74bc00c",
            source: "1f52c36b",
            target: "af43473f",
            type: "ClassUnidirectional",
          },
          {
            id: "17d671b3",
            source: "1f52c36b",
            target: "af43473f",
            type: "ClassUnidirectional",
          },
          {
            id: "55fe20ea",
            source: "af43473f",
            target: "1f52c36b",
            type: "ClassUnidirectional",
          },
        ]
      )
    )
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        expect(
          routesCross(routeById[ids[i]], routeById[ids[j]]),
          `edges ${ids[i]} and ${ids[j]} cross`
        ).toBe(false)
      }
    }
  })

  it("separates edges that converge on one node's side", () => {
    // diagram (36): two edges A→B plus one B→C, and A and C share a centre x, so every
    // endpoint on B ties on the fan's sort key. A lane offset used to eject one A→B edge
    // off B's planned side onto B's bottom, where it landed 5px from the B→C edge.
    // Holding a fanned edge to its planned side keeps the two A→B edges together (fanned
    // on B's left) and the B→C edge alone on B's bottom.
    const A = makeNode("af43473f", -385, 175, 160, 100)
    const B = makeNode("235d66bb", -185, 5, 160, 100)
    const C = makeNode("ca3c1a4b", -385, 330, 160, 100)
    const { routeById } = computeAllEdgeGeometry(
      base(
        [A, B, C],
        [
          {
            id: "7362b4f7",
            source: "235d66bb",
            target: "ca3c1a4b",
            type: "ClassUnidirectional",
          },
          {
            id: "e104c5bc",
            source: "af43473f",
            target: "ca3c1a4b",
            type: "ClassUnidirectional",
          },
          {
            id: "c8809933",
            source: "af43473f",
            target: "235d66bb",
            type: "ClassUnidirectional",
          },
          {
            id: "b652888d",
            source: "af43473f",
            target: "235d66bb",
            type: "ClassUnidirectional",
          },
        ]
      )
    )
    // Every endpoint that touches ClassB.
    const onB = [
      routeById["7362b4f7"][0], // B is this edge's source
      routeById["c8809933"].at(-1)!, // B is this edge's target
      routeById["b652888d"].at(-1)!,
    ]
    for (let i = 0; i < onB.length; i++) {
      for (let j = i + 1; j < onB.length; j++) {
        const gap =
          Math.abs(onB[i].x - onB[j].x) + Math.abs(onB[i].y - onB[j].y)
        expect(
          gap,
          "two edges attach to ClassB too close together"
        ).toBeGreaterThanOrEqual(2 * 5)
      }
    }
  })

  it("keeps a two-edge fork off one node stable as that node moves", () => {
    // diagrams (38)-(40): ClassA forks to ClassB (up-left) and ClassC (up), both edges
    // leaving A's top. As A slides a few px the layout used to flip between a clean
    // pair, an ugly U-detour, and a crossing — because the two edges were separated by
    // a weak nudge with nothing enforcing their order. Slotting each on its aimed lane
    // (they aim at DIFFERENT partners, which orders them) must keep every position in
    // the sweep crossing-free and separated.
    const B = makeNode("235d66bb", -905, 160, 160, 100)
    const C = makeNode("ca3c1a4b", -705, 15, 160, 100)
    for (let ax = -720; ax <= -620; ax += 5) {
      for (let ay = 290; ay <= 310; ay += 5) {
        const A = makeNode("af43473f", ax, ay, 160, 100)
        const { routeById } = computeAllEdgeGeometry(
          base(
            [A, B, C],
            [
              {
                id: "e104c5bc",
                source: "af43473f",
                target: "ca3c1a4b",
                type: "ClassUnidirectional",
              },
              {
                id: "c8809933",
                source: "af43473f",
                target: "235d66bb",
                type: "ClassUnidirectional",
              },
            ]
          )
        )
        const rC = routeById["e104c5bc"]
        const rB = routeById["c8809933"]
        expect(
          routesCross(rC, rB),
          `A at (${ax},${ay}): the fork crosses`
        ).toBe(false)
        const gap = Math.abs(rC[0].x - rB[0].x) + Math.abs(rC[0].y - rB[0].y)
        expect(
          gap,
          `A at (${ax},${ay}): the fork's sources sit on top of each other`
        ).toBeGreaterThanOrEqual(2 * 5)
      }
    }
  })

  it("distributes a fork whose partners lie in different directions onto different sides", () => {
    // diagrams (41)-(42): ClassA sits below-right of BOTH ClassB (far left) and ClassC
    // (up-left). The per-edge cost pass ties between exiting A's top and A's left and
    // broke the tie the same way for both edges, piling them onto one side where they
    // crossed. The two partners are in different angular quadrants (B mostly left, C
    // mostly up), so the edges must leave A on DIFFERENT sides.
    const A = makeNode("af43473f", -525, 260, 160, 100)
    const B = makeNode("235d66bb", -905, 160, 160, 100)
    const C = makeNode("ca3c1a4b", -705, 10, 160, 100)
    const { routeById } = computeAllEdgeGeometry(
      base(
        [A, B, C],
        [
          {
            id: "e104c5bc",
            source: "af43473f",
            target: "ca3c1a4b",
            type: "ClassUnidirectional",
          },
          {
            id: "c8809933",
            source: "af43473f",
            target: "235d66bb",
            type: "ClassUnidirectional",
          },
        ]
      )
    )
    const rC = routeById["e104c5bc"]
    const rB = routeById["c8809933"]
    // The side an edge leaves A on is the axis of its first segment: a vertical first
    // step means it left the top/bottom, a horizontal one the left/right.
    const leavesVertically = (r: { x: number; y: number }[]) =>
      r[0].x === r[1].x
    expect(leavesVertically(rC), "A->C (mostly up) should leave A's top").toBe(
      true
    )
    expect(
      leavesVertically(rB),
      "A->B (mostly left) should leave A's left, not pile onto the top"
    ).toBe(false)
    expect(routesCross(rC, rB), "the fork crosses").toBe(false)
  })
  // ── PINNED (user-anchored) edges ────────────────────────────────────────────
  // Pinning is where the router historically broke: an anchor could be silently
  // ignored, a partially-pinned edge would step instead of running straight, and a
  // bidirectional pair could be mirrored into a crossing the router then looped
  // around. These sweep the pin space and assert the invariants that must always
  // hold, whatever the geometry.

  const SIDE_LIST = [
    Position.Top,
    Position.Right,
    Position.Bottom,
    Position.Left,
  ]

  /** Where a `{side, ratio}` pin must land on a node rect. */
  const pinPoint = (
    r: { x: number; y: number; w: number; h: number },
    side: Position,
    ratio: number
  ) => {
    switch (side) {
      case Position.Top:
        return { x: r.x + r.w * ratio, y: r.y }
      case Position.Bottom:
        return { x: r.x + r.w * ratio, y: r.y + r.h }
      case Position.Left:
        return { x: r.x, y: r.y + r.h * ratio }
      default:
        return { x: r.x + r.w, y: r.y + r.h * ratio }
    }
  }

  it.each([
    [400, -300],
    [400, 0],
    [400, 300],
    [-400, -300],
    [0, -350],
    [0, 350],
    [250, 120],
  ] as const)(
    "honours every pinned anchor exactly with the partner at (%i, %i)",
    (bx, by) => {
      const violations: string[] = []
      for (const pinSide of SIDE_LIST)
        for (const pinRatio of [0.1, 0.35, 0.5, 0.75, 0.9])
          for (const tgtSide of SIDE_LIST) {
            const A = makeNode("aaa", 0, 0, 160, 100)
            const B = makeNode("bbb", bx, by, 160, 100)
            const C = makeNode("ccc", -350, 250, 160, 100)
            const { routeById } = computeAllEdgeGeometry(
              base([A, B, C], [
                {
                  id: "e1",
                  source: "aaa",
                  target: "bbb",
                  type: "ClassUnidirectional",
                  data: {
                    sourceAnchor: { side: pinSide, ratio: pinRatio },
                    targetAnchor: { side: tgtSide, ratio: 0.5 },
                  },
                },
                {
                  id: "e2",
                  source: "aaa",
                  target: "ccc",
                  type: "ClassUnidirectional",
                },
                {
                  id: "e3",
                  source: "bbb",
                  target: "ccc",
                  type: "ClassUnidirectional",
                },
              ] as Edge[])
            )
            const r = routeById["e1"]
            if (!r) {
              violations.push(`missing route pin=${pinSide}/${pinRatio}`)
              continue
            }
            const want = pinPoint(
              { x: 0, y: 0, w: 160, h: 100 },
              pinSide,
              pinRatio
            )
            const dSrc = Math.abs(r[0].x - want.x) + Math.abs(r[0].y - want.y)
            // The stub padding shifts the drawn end a few px along its normal.
            if (dSrc > 12)
              violations.push(
                `source off by ${Math.round(dSrc)} pin=${pinSide}/${pinRatio}`
              )
            const wantT = pinPoint(
              { x: bx, y: by, w: 160, h: 100 },
              tgtSide,
              0.5
            )
            const last = r[r.length - 1]
            const dTgt = Math.abs(last.x - wantT.x) + Math.abs(last.y - wantT.y)
            if (dTgt > 12)
              violations.push(
                `target off by ${Math.round(dTgt)} pin=${pinSide}/${pinRatio} tgt=${tgtSide}`
              )
          }
      expect(violations).toEqual([])
    }
  )

  it("never doubles a pinned edge back over itself", () => {
    // A route that reverses along the axis it just travelled reads as a broken,
    // looping edge — the defect a mis-mirrored bidirectional pair used to produce.
    const retraces: string[] = []
    for (const [bx, by] of [
      [400, -300],
      [400, 0],
      [-400, -300],
      [0, 350],
      [250, 120],
    ])
      for (const pinSide of SIDE_LIST)
        for (const pinRatio of [0.1, 0.5, 0.9]) {
          const A = makeNode("aaa", 0, 0, 160, 100)
          const B = makeNode("bbb", bx, by, 160, 100)
          const { routeById } = computeAllEdgeGeometry(
            base([A, B], [
              {
                id: "e1",
                source: "aaa",
                target: "bbb",
                type: "ClassUnidirectional",
                data: {
                  sourceAnchor: { side: pinSide, ratio: pinRatio },
                },
              },
              {
                id: "e2",
                source: "bbb",
                target: "aaa",
                type: "ClassUnidirectional",
              },
            ] as Edge[])
          )
          for (const id of ["e1", "e2"]) {
            const r = routeById[id]
            if (!r) continue
            for (let i = 1; i < r.length - 1; i++) {
              const dx1 = r[i].x - r[i - 1].x
              const dy1 = r[i].y - r[i - 1].y
              const dx2 = r[i + 1].x - r[i].x
              const dy2 = r[i + 1].y - r[i].y
              if (
                (dx1 * dx2 < 0 && dy1 === 0 && dy2 === 0) ||
                (dy1 * dy2 < 0 && dx1 === 0 && dx2 === 0)
              )
                retraces.push(`${id} pin=${pinSide}/${pinRatio} b=${bx},${by}`)
            }
          }
        }
    expect(retraces.slice(0, 5)).toEqual([])
  })

  it("keeps a bidirectional pair nested, not looped", () => {
    // diagram (61): A<->B. An arbitrary mirror crossed the two edges and the router
    // drew a box around the crossing. They must nest as two clean parallel Ls.
    const C = makeNode("fb7331", 70, 245, 160, 100)
    const B = makeNode("cd6dc2", 380, 375, 160, 100)
    const A = makeNode("49e8e1", 210, 485, 160, 100)
    const { routeById } = computeAllEdgeGeometry(
      base(
        [C, B, A],
        [
          {
            id: "8a7f38",
            source: "49e8e1",
            target: "cd6dc2",
            type: "ClassUnidirectional",
          },
          {
            id: "b35058",
            source: "49e8e1",
            target: "fb7331",
            type: "ClassUnidirectional",
          },
          {
            id: "e16295",
            source: "cd6dc2",
            target: "fb7331",
            type: "ClassUnidirectional",
          },
          {
            id: "0609cc",
            source: "cd6dc2",
            target: "49e8e1",
            type: "ClassUnidirectional",
          },
        ]
      )
    )
    const ab = routeById["8a7f38"]
    const ba = routeById["0609cc"]
    expect(routesCross(ab, ba), "the A<->B pair crosses").toBe(false)
    // Each is a clean single-corner L, not a detour around a crossing.
    expect(ab.length).toBeLessThanOrEqual(3)
    expect(ba.length).toBeLessThanOrEqual(3)
  })
})

describe("cross-peer determinism", () => {
  // The load-bearing contract: anchors are derived, never stored, so two Yjs peers
  // and a reload must derive byte-identical geometry. Two peers see the SAME model
  // but not necessarily in the same array order (CRDT merge, map iteration), and the
  // solver is greedy in id order — so the output must not depend on how the nodes and
  // edges happen to be arranged in their arrays. Ordering the WHOLE solver under a
  // shuffle exercises the greedy walk, the caches and every sort tie-break at once —
  // the class of regression that a single-client test cannot see.
  const solve = (
    nodes: { node: Node; internal: InternalNode }[],
    edges: Edge[]
  ) =>
    computeAllEdgeGeometry({
      nodes: nodes.map((n) => n.node),
      nodeLookup: new Map(nodes.map((n) => [n.node.id, n.internal])) as Map<
        string,
        InternalNode
      >,
      connectionMode: ConnectionMode.Loose,
      edges,
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
    }).routeById

  const canonical = (routes: Record<string, { x: number; y: number }[]>) =>
    Object.keys(routes)
      .sort()
      .map((id) => `${id}:${JSON.stringify(routes[id])}`)
      .join("|")

  it("is invariant to node and edge array order", () => {
    // A fan, a bundle, a crossing and an offset pair — enough interaction that a
    // non-total comparator or an order-dependent cache would diverge.
    // A hub with eight satellites all around it, each also linked to its neighbours —
    // so every side of the hub is contended and the greedy walk's occupancy and
    // crossing accumulation genuinely depend on processing order. Plus parallel
    // siblings, which tie on the along-side coordinate and rest entirely on the
    // tie-break. If any of that leaks array order into the result, a shuffle diverges.
    const ring = 8
    const nodes = [makeNode("hub", 400, 400, 160, 100)]
    for (let i = 0; i < ring; i++) {
      const ang = (i / ring) * Math.PI * 2
      nodes.push(
        makeNode(
          `s${i}`,
          Math.round(400 + 360 * Math.cos(ang)),
          Math.round(400 + 360 * Math.sin(ang)),
          160,
          100
        )
      )
    }
    const edges: Edge[] = []
    for (let i = 0; i < ring; i++) {
      edges.push({
        id: `hub${i}`,
        source: `s${i}`,
        target: "hub",
        type: "ClassUnidirectional",
      })
      edges.push({
        id: `ring${i}`,
        source: `s${i}`,
        target: `s${(i + 1) % ring}`,
        type: "ClassBidirectional",
      })
    }
    edges.push(
      { id: "par1", source: "s0", target: "hub", type: "ClassDependency" },
      { id: "par2", source: "s0", target: "hub", type: "ClassAggregation" }
    )
    const expected = canonical(solve(nodes, edges))

    // Deterministic shuffles (no Math.random) of both arrays must all agree.
    let seed = 987654321
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed
    }
    const shuffled = <T>(xs: T[]): T[] => {
      const out = [...xs]
      for (let i = out.length - 1; i > 0; i--) {
        const j = next() % (i + 1)
        ;[out[i], out[j]] = [out[j], out[i]]
      }
      return out
    }
    for (let trial = 0; trial < 30; trial++) {
      expect(canonical(solve(shuffled(nodes), shuffled(edges)))).toBe(expected)
    }
  })
})

describe("polylineIntersectsBox — neighbour segment detection", () => {
  const box = { minX: 300, maxX: 400, minY: 480, maxY: 520 }
  const hit = (pl: { x: number; y: number }[]) =>
    polylineIntersectsBox(pl, box.minX, box.maxX, box.minY, box.maxY)

  it("finds a long segment that spans the box with BOTH ends far outside it", () => {
    // The bug this guards: a 2000px horizontal run crossing the query box, its two
    // vertices several cells away on either side. Vertex-only detection missed it, so
    // a later edge could be drawn straight over it. The segment test must catch it.
    expect(
      hit([
        { x: 0, y: 500 },
        { x: 2000, y: 500 },
      ])
    ).toBe(true)
    // Same for a vertical run.
    expect(
      hit([
        { x: 350, y: -1000 },
        { x: 350, y: 1000 },
      ])
    ).toBe(true)
  })

  it("finds a spanning segment in the MIDDLE of a longer polyline", () => {
    expect(
      hit([
        { x: 0, y: 0 },
        { x: 0, y: 500 },
        { x: 2000, y: 500 }, // this middle run crosses the box
        { x: 2000, y: 0 },
      ])
    ).toBe(true)
  })

  it("rejects a polyline that stays entirely outside the box", () => {
    expect(
      hit([
        { x: 0, y: 0 },
        { x: 2000, y: 0 }, // well above the box
        { x: 2000, y: 100 },
      ])
    ).toBe(false)
  })
})
