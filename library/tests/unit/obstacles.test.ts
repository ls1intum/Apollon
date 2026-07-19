import { Position } from "@xyflow/react"
import { describe, expect, it } from "vitest"
import { routeOrthogonalPath, type ObstacleRect } from "@/utils/edgeUtils"
import { getEdgeObstacles } from "@/utils/geometry/obstacles"
import type { IPoint } from "@/edges/Connection"

const node = (
  id: string,
  x: number,
  y: number,
  type = "class",
  parentId?: string
) =>
  ({
    id,
    type,
    position: { x, y },
    width: 100,
    height: 60,
    parentId,
    data: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any

const crosses = (route: IPoint[], rect: ObstacleRect): boolean => {
  for (let i = 0; i < route.length - 1; i++) {
    const left = Math.min(route[i].x, route[i + 1].x)
    const right = Math.max(route[i].x, route[i + 1].x)
    const top = Math.min(route[i].y, route[i + 1].y)
    const bottom = Math.max(route[i].y, route[i + 1].y)
    if (
      left < rect.x + rect.width &&
      right > rect.x &&
      top < rect.y + rect.height &&
      bottom > rect.y
    ) {
      return true
    }
  }
  return false
}

describe("obstacle-aware routing", () => {
  const source: IPoint = { x: 100, y: 30 }
  const target: IPoint = { x: 400, y: 30 }

  it("routes around a node standing between the two endpoints", () => {
    const nodes = [node("a", 0, 0), node("b", 400, 0), node("mid", 180, -20)]
    const obstacles = getEdgeObstacles(nodes, "a", "b", source, target)
    // The endpoints' own bodies are obstacles too, alongside the third node in the
    // way — one rect each, the exact body.
    expect([...new Set(obstacles.map((o) => o.id))].sort()).toEqual([
      "a",
      "b",
      "mid",
    ])
    expect(obstacles.find((o) => o.id === "mid")).toBeDefined()

    const direct = routeOrthogonalPath(
      source,
      target,
      Position.Right,
      Position.Left
    )
    const avoided = routeOrthogonalPath(
      source,
      target,
      Position.Right,
      Position.Left,
      obstacles
    )

    const mid = obstacles.find((o) => o.id === "mid")!
    expect(crosses(direct, mid)).toBe(true)
    expect(crosses(avoided, mid)).toBe(false)
  })

  it("does not treat an enclosing package as an obstacle", () => {
    // The whole point of nesting: an edge between two classes inside a package
    // lives INSIDE that package. Treating the parent as solid would make every
    // such edge detour around its own container, or fail to route at all.
    const nodes = [
      node("pkg", 0, 0, "package"),
      node("a", 20, 40, "class", "pkg"),
      node("b", 300, 40, "class", "pkg"),
    ]

    // The package (the ancestor) is never an obstacle; the two class bodies are.
    const ids = getEdgeObstacles(
      nodes,
      "a",
      "b",
      { x: 120, y: 70 },
      { x: 300, y: 70 }
    ).map((o) => o.id)
    expect(ids).not.toContain("pkg")
  })

  it("treats an unrelated container as soft, so it is crossed rather than fatal", () => {
    // A pool spanning the canvas must not make its neighbours unroutable.
    const nodes = [
      node("a", 0, 0),
      node("b", 500, 0),
      node("pool", 150, -100, "bpmnPool"),
    ]
    const obstacles = getEdgeObstacles(nodes, "a", "b", source, {
      x: 500,
      y: 30,
    })

    // The pool is a CONTAINER: soft, and priced at the router's default (no
    // explicit penalty) — near enough to a wall that it is crossed only when
    // going around is hopeless.
    const pool = obstacles.find((o) => o.id === "pool")!
    expect(pool.soft).toBe(true)
    expect(pool.penalty).toBeUndefined()

    // An endpoint contributes exactly ONE rect: its body, solid and un-inflated.
    // The clearance an edge keeps around a node is a PRICE (the router's
    // proximity term), never geometry — a margin rectangle can only say "in" or
    // "out", and the lane along its own border is the one place an edge must
    // never be drawn.
    const endpointRects = obstacles.filter((o) => o.id === "a")
    expect(endpointRects).toHaveLength(1)
    expect(endpointRects[0].soft).toBe(false)
    expect(endpointRects[0]).toMatchObject({
      x: 0,
      y: 0,
      width: 100,
      height: 60,
    })

    const route = routeOrthogonalPath(
      source,
      { x: 500, y: 30 },
      Position.Right,
      Position.Left,
      obstacles
    )
    expect(route.length).toBeGreaterThanOrEqual(2)
  })

  it("re-indexes when a node's type changes but its geometry does not", () => {
    // The per-frame node index is cached on a fingerprint of what it reads. That
    // fingerprint must cover type, not only geometry: a container is SOFT and a leaf
    // is SOLID, so a mid node flipping type without moving must not keep the stale
    // softness — else an edge routes through a now-solid node it should avoid.
    const soft = getEdgeObstacles(
      [node("a", 0, 0), node("b", 500, 0), node("mid", 200, -100, "bpmnPool")],
      "a",
      "b",
      source,
      { x: 500, y: 30 }
    ).find((o) => o.id === "mid")
    expect(soft?.soft).toBe(true)

    const solid = getEdgeObstacles(
      // Same id, position and size — ONLY the type differs.
      [node("a", 0, 0), node("b", 500, 0), node("mid", 200, -100, "class")],
      "a",
      "b",
      source,
      { x: 500, y: 30 }
    ).find((o) => o.id === "mid")
    expect(solid?.soft).toBe(false)
  })

  it("excludes a node sitting on top of an endpoint", () => {
    // Unsolvable otherwise — and an unsolvable route is one that churns.
    const nodes = [
      node("a", 0, 0),
      node("b", 400, 0),
      node("overlapping", 60, 10),
    ]

    // The overlapping third node is dropped; the endpoint bodies remain.
    expect(
      getEdgeObstacles(nodes, "a", "b", source, target).map((o) => o.id)
    ).not.toContain("overlapping")
  })

  it("moves the route smoothly as a blocker is dragged, never popping", () => {
    // The route may follow a node that moves under it, but it must do so in
    // whole grid steps — a sub-pixel flip-flop would read as the edge shimmering.
    const routes = new Set<string>()
    for (let dy = 0; dy < 25; dy++) {
      const nodes = [
        node("a", 0, 0),
        node("b", 400, 0),
        node("mid", 180, -20 + dy),
      ]
      const route = routeOrthogonalPath(
        source,
        target,
        Position.Right,
        Position.Left,
        getEdgeObstacles(nodes, "a", "b", source, target)
      )
      for (const point of route) {
        expect(Math.abs(point.x % 5)).toBe(0)
        expect(Math.abs(point.y % 5)).toBe(0)
      }
      routes.add(route.map((p) => `${p.x},${p.y}`).join(" "))
    }

    // It tracks the node rather than re-thinking itself: far fewer distinct
    // routes than the 25 positions that produced them.
    expect(routes.size).toBeLessThanOrEqual(8)
  })

  it("never routes across its own source or target body", () => {
    // The source exits LEFT while the target is to its RIGHT, so the edge has to
    // U-turn back across the source. It must go around the source body, never
    // through it — the bug was excluding the endpoints from the obstacle set.
    const a = node("a", 100, 0)
    const b = node("b", 400, 0)
    const sourceOnLeft: IPoint = { x: 100, y: 30 }
    const targetOnLeft: IPoint = { x: 400, y: 30 }
    const obstacles = getEdgeObstacles(
      [a, b],
      "a",
      "b",
      sourceOnLeft,
      targetOnLeft
    )
    const route = routeOrthogonalPath(
      sourceOnLeft,
      targetOnLeft,
      Position.Left,
      Position.Left,
      obstacles
    )

    const bodyA = obstacles.find((o) => o.id === "a")!
    const bodyB = obstacles.find((o) => o.id === "b")!
    expect(crosses(route, bodyA)).toBe(false)
    expect(crosses(route, bodyB)).toBe(false)
  })
})
