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
    // Obstacle avoidance applies to general-graph straight edges (use-case /
    // petri), NOT to syntax-tree links (those stay straight — see below). Blocker C
    // straddles the horizontal chord between A and B.
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

  it("keeps a syntax-tree link straight through a blocker (tidy layout, not routing)", () => {
    // A dense hand-drawn tree must not sprout obstacle-avoidance bends; overlaps
    // are the tidy-tree layout's job.
    const blocker = makeNode("c", 210, -20, 100, 120)
    const nodes = [makeNode("a", 0, 0, 120, 80), makeNode("b", 520, 0), blocker]
    const { routeById } = computeAllEdgeGeometry(
      solverInput(nodes, [straightHookEdge()])
    )
    expect(routeById["e1"]).toHaveLength(2)
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
