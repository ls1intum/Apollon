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
  height = 80
): TestNode => {
  const node = {
    id,
    type: "syntaxTreeNonterminal",
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

  it("auto-bends around a node sitting directly in the path (Track D)", () => {
    // Blocker C straddles the horizontal chord between A and B.
    const blocker = makeNode("c", 210, -20, 100, 120)
    const nodes = [makeNode("a", 0, 0), makeNode("b", 520, 0), blocker]
    const { routeById } = computeAllEdgeGeometry(
      solverInput(nodes, [straightHookEdge()])
    )
    const route = routeById["e1"]
    expect(route.length).toBeGreaterThan(2)
    const blockerRect = { x: 210, y: -20, width: 100, height: 120 }
    for (let i = 0; i < route.length - 1; i++) {
      expect(segIntersectsRect(route[i], route[i + 1], blockerRect)).toBe(false)
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
