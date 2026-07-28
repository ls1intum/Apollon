import { describe, expect, it } from "vitest"
import {
  ConnectionMode,
  Position,
  type Edge,
  type InternalNode,
  type Node,
} from "@xyflow/react"
import {
  computeAllEdgeGeometry,
  type SolverInput,
} from "@/utils/geometry/edgeGeometrySolver"
import {
  STRAIGHT_HOOK_EDGE_TYPES,
  STRAIGHT_PATH_STEP_EDGE_TYPES,
} from "@/edges/edgeRoutingBehavior"
import type { IPoint } from "@/edges/Connection"

type TestNode = { node: Node; internal: InternalNode }

const makeNode = (
  id: string,
  x: number,
  y: number,
  width = 120,
  height = 80,
  type = "syntaxTreeNonterminal"
): TestNode => {
  const node = {
    id,
    type,
    position: { x, y },
    width,
    height,
    measured: { width, height },
    data: {},
  } as Node
  const internal = {
    ...node,
    internals: {
      positionAbsolute: { x, y },
      handleBounds: {
        source: [
          {
            id: null,
            type: "source",
            position: Position.Right,
            x: width,
            y: height / 2,
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
            y: height / 2,
            width: 1,
            height: 1,
          },
        ],
      },
    },
  } as unknown as InternalNode
  return { node, internal }
}

const solverInput = (
  nodes: readonly TestNode[],
  edges: readonly Edge[]
): SolverInput => ({
  nodes: nodes.map(({ node }) => node),
  nodeLookup: new Map(nodes.map(({ node, internal }) => [node.id, internal])),
  connectionMode: ConnectionMode.Loose,
  edges,
  straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
  straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
})

const straightHookEdge = (points?: IPoint[]): Edge => ({
  id: "e1",
  source: "a",
  target: "b",
  type: "SyntaxTreeLink",
  sourceHandle: null,
  targetHandle: null,
  data: points ? { points } : {},
})

const segIntersectsRect = (
  a: IPoint,
  b: IPoint,
  rect: { x: number; y: number; width: number; height: number }
): boolean => {
  // Sample the segment densely and check strict-interior containment.
  const steps = 200
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const px = a.x + (b.x - a.x) * t
    const py = a.y + (b.y - a.y) * t
    if (
      px > rect.x &&
      px < rect.x + rect.width &&
      py > rect.y &&
      py < rect.y + rect.height
    ) {
      return true
    }
  }
  return false
}

describe("straight-hook edge routing", () => {
  it("passes authored interior waypoints through as diagonal segments (no orthogonalisation)", () => {
    const nodes = [makeNode("a", 0, 0), makeNode("b", 400, 0)]
    // An off-axis waypoint that an orthogonal reprojection would rewrite into H/V.
    const waypoint = { x: 280, y: 200 }
    const { routeById } = computeAllEdgeGeometry(
      solverInput(nodes, [straightHookEdge([waypoint])])
    )
    const route = routeById["e1"]
    expect(route).toHaveLength(3)
    // The waypoint is honoured verbatim — proof it was NOT snapped to a staircase.
    expect(route[1]).toEqual(waypoint)
    // Endpoints attach to the node sides (right of A, left of B).
    expect(route[0].x).toBeGreaterThan(100)
    expect(route[route.length - 1].x).toBeLessThan(420)
  })

  it("keeps an unobstructed connection straight (a 2-point line)", () => {
    const nodes = [makeNode("a", 0, 0), makeNode("b", 400, 0)]
    const { routeById } = computeAllEdgeGeometry(
      solverInput(nodes, [straightHookEdge()])
    )
    expect(routeById["e1"]).toHaveLength(2)
  })

  it("auto-bends a general-graph (use-case) edge around a blocking node", () => {
    // Blocker C straddles the horizontal chord between A and B.
    const t = "useCaseActor"
    const blocker = makeNode("c", 210, -20, 100, 120, t)
    const nodes = [
      makeNode("a", 0, 0, 120, 80, t),
      makeNode("b", 520, 0, 120, 80, t),
      blocker,
    ]
    const useCaseEdge: Edge = {
      id: "e1",
      source: "a",
      target: "b",
      type: "UseCaseAssociation",
      sourceHandle: null,
      targetHandle: null,
      data: {},
    }
    const { routeById } = computeAllEdgeGeometry(
      solverInput(nodes, [useCaseEdge])
    )
    const route = routeById["e1"]
    expect(route.length).toBeGreaterThan(2)
    const blockerRect = { x: 210, y: -20, width: 100, height: 120 }
    for (let i = 0; i < route.length - 1; i++) {
      expect(segIntersectsRect(route[i], route[i + 1], blockerRect)).toBe(false)
    }
  })

  it("bends a syntax-tree link around a blocker without grazing either node", () => {
    const blocker = makeNode("c", 210, -20, 100, 120)
    const nodes = [makeNode("a", 0, 0, 120, 80), makeNode("b", 520, 0), blocker]
    const { routeById } = computeAllEdgeGeometry(
      solverInput(nodes, [straightHookEdge()])
    )
    const route = routeById["e1"]
    expect(route.length).toBeGreaterThan(2)
    const blockerRect = { x: 210, y: -20, width: 100, height: 120 }
    for (let i = 0; i < route.length - 1; i++) {
      expect(segIntersectsRect(route[i], route[i + 1], blockerRect)).toBe(false)
    }
    // The detour stays economical: one corner, not a staircase of kinks.
    expect(route.length).toBeLessThanOrEqual(4)
  })

  it("leaves a node squarely rather than grazing along its side", () => {
    // A blocker directly under the source used to make the route slide out
    // sideways along the node's own edge (a 90-degree "exit angle") before
    // turning. The endpoint-angle term prices that above spending a corner.
    const blocker = makeNode("c", 150, 140, 120, 80)
    const nodes = [
      makeNode("a", 150, 0, 120, 80),
      makeNode("b", 420, 320, 120, 80),
      blocker,
    ]
    const { routeById } = computeAllEdgeGeometry(
      solverInput(nodes, [straightHookEdge()])
    )
    const route = routeById["e1"]
    const source = { ...makeNode("a", 150, 0, 120, 80).node.position }
    const rect = { x: source.x, y: source.y, width: 120, height: 80 }
    // Outward normal of whichever side the route departs from.
    const p = route[0]
    const distances = [
      { n: { x: -1, y: 0 }, d: Math.abs(p.x - rect.x) },
      { n: { x: 1, y: 0 }, d: Math.abs(p.x - (rect.x + rect.width)) },
      { n: { x: 0, y: -1 }, d: Math.abs(p.y - rect.y) },
      { n: { x: 0, y: 1 }, d: Math.abs(p.y - (rect.y + rect.height)) },
    ].sort((a, b) => a.d - b.d)
    const normal = distances[0].n
    const dir = { x: route[1].x - p.x, y: route[1].y - p.y }
    const len = Math.hypot(dir.x, dir.y)
    const cos = (dir.x * normal.x + dir.y * normal.y) / len
    const degrees = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
    expect(degrees).toBeLessThan(75)
  })

  it("attaches at the facing side with a centred port (not the drawn handle)", () => {
    // Parent directly above child. The facing sides are parent-bottom / child-top,
    // even though the edge was drawn on the right/left handles.
    const nodes = [makeNode("a", 0, 0, 100, 60), makeNode("b", 0, 300, 100, 60)]
    const { routeById } = computeAllEdgeGeometry(
      solverInput(nodes, [straightHookEdge()])
    )
    const route = routeById["e1"]
    const source = route[0]
    const target = route[route.length - 1]
    // Source sits on the parent's BOTTOM edge (y≈60), centred (x≈50) — not on a
    // left/right handle (x≈0 or 100).
    expect(Math.abs(source.y - 60)).toBeLessThanOrEqual(6)
    expect(source.x).toBeGreaterThan(35)
    expect(source.x).toBeLessThan(65)
    // Target sits on the child's TOP edge (y≈300), centred.
    expect(Math.abs(target.y - 300)).toBeLessThanOrEqual(6)
    expect(target.x).toBeGreaterThan(35)
    expect(target.x).toBeLessThan(65)
  })

  it("balances multiple children across a parent's facing side", () => {
    // A parent with three children below it: their source ports should spread
    // across the parent's bottom side rather than stacking on one point.
    const parent = makeNode("p", 200, 0, 120, 60)
    const c1 = makeNode("c1", 0, 300, 100, 60)
    const c2 = makeNode("c2", 200, 300, 100, 60)
    const c3 = makeNode("c3", 400, 300, 100, 60)
    const edges: Edge[] = [
      { id: "e1", source: "p", target: "c1", type: "SyntaxTreeLink", data: {} },
      { id: "e2", source: "p", target: "c2", type: "SyntaxTreeLink", data: {} },
      { id: "e3", source: "p", target: "c3", type: "SyntaxTreeLink", data: {} },
    ]
    const { routeById } = computeAllEdgeGeometry(
      solverInput([parent, c1, c2, c3], edges)
    )
    const sourceXs = ["e1", "e2", "e3"]
      .map((id) => routeById[id][0].x)
      .sort((a, b) => a - b)
    // Three distinct ports spread across the parent's bottom side (x in [200,320]).
    expect(new Set(sourceXs).size).toBe(3)
    expect(sourceXs[2] - sourceXs[0]).toBeGreaterThan(20)
    for (const x of sourceXs) {
      expect(x).toBeGreaterThanOrEqual(200)
      expect(x).toBeLessThanOrEqual(320)
    }
  })

  it("spreads a fan evenly and symmetrically, never twice on one port", () => {
    // Five children symmetric about the parent's centre. Their source ports must be
    // five DISTINCT, evenly spaced seats — two edges leaving from one pixel is the
    // degenerate overlap the coordinated band exists to prevent.
    // Placed far enough below that every child is "downward" of the parent, so the
    // whole fan shares one side and the band has to seat all five on it.
    const parent = makeNode("p", 200, 0, 120, 60)
    const kids = [-40, 85, 210, 335, 460].map((x, i) =>
      makeNode(`c${i}`, x, 400, 100, 60)
    )
    const edges: Edge[] = kids.map((_, i) => ({
      id: `e${i}`,
      source: "p",
      target: `c${i}`,
      type: "SyntaxTreeLink",
      data: {},
    }))
    const { routeById } = computeAllEdgeGeometry(
      solverInput([parent, ...kids], edges)
    )
    const ports = edges
      .map((e) => routeById[e.id][0])
      .sort((a, b) => a.x - b.x || a.y - b.y)
    expect(new Set(ports.map((p) => `${p.x},${p.y}`)).size).toBe(ports.length)
    // All on the parent's bottom side, and mirror-symmetric about its centre.
    const centre = 200 + 120 / 2
    expect(ports.every((p) => p.y === 60)).toBe(true)
    for (let i = 0; i < ports.length; i++) {
      const mirrored = ports[ports.length - 1 - i]
      expect(
        Math.abs(2 * centre - ports[i].x - mirrored.x)
      ).toBeLessThanOrEqual(1)
    }
    // Evenly spaced: no gap more than one grid cell off any other.
    const gaps = ports.slice(1).map((p, i) => p.x - ports[i].x)
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(5)
  })

  it("nests sibling detours instead of stacking them on one elbow", () => {
    // Two connectors from the same parent must clear the same obstacle. Shortest
    // paths send both around its corner, so without a ring preference they bend at
    // the identical point and the fan reads as a knot.
    // Real parse-tree geometry: a five-way fan whose two left-hand members must
    // both clear the same column of nodes. Their coordinated seats sit at different
    // distances from the side's centre, which picks different corner rings.
    const parent = makeNode("stmt", 155, 215, 70, 50)
    const column = [
      makeNode("colTop", 55, 385, 70, 50),
      makeNode("colBottom", 55, 460, 70, 50),
    ]
    const kids = [
      makeNode("outer", -35, 550, 50, 50),
      makeNode("inner", 15, 550, 50, 50),
      makeNode("mid", 155, 310, 70, 50),
      makeNode("right1", 315, 550, 50, 50),
      makeNode("right2", 365, 550, 50, 50),
    ]
    const edges: Edge[] = kids.map((k, i) => ({
      id: `e${i}`,
      source: "stmt",
      target: k.node.id,
      type: "SyntaxTreeLink",
      data: {},
    }))
    const { routeById } = computeAllEdgeGeometry(
      solverInput([parent, ...column, ...kids], edges)
    )
    const outerBends = routeById["e0"].slice(1, -1)
    const innerBends = routeById["e1"].slice(1, -1)
    expect(outerBends.length).toBeGreaterThan(0)
    expect(innerBends.length).toBeGreaterThan(0)
    // The two never turn at the same point, so the fan reads as nested rather than
    // knotted at a single shared elbow.
    const shared = outerBends.filter((a) =>
      innerBends.some((b) => a.x === b.x && a.y === b.y)
    )
    expect(shared).toEqual([])
  })

  it("nests both flanks of a symmetric fan identically", () => {
    // Regression: the corner-ring choice compared each seat's distance from its
    // side's centre against the largest on that side. Mirror-paired seats are the
    // same distance out in exact arithmetic but NOT in binary floating point — for a
    // seven-way band, 0.5 - 1/7 and 6/7 - 0.5 differ in the final bit. One flank
    // therefore took the roomy corner ring and the other the tight one, and the
    // drawing was visibly lopsided even though every input was symmetric.
    const AXIS = 190
    const parent = makeNode("stmt", 155, 215, 70, 50)
    const columns = [
      makeNode("colL", 55, 385, 70, 50),
      makeNode("colR", 255, 385, 70, 50),
    ]
    const kids = [
      makeNode("outerL", -35, 550, 50, 50),
      makeNode("innerL", 15, 550, 50, 50),
      makeNode("mid", 155, 310, 70, 50),
      makeNode("innerR", 315, 550, 50, 50),
      makeNode("outerR", 365, 550, 50, 50),
    ]
    const edges: Edge[] = kids.map((k, i) => ({
      id: `e${i}`,
      source: "stmt",
      target: k.node.id,
      type: "SyntaxTreeLink",
      data: {},
    }))
    const { routeById } = computeAllEdgeGeometry(
      solverInput([parent, ...columns, ...kids], edges)
    )
    // e0/e4 are the outer pair, e1/e3 the inner pair.
    for (const [left, right] of [
      ["e0", "e4"],
      ["e1", "e3"],
    ]) {
      const l = routeById[left]
      const r = routeById[right]
      expect(l.length).toBe(r.length)
      for (let i = 0; i < l.length; i++) {
        expect(Math.abs(2 * AXIS - l[i].x - r[i].x)).toBeLessThanOrEqual(1)
        expect(l[i].y).toBe(r[i].y)
      }
    }
    // And the two members of one flank still turn at different points.
    expect(routeById["e0"][1]).not.toEqual(routeById["e1"][1])
  })

  it("routes a mirror-symmetric diagram symmetrically", () => {
    // Everything below is an exact reflection about x = AXIS, including the
    // obstacles, so every route must be the reflection of its partner. Asymmetry
    // here means some decision is resolving on a non-geometric tie-break.
    const AXIS = 300
    const parent = makeNode("p", 260, 0, 80, 60)
    const leftKid = makeNode("kl", 0, 400, 80, 60)
    const rightKid = makeNode("kr", 520, 400, 80, 60)
    const leftBlock = makeNode("bl", 120, 180, 100, 60)
    const rightBlock = makeNode("br", 380, 180, 100, 60)
    const edges: Edge[] = [
      { id: "eL", source: "p", target: "kl", type: "SyntaxTreeLink", data: {} },
      { id: "eR", source: "p", target: "kr", type: "SyntaxTreeLink", data: {} },
    ]
    const { routeById } = computeAllEdgeGeometry(
      solverInput([parent, leftKid, rightKid, leftBlock, rightBlock], edges)
    )
    const left = routeById["eL"]
    const right = routeById["eR"]
    expect(left.length).toBe(right.length)
    for (let i = 0; i < left.length; i++) {
      expect(Math.abs(2 * AXIS - left[i].x - right[i].x)).toBeLessThanOrEqual(1)
      expect(left[i].y).toBe(right[i].y)
    }
  })

  it("does not change topology when a node is nudged one grid cell", () => {
    // Routing is deterministic but not continuous: a small move can in principle
    // flip a side or buy a corner. Generous bend pricing keeps the drawing from
    // reorganising itself under an ordinary drag, which is what a user perceives as
    // the diagram being stable.
    const layout = (dx: number, dy: number) => {
      const nodes = [
        makeNode("a", 150 + dx, 0 + dy, 120, 80),
        makeNode("b", 420, 320, 120, 80),
        makeNode("c", 150, 140, 120, 80),
      ]
      const route = computeAllEdgeGeometry(
        solverInput(nodes, [straightHookEdge()])
      ).routeById["e1"]
      const rect = { x: 150 + dx, y: 0 + dy, width: 120, height: 80 }
      const p = route[0]
      const side = [
        ["L", Math.abs(p.x - rect.x)],
        ["R", Math.abs(p.x - (rect.x + rect.width))],
        ["T", Math.abs(p.y - rect.y)],
        ["B", Math.abs(p.y - (rect.y + rect.height))],
      ].sort((l, r) => (l[1] as number) - (r[1] as number))[0][0]
      return `${side}:${route.length}`
    }
    const base = layout(0, 0)
    for (const [dx, dy] of [
      [5, 0],
      [-5, 0],
      [0, 5],
      [0, -5],
      [5, 5],
      [-5, -5],
    ]) {
      expect(layout(dx, dy)).toBe(base)
    }
  })

  it("is deterministic: a cold re-solve yields byte-identical routes", () => {
    const blocker = makeNode("c", 210, -20, 100, 120)
    const nodes = [makeNode("a", 0, 0), makeNode("b", 520, 0), blocker]
    const first = computeAllEdgeGeometry(
      solverInput(nodes, [straightHookEdge([{ x: 150, y: 120 }])])
    ).routeById["e1"]
    const second = computeAllEdgeGeometry(
      solverInput(nodes, [straightHookEdge([{ x: 150, y: 120 }])])
    ).routeById["e1"]
    expect(second).toEqual(first)
  })
})
