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
  computeConnectionPreviewRoute,
  type SolverInput,
} from "@/utils/geometry/edgeGeometrySolver"
import { getEdgeObstacles } from "@/utils/geometry/obstacles"
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
    position: { x, y },
    width,
    height,
    measured: { width, height },
    data: {},
    type: "Class",
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

const input = (
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

const edge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
  type: "ClassUnidirectional",
})

const bends = (route: readonly IPoint[]): number =>
  Math.max(0, route.length - 2)

const length = (route: readonly IPoint[]): number =>
  route.slice(1).reduce((sum, point, index) => {
    const previous = route[index]
    return sum + Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y)
  }, 0)

const openCrossings = (
  first: readonly IPoint[],
  second: readonly IPoint[]
): number => {
  let count = 0
  for (let i = 0; i < first.length - 1; i++) {
    const a = first[i]
    const b = first[i + 1]
    for (let j = 0; j < second.length - 1; j++) {
      const c = second[j]
      const d = second[j + 1]
      const firstHorizontal = a.y === b.y
      const secondHorizontal = c.y === d.y
      if (firstHorizontal === secondHorizontal) continue
      const horizontal = firstHorizontal ? [a, b] : [c, d]
      const vertical = firstHorizontal ? [c, d] : [a, b]
      if (
        vertical[0].x > Math.min(horizontal[0].x, horizontal[1].x) &&
        vertical[0].x < Math.max(horizontal[0].x, horizontal[1].x) &&
        horizontal[0].y > Math.min(vertical[0].y, vertical[1].y) &&
        horizontal[0].y < Math.max(vertical[0].y, vertical[1].y)
      )
        count++
    }
  }
  return count
}

const mapRoute = (
  route: readonly IPoint[],
  transform: (point: IPoint) => IPoint
): IPoint[] => route.map(transform)

const mapNode = (
  value: TestNode,
  transformRect: (
    x: number,
    y: number,
    width: number,
    height: number
  ) => { x: number; y: number; width: number; height: number }
): TestNode => {
  const width = value.node.measured!.width!
  const height = value.node.measured!.height!
  const rect = transformRect(
    value.node.position.x,
    value.node.position.y,
    width,
    height
  )
  return makeNode(value.node.id, rect.x, rect.y, rect.width, rect.height)
}

describe("edge geometry — independent small-layout oracle", () => {
  it("attains the bend lower bound for every obstacle-free relative quadrant", () => {
    // For disjoint axis-aligned rectangles, a facing cardinal pair has a
    // zero-bend route. A diagonally separated pair cannot be joined by one
    // segment, but always admits a one-bend monotone route. Those are geometric
    // lower bounds, independent of the router's scoring weights or implementation.
    const offsets = [-420, -240, 0, 240, 420]
    for (const x of offsets) {
      for (const y of offsets) {
        if (x === 0 && y === 0) continue
        const a = makeNode("a", 0, 0)
        const b = makeNode("b", x, y)
        const horizontallySeparated = x >= 120 || x <= -120
        const verticallySeparated = y >= 80 || y <= -80
        if (!horizontallySeparated && !verticallySeparated) continue

        const route = computeAllEdgeGeometry(
          input([a, b], [edge("e", "a", "b")])
        ).routeById.e
        const lowerBound = horizontallySeparated && verticallySeparated ? 1 : 0
        expect(
          bends(route),
          `offset (${x}, ${y}) should attain its bend lower bound`
        ).toBe(lowerBound)
      }
    }
  })

  it("uses the exact shortest straight route in every cardinal direction", () => {
    const cases = [
      { x: 300, y: 0, gap: 180 },
      { x: -300, y: 0, gap: 180 },
      { x: 0, y: 260, gap: 180 },
      { x: 0, y: -260, gap: 180 },
    ]
    for (const { x, y, gap } of cases) {
      const a = makeNode("a", 0, 0)
      const b = makeNode("b", x, y)
      const route = computeAllEdgeGeometry(input([a, b], [edge("e", "a", "b")]))
        .routeById.e
      expect(route, `cardinal offset (${x}, ${y})`).toHaveLength(2)
      expect(length(route), `cardinal offset (${x}, ${y})`).toBe(gap)
    }
  })
})

describe("edge geometry — metamorphic invariants", () => {
  const fixture = () => [
    makeNode("source", 20, 30, 120, 80),
    makeNode("target", 520, 230, 140, 100),
    makeNode("blocker", 250, 60, 110, 190),
  ]

  it("is equivariant under translation", () => {
    const originalNodes = fixture()
    const original = computeAllEdgeGeometry(
      input(originalNodes, [edge("route", "source", "target")])
    ).routeById.route
    const dx = 375
    const dy = -215
    const translatedNodes = originalNodes.map((node) =>
      mapNode(node, (x, y, width, height) => ({
        x: x + dx,
        y: y + dy,
        width,
        height,
      }))
    )
    const translated = computeAllEdgeGeometry(
      input(translatedNodes, [edge("route", "source", "target")])
    ).routeById.route
    expect(translated).toEqual(
      mapRoute(original, ({ x, y }) => ({ x: x + dx, y: y + dy }))
    )
  })

  it("is equivariant under horizontal reflection", () => {
    const originalNodes = fixture()
    const original = computeAllEdgeGeometry(
      input(originalNodes, [edge("route", "source", "target")])
    ).routeById.route
    const reflectedNodes = originalNodes.map((node) =>
      mapNode(node, (x, y, width, height) => ({
        x: -x - width,
        y,
        width,
        height,
      }))
    )
    const reflected = computeAllEdgeGeometry(
      input(reflectedNodes, [edge("route", "source", "target")])
    ).routeById.route
    expect(reflected).toEqual(mapRoute(original, ({ x, y }) => ({ x: -x, y })))
  })

  it("is equivariant under a quarter turn", () => {
    const originalNodes = fixture()
    const original = computeAllEdgeGeometry(
      input(originalNodes, [edge("route", "source", "target")])
    ).routeById.route
    const rotatedNodes = originalNodes.map((node) =>
      mapNode(node, (x, y, width, height) => ({
        x: -y - height,
        y: x,
        width: height,
        height: width,
      }))
    )
    const rotated = computeAllEdgeGeometry(
      input(rotatedNodes, [edge("route", "source", "target")])
    ).routeById.route
    expect(rotated).toEqual(mapRoute(original, ({ x, y }) => ({ x: -y, y: x })))
  })

  it("does not depend on node array or lookup insertion order", () => {
    const nodes = fixture()
    const edges = [
      edge("one", "source", "target"),
      edge("two", "source", "blocker"),
    ]
    const forward = computeAllEdgeGeometry(input(nodes, edges)).routeById
    const reversed = computeAllEdgeGeometry(
      input([...nodes].reverse(), edges)
    ).routeById
    expect(reversed).toEqual(forward)
  })

  it("does not use edge IDs as geometric input", () => {
    // The two edges are intentionally not symmetric, so IDs are not resolving an
    // exact geometric tie. Renaming them must not change either semantic route.
    const nodes = [
      makeNode("leftTop", 0, 0),
      makeNode("leftBottom", 40, 360),
      makeNode("rightTop", 520, 20),
      makeNode("rightBottom", 650, 300),
      makeNode("blocker", 300, 110, 90, 180),
    ]
    const before = computeAllEdgeGeometry(
      input(nodes, [
        edge("a-first", "leftTop", "rightBottom"),
        edge("z-second", "leftBottom", "rightTop"),
      ])
    ).routeById
    const after = computeAllEdgeGeometry(
      input(nodes, [
        edge("z-renamed", "leftTop", "rightBottom"),
        edge("a-renamed", "leftBottom", "rightTop"),
      ])
    ).routeById
    expect(after["z-renamed"]).toEqual(before["a-first"])
    expect(after["a-renamed"]).toEqual(before["z-second"])
  })

  it("does not let renamed fan arms claim different shared-node ports", () => {
    const nodes = [
      makeNode("c", 0, 0, 120, 80),
      makeNode("p0", -50, 180, 80, 80),
      makeNode("p1", -540, 440, 160, 60),
      makeNode("p2", -450, 330, 120, 120),
      makeNode("p3", -430, 80, 80, 80),
    ]
    const partners = ["p0", "p1", "p2", "p3"]
    const beforeIds = ["a", "b", "c", "d"]
    const afterIds = ["z", "y", "x", "w"]
    const before = computeAllEdgeGeometry(
      input(
        nodes,
        partners.map((partner, i) => edge(beforeIds[i], "c", partner))
      )
    ).routeById
    const after = computeAllEdgeGeometry(
      input(
        nodes,
        partners.map((partner, i) => edge(afterIds[i], "c", partner))
      )
    ).routeById

    partners.forEach((_, index) =>
      expect(after[afterIds[index]]).toEqual(before[beforeIds[index]])
    )
  })

  it("keeps an adversarial four-arm fan crossing-free", () => {
    const nodes = [
      makeNode("c", 0, 0, 120, 80),
      makeNode("p0", -370, -350),
      makeNode("p1", -440, -210),
      makeNode("p2", -310, -220),
      makeNode("p3", 450, 200),
    ]
    const routes = computeAllEdgeGeometry(
      input(
        nodes,
        ["p0", "p1", "p2", "p3"].map((partner, index) =>
          edge(`e${index}`, "c", partner)
        )
      )
    ).routeById
    const values = Object.values(routes)
    for (let i = 0; i < values.length; i++)
      for (let j = i + 1; j < values.length; j++)
        expect(openCrossings(values[i], values[j])).toBe(0)
  })

  it("keeps small-diagram route-set refinement invariant under edge permutation", () => {
    const nodes = [
      makeNode("c", 0, 0, 120, 80),
      makeNode("p0", -370, -350),
      makeNode("p1", -440, -210),
      makeNode("p2", -310, -220),
      makeNode("p3", 450, 200),
    ]
    const edges = ["p0", "p1", "p2", "p3"].map((partner, index) =>
      edge(`e${index}`, "c", partner)
    )
    const expected = computeAllEdgeGeometry(input(nodes, edges)).routeById
    for (const permutation of [
      [...edges].reverse(),
      [edges[2], edges[0], edges[3], edges[1]],
    ]) {
      const actual = computeAllEdgeGeometry(input(nodes, permutation)).routeById
      for (const edge of edges)
        expect(actual[edge.id]).toEqual(expected[edge.id])
    }
  })

  it("does not disable a conflict component when a remote ninth edge is added", () => {
    const fanNodes = [
      makeNode("c", 0, 0, 120, 80),
      makeNode("p0", -370, -350),
      makeNode("p1", -440, -210),
      makeNode("p2", -310, -220),
      makeNode("p3", 450, 200),
    ]
    const fanEdges = ["p0", "p1", "p2", "p3"].map((partner, index) =>
      edge(`fan${index}`, "c", partner)
    )
    const remoteNodes: TestNode[] = []
    const remoteEdges: Edge[] = []
    for (let index = 0; index < 5; index++) {
      const y = 1_000 + index * 180
      remoteNodes.push(
        makeNode(`remote-a${index}`, 0, y),
        makeNode(`remote-b${index}`, 320, y)
      )
      remoteEdges.push(
        edge(`remote${index}`, `remote-a${index}`, `remote-b${index}`)
      )
    }

    const eight = computeAllEdgeGeometry(
      input(
        [...fanNodes, ...remoteNodes.slice(0, 8)],
        [...fanEdges, ...remoteEdges.slice(0, 4)]
      )
    ).routeById
    const nine = computeAllEdgeGeometry(
      input([...fanNodes, ...remoteNodes], [...fanEdges, ...remoteEdges])
    ).routeById

    for (const existing of [...fanEdges, ...remoteEdges.slice(0, 4)])
      expect(nine[existing.id]).toEqual(eight[existing.id])
  })

  it("keeps warm-cache and fresh solves equal through moves and permutations", () => {
    const cache = new Map()
    for (const shift of [0, 35, -20, 70]) {
      const nodes = fixture()
      const target = nodes.find(({ node }) => node.id === "target")!
      const moved = mapNode(target, (x, y, width, height) => ({
        x,
        y: y + shift,
        width,
        height,
      }))
      const frame = [nodes[2], moved, nodes[0]]
      const frameInput = input(frame, [edge("route", "source", "target")])
      const cached = computeAllEdgeGeometry({
        ...frameInput,
        solveCache: cache,
      }).routeById
      const fresh = computeAllEdgeGeometry(frameInput).routeById
      expect(cached, `target shift ${shift}`).toEqual(fresh)
    }
  })
})

describe("edge geometry — preview/commit parity", () => {
  it("commits exactly the route shown by a new-connection preview", () => {
    const nodes = [
      makeNode("source", 0, 20, 120, 80),
      makeNode("target", 520, 230, 140, 100),
      makeNode("blocker", 250, 60, 100, 210),
    ]
    const solverInput = input(nodes, [edge("committed", "source", "target")])
    const sourcePoint = { x: 120, y: 60 }
    const targetPoint = { x: 520, y: 280 }
    const obstacles = getEdgeObstacles(
      solverInput.nodes,
      "source",
      "target",
      sourcePoint,
      targetPoint
    )
    const preview = computeConnectionPreviewRoute({
      sourceId: "source",
      targetId: "target",
      edgeType: "ClassUnidirectional",
      enableStraightPath: true,
      nodes: solverInput.nodes,
      nodeLookup: solverInput.nodeLookup,
      connectionMode: solverInput.connectionMode,
      obstacles,
      neighborEdges: [],
    })
    const committed = computeAllEdgeGeometry(solverInput).routeById.committed
    expect(preview).not.toBeNull()
    expect(committed).toEqual(preview)
  })
})
