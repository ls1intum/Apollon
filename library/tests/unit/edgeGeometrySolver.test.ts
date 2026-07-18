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

/** The side an edge leaves a node on, read off the route's first segment. */
const exitSide = (route: { x: number; y: number }[]): string => {
  const [a, b] = route
  if (Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)) return b.x >= a.x ? "R" : "L"
  return b.y >= a.y ? "D" : "U"
}

describe("computeAllEdgeGeometry — auto anchor optimization", () => {
  const base = (nodes: { node: Node; internal: unknown }[], edges: Edge[]) => ({
    nodes: nodes.map((n) => n.node),
    nodeLookup: new Map(nodes.map((n) => [n.node.id, n.internal])) as Map<
      string,
      any
    >,
    connectionMode: ConnectionMode.Loose,
    edges,
    straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
    straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
  })

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

  it("attaches a diagonal neighbour at a CENTRED anchor, not a corner", () => {
    // b sits far below-right of a with no vertical overlap, so the edge must bend.
    // The anchor must leave a's right side near its CENTRE (y≈50) — not jam into the
    // bottom corner (y≈90) the way aiming-then-corner-clamping used to.
    const a = makeNode("a", 0, 0, 160, 100) // right side spans y 0..100, centre 50
    const b = makeNode("b", 420, 300, 160, 100)
    const { routeById } = computeAllEdgeGeometry(
      base(
        [a, b],
        [{ id: "e1", source: "a", target: "b", type: "ClassUnidirectional" }]
      )
    )
    const route = routeById["e1"]
    expect(exitSide(route)).toBe("R")
    expect(Math.abs(route[0].y - 50)).toBeLessThanOrEqual(3 * 5) // within a lane of centre
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
    expect(exitSide([target, route[route.length - 2]])).toBe("L") // enters left side
    // Within a lane of IMovable's left-side centre (y 105), not the corner (y 160/50).
    expect(Math.abs(target.y - 105)).toBeLessThanOrEqual(3 * 5)
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
    for (const id of ["1dc2e9a9", "b74bc00c", "17d671b3", "55fe20ea"]) {
      const route = routeById[id]
      expect(isOrthogonal(route)).toBe(true)
      // A clean L is 3 points (2 bends); allow one extra corner. A U-turn/spiral is 6+.
      expect(
        route.length,
        `edge ${id} tangled (${route.length} points)`
      ).toBeLessThanOrEqual(4)
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
})
