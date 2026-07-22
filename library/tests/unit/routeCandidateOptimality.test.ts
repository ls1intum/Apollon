import { describe, expect, it } from "vitest"
import { Position } from "@xyflow/react"
import { EDGES } from "@/constants"
import {
  routeAroundObstaclesBetweenCandidates,
  type CandidateRouteResult,
  type RouteEndpointCandidate,
} from "@/utils/geometry/orthogonalRouter"
import { getPerfCounters } from "@/sync/perfCounters"

const STUB = EDGES.STUB_LENGTH

const candidate = (
  x: number,
  y: number,
  position: Position,
  cost = 0
): RouteEndpointCandidate => ({
  point: { x, y },
  position,
  stubLength: STUB,
  cost,
})

const route = (
  sources: readonly RouteEndpointCandidate[],
  targets: readonly RouteEndpointCandidate[]
): CandidateRouteResult | null =>
  routeAroundObstaclesBetweenCandidates(sources, targets, [], [])

describe("joint endpoint-candidate routing", () => {
  it("reports each selected endpoint cost exactly once", () => {
    const source = candidate(0, 0, Position.Right)
    const target = candidate(300, 0, Position.Left)
    const unpriced = route([source], [target])
    const priced = route([{ ...source, cost: 13 }], [{ ...target, cost: 29 }])

    expect(unpriced).not.toBeNull()
    expect(priced).not.toBeNull()
    expect(priced!.route).toEqual(unpriced!.route)
    expect(priced!.cost - unpriced!.cost).toBe(42)
  })

  it("proves an unobstructed straight optimum without starting A*", () => {
    const counters = getPerfCounters()!
    const before = counters.routerSearches
    const result = route(
      [candidate(0, 0, Position.Right)],
      [candidate(300, 0, Position.Left)]
    )
    expect(result?.route).toEqual([
      { x: 0, y: 0 },
      { x: 300, y: 0 },
    ])
    expect(counters.routerSearches).toBe(before)
  })

  it("adds terminal costs exactly once and can prefer a longer route", () => {
    const source = candidate(0, 0, Position.Right)
    const straight = candidate(300, 0, Position.Left, 1_000)
    const longer = candidate(300, 80, Position.Left)

    const result = route([source], [straight, longer])
    expect(result).not.toBeNull()
    expect(result!.targetIndex).toBe(1)

    const straightPreferred = route(
      [source],
      [
        { ...straight, cost: 0 },
        { ...longer, cost: 1_000 },
      ]
    )
    expect(straightPreferred).not.toBeNull()
    expect(straightPreferred!.targetIndex).toBe(0)
  })

  it("chooses the source port and route in the same search", () => {
    const expensiveStraight = candidate(0, 80, Position.Right, 1_000)
    const freeJog = candidate(0, 0, Position.Right)
    const target = candidate(300, 80, Position.Left)

    const result = route([expensiveStraight, freeJog], [target])
    expect(result).not.toBeNull()
    expect(result!.sourceIndex).toBe(1)

    const straightPreferred = route(
      [
        { ...expensiveStraight, cost: 0 },
        { ...freeJog, cost: 1_000 },
      ],
      [target]
    )
    expect(straightPreferred).not.toBeNull()
    expect(straightPreferred!.sourceIndex).toBe(0)
  })

  it("distinguishes candidates at the same point by required heading", () => {
    const source = candidate(0, 0, Position.Right)
    const fromLeft = candidate(300, 0, Position.Left)
    const fromAbove = candidate(300, 0, Position.Top)

    const natural = route([source], [fromAbove, fromLeft])
    expect(natural).not.toBeNull()
    expect(natural!.targetIndex).toBe(1)

    const penalized = route([source], [fromAbove, { ...fromLeft, cost: 1_000 }])
    expect(penalized).not.toBeNull()
    expect(penalized!.targetIndex).toBe(0)
  })

  it("is invariant to candidate order when the optimum is not tied", () => {
    const sources = [
      candidate(0, -80, Position.Right, 400),
      candidate(0, 20, Position.Right),
      candidate(0, 140, Position.Right, 100),
    ]
    const targets = [
      candidate(360, -120, Position.Left, 300),
      candidate(360, 20, Position.Left),
      candidate(360, 180, Position.Left, 200),
    ]
    const forward = route(sources, targets)
    const reversed = route([...sources].reverse(), [...targets].reverse())

    expect(forward).not.toBeNull()
    expect(reversed).not.toBeNull()
    expect(reversed!.route).toEqual(forward!.route)
    expect(reversed!.cost).toBe(forward!.cost)
    expect(sources[forward!.sourceIndex]).toEqual(
      [...sources].reverse()[reversed!.sourceIndex]
    )
    expect(targets[forward!.targetIndex]).toEqual(
      [...targets].reverse()[reversed!.targetIndex]
    )
  })

  it("prefers the less restrictive duplicate regardless of candidate order", () => {
    const source = {
      ...candidate(0, 0, Position.Right),
      stubLength: 95,
    }
    const loose = {
      ...candidate(300, 0, Position.Left),
      stubLength: 95,
      forceStubTurn: false,
    }
    const forced = { ...loose, forceStubTurn: true }

    const forcedFirst = route([source], [forced, loose])
    const looseFirst = route([source], [loose, forced])
    expect(forcedFirst).not.toBeNull()
    expect(looseFirst).not.toBeNull()
    expect(forcedFirst!.route).toEqual(looseFirst!.route)
    expect(forcedFirst!.route).toEqual([
      { x: 0, y: 0 },
      { x: 300, y: 0 },
    ])
    expect([forced, loose][forcedFirst!.targetIndex].forceStubTurn).toBe(false)
    expect([loose, forced][looseFirst!.targetIndex].forceStubTurn).toBe(false)
  })

  it("matches exhaustive Cartesian enumeration on small candidate sets", () => {
    const sourceSets: RouteEndpointCandidate[][] = [
      [candidate(0, -60, Position.Right, 25), candidate(0, 20, Position.Right)],
      [
        candidate(-20, 0, Position.Bottom, 40),
        candidate(60, 0, Position.Bottom),
        candidate(140, 0, Position.Bottom, 15),
      ],
    ]
    const targetSets: RouteEndpointCandidate[][] = [
      [
        candidate(320, -80, Position.Left, 20),
        candidate(320, 40, Position.Left),
        candidate(320, 160, Position.Left, 35),
      ],
      [candidate(-40, 320, Position.Top, 30), candidate(80, 320, Position.Top)],
    ]

    for (const sources of sourceSets) {
      for (const targets of targetSets) {
        const exhaustive = sources.flatMap((source, sourceIndex) =>
          targets.flatMap((target, targetIndex) => {
            const result = route([source], [target])
            return result ? [{ result, sourceIndex, targetIndex }] : []
          })
        )
        const optimum = exhaustive.reduce((best, item) =>
          item.result.cost < best.result.cost ? item : best
        )
        const joint = route(sources, targets)

        expect(joint).not.toBeNull()
        expect(joint!.cost).toBe(optimum.result.cost)
        expect(joint!.sourceIndex).toBe(optimum.sourceIndex)
        expect(joint!.targetIndex).toBe(optimum.targetIndex)
        // Equal-cost polylines may use the opposite canonical bend placement: a
        // one-pair call and a union-candidate call do not build the same lattice.
        // The oracle is the objective and selected semantic endpoints, not one
        // arbitrary representation of a tied optimum.
        expect(joint!.route[0]).toEqual(sources[optimum.sourceIndex].point)
        expect(joint!.route[joint!.route.length - 1]).toEqual(
          targets[optimum.targetIndex].point
        )
      }
    }
  })

  it("returns null when either endpoint candidate set is empty", () => {
    const source = candidate(0, 0, Position.Right)
    const target = candidate(300, 0, Position.Left)
    expect(route([], [target])).toBeNull()
    expect(route([source], [])).toBeNull()
  })

  it("charges both terminals when source and target are the same search state", () => {
    const result = route(
      [candidate(40, 60, Position.Right, 11)],
      [candidate(40, 60, Position.Left, 17)]
    )
    expect(result).not.toBeNull()
    expect(result!.route).toEqual([{ x: 40, y: 60 }])
    expect(result!.cost).toBe(28)
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid endpoint cost %s",
    (cost) => {
      expect(() =>
        route(
          [candidate(0, 0, Position.Right, cost)],
          [candidate(300, 0, Position.Left)]
        )
      ).toThrow(/finite and non-negative/)
    }
  )

  it("chooses endpoints against the actual obstacle field", () => {
    const sources = [
      candidate(0, 0, Position.Right),
      candidate(0, 120, Position.Right, 20),
    ]
    const targets = [candidate(320, 120, Position.Left)]
    const result = routeAroundObstaclesBetweenCandidates(
      sources,
      targets,
      [{ id: "wall", x: 120, y: -30, width: 80, height: 100 }],
      []
    )
    expect(result).not.toBeNull()
    expect(result!.sourceIndex).toBe(1)
    expect(result!.route[0]).toEqual(sources[1].point)
  })

  it("draws an equal-cost obstacle detour identically when the edge is reversed", () => {
    const source = candidate(0, 0, Position.Right)
    const target = candidate(300, 0, Position.Left)
    const obstacles = [{ id: "wall", x: 120, y: -30, width: 60, height: 60 }]
    const forward = routeAroundObstaclesBetweenCandidates(
      [source],
      [target],
      obstacles,
      []
    )
    const backward = routeAroundObstaclesBetweenCandidates(
      [target],
      [source],
      obstacles,
      []
    )
    expect(forward).not.toBeNull()
    expect(backward).not.toBeNull()
    expect(backward!.route).toEqual([...forward!.route].reverse())
    expect(backward!.cost).toBe(forward!.cost)
  })

  it("prices diagonal-neighbor crossings exactly and is invariant to reversal", () => {
    const source = candidate(0, 0, Position.Right)
    const target = candidate(300, 0, Position.Left)
    const diagonal = [
      { x: 125, y: -90 },
      { x: 175, y: 90 },
    ]

    const forward = routeAroundObstaclesBetweenCandidates(
      [source],
      [target],
      [],
      [diagonal]
    )
    const reversedNeighbor = routeAroundObstaclesBetweenCandidates(
      [source],
      [target],
      [],
      [[...diagonal].reverse()]
    )
    const backward = routeAroundObstaclesBetweenCandidates(
      [target],
      [source],
      [],
      [diagonal]
    )

    expect(forward).not.toBeNull()
    expect(reversedNeighbor).not.toBeNull()
    expect(backward).not.toBeNull()
    // A dropped diagonal would leave the zero-bend, distance-only route at 300.
    expect(forward!.cost).toBeGreaterThan(300)
    expect(reversedNeighbor!.route).toEqual(forward!.route)
    expect(reversedNeighbor!.cost).toBe(forward!.cost)
    expect(backward!.route).toEqual([...forward!.route].reverse())
    expect(backward!.cost).toBe(forward!.cost)
  })

  it("can spend distance and bends to avoid an ordinary neighbor crossing", () => {
    const result = routeAroundObstaclesBetweenCandidates(
      [candidate(0, 0, Position.Right)],
      [candidate(300, 0, Position.Left)],
      [],
      [
        [
          { x: 150, y: -40 },
          { x: 150, y: 40 },
        ],
      ]
    )

    expect(result).not.toBeNull()
    // Crossing straight costs distance 300 + crossing 400. Endpoint-clearance
    // lanes make the lower-cost detour a real candidate in the lattice.
    expect(result!.cost).toBeLessThan(700)
    expect(result!.route.some((point) => point.y < -40 || point.y > 40)).toBe(
      true
    )
  })

  it("moves away from a shallow diagonal that crowds the direct lane", () => {
    const source = candidate(0, 0, Position.Right)
    const target = candidate(300, 0, Position.Left)
    const shallow = [
      { x: 50, y: 2 },
      { x: 250, y: 4 },
    ]
    const forward = routeAroundObstaclesBetweenCandidates(
      [source],
      [target],
      [],
      [shallow]
    )
    const reversed = routeAroundObstaclesBetweenCandidates(
      [source],
      [target],
      [],
      [[...shallow].reverse()]
    )

    expect(forward).not.toBeNull()
    expect(reversed).not.toBeNull()
    expect(forward!.route).not.toEqual([source.point, target.point])
    expect(reversed!.route).toEqual(forward!.route)
    expect(reversed!.cost).toBe(forward!.cost)
  })

  it("does not graze a third-party obstacle at a corner", () => {
    const obstacle = { id: "C", x: 545, y: 165, width: 160, height: 100 }
    const result = routeAroundObstaclesBetweenCandidates(
      [candidate(495, 295, Position.Right)],
      [candidate(750, 265, Position.Left)],
      [obstacle],
      []
    )

    expect(result).not.toBeNull()
    for (let i = 0; i < result!.route.length - 1; i++) {
      const a = result!.route[i]
      const b = result!.route[i + 1]
      const left = Math.min(a.x, b.x)
      const right = Math.max(a.x, b.x)
      const top = Math.min(a.y, b.y)
      const bottom = Math.max(a.y, b.y)
      expect(
        left <= obstacle.x + obstacle.width &&
          right >= obstacle.x &&
          top <= obstacle.y + obstacle.height &&
          bottom >= obstacle.y
      ).toBe(false)
    }
  })
})
