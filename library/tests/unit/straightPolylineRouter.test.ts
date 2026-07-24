import { describe, it, expect } from "vitest"
import type { IPoint } from "@/edges/Connection"
import { EDGES } from "@/utils/geometry/routingConstants"
import {
  chordClearsObstacles,
  routeStraightPolyline,
  type StraightRouteObstacle,
  type StraightRouteRequest,
} from "@/utils/geometry/straightPolylineRouter"

const CLEAR = EDGES.NODE_CLEARANCE_PX
const MIN = EDGES.MIN_NODE_CLEARANCE_PX

type Rect = { x: number; y: number; width: number; height: number }

/** Independent strict interior-crossing tester used to VERIFY router output
 * (deliberately not sharing code with the module under test). */
const crossesRectInterior = (a: IPoint, b: IPoint, r: Rect): boolean => {
  const inside = (p: IPoint) =>
    p.x > r.x && p.x < r.x + r.width && p.y > r.y && p.y < r.y + r.height
  if (inside(a) || inside(b)) return true
  const cross = (p: IPoint, q: IPoint, s: IPoint) =>
    (q.x - p.x) * (s.y - p.y) - (q.y - p.y) * (s.x - p.x)
  const open = (a1: IPoint, a2: IPoint, b1: IPoint, b2: IPoint) =>
    cross(a1, a2, b1) * cross(a1, a2, b2) < 0 &&
    cross(b1, b2, a1) * cross(b1, b2, a2) < 0
  const c0 = { x: r.x, y: r.y }
  const c1 = { x: r.x + r.width, y: r.y }
  const c2 = { x: r.x + r.width, y: r.y + r.height }
  const c3 = { x: r.x, y: r.y + r.height }
  return (
    open(a, b, c0, c1) ||
    open(a, b, c1, c2) ||
    open(a, b, c2, c3) ||
    open(a, b, c3, c0)
  )
}

const inflated = (r: Rect, d: number): Rect => ({
  x: r.x - d,
  y: r.y - d,
  width: r.width + 2 * d,
  height: r.height + 2 * d,
})

/** Assert the whole route keeps MIN clearance from a hard obstacle. */
const expectRouteClears = (
  route: IPoint[],
  obstacle: StraightRouteObstacle
): void => {
  const guard = inflated(obstacle, MIN)
  for (let i = 1; i < route.length; i++)
    expect(crossesRectInterior(route[i - 1], route[i], guard)).toBe(false)
}

const isInteger = (route: IPoint[]): boolean =>
  route.every((p) => Number.isInteger(p.x) && Number.isInteger(p.y))

const baseReq = (
  over: Partial<StraightRouteRequest>
): StraightRouteRequest => ({
  source: { x: 0, y: 0 },
  target: { x: 100, y: 0 },
  checkpoints: [],
  obstacles: [],
  neighborRoutes: [],
  clearancePx: CLEAR,
  ...over,
})

describe("routeStraightPolyline — empty and gated cases", () => {
  it("returns the straight 2-point chord when there is no obstacle", () => {
    const route = routeStraightPolyline(baseReq({}))
    expect(route).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
  })

  it("returns the straight chord when a hard obstacle is well clear of it", () => {
    const obstacle: StraightRouteObstacle = {
      id: "n1",
      x: 40,
      y: 200,
      width: 40,
      height: 40,
      soft: false,
    }
    const route = routeStraightPolyline(baseReq({ obstacles: [obstacle] }))
    expect(route).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
  })

  it("ignores soft obstacles for visibility (never routes around them)", () => {
    const soft: StraightRouteObstacle = {
      id: "pkg",
      x: 40,
      y: -50,
      width: 20,
      height: 100,
      soft: true,
    }
    const route = routeStraightPolyline(baseReq({ obstacles: [soft] }))
    expect(route).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
  })
})

describe("routeStraightPolyline — obstacle avoidance", () => {
  it("routes around a single blocking obstacle without crossing it", () => {
    const obstacle: StraightRouteObstacle = {
      id: "block",
      x: 80,
      y: -20,
      width: 40,
      height: 40,
      soft: false,
    }
    const route = routeStraightPolyline(
      baseReq({
        source: { x: 0, y: 0 },
        target: { x: 200, y: 0 },
        obstacles: [obstacle],
      })
    )
    expect(route.length).toBeGreaterThanOrEqual(3)
    expect(route[0]).toEqual({ x: 0, y: 0 })
    expect(route[route.length - 1]).toEqual({ x: 200, y: 0 })
    expect(isInteger(route)).toBe(true)
    expectRouteClears(route, obstacle)
  })

  it("threads a two-obstacle corridor, clearing both", () => {
    const a: StraightRouteObstacle = {
      id: "A",
      x: 80,
      y: -15,
      width: 40,
      height: 75,
      soft: false,
    }
    const b: StraightRouteObstacle = {
      id: "B",
      x: 180,
      y: -60,
      width: 40,
      height: 75,
      soft: false,
    }
    const route = routeStraightPolyline(
      baseReq({
        source: { x: 0, y: 0 },
        target: { x: 300, y: 0 },
        obstacles: [a, b],
      })
    )
    expect(route.length).toBeGreaterThanOrEqual(3)
    expect(route[0]).toEqual({ x: 0, y: 0 })
    expect(route[route.length - 1]).toEqual({ x: 300, y: 0 })
    expectRouteClears(route, a)
    expectRouteClears(route, b)
  })
})

describe("routeStraightPolyline — checkpoints", () => {
  it("passes through a checkpoint in order with no obstacles", () => {
    const route = routeStraightPolyline(
      baseReq({
        source: { x: 0, y: 0 },
        target: { x: 100, y: 0 },
        checkpoints: [{ x: 50, y: 50 }],
      })
    )
    expect(route).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 0 },
    ])
  })

  it("keeps checkpoints as mandatory via-points around an obstacle", () => {
    const obstacle: StraightRouteObstacle = {
      id: "block",
      x: 120,
      y: -20,
      width: 40,
      height: 40,
      soft: false,
    }
    const cp1 = { x: 60, y: 40 }
    const cp2 = { x: 260, y: 40 }
    const route = routeStraightPolyline(
      baseReq({
        source: { x: 0, y: 0 },
        target: { x: 320, y: 0 },
        checkpoints: [cp1, cp2],
        obstacles: [obstacle],
      })
    )
    // Both checkpoints appear, and in order.
    const i1 = route.findIndex((p) => p.x === cp1.x && p.y === cp1.y)
    const i2 = route.findIndex((p) => p.x === cp2.x && p.y === cp2.y)
    expect(i1).toBeGreaterThanOrEqual(0)
    expect(i2).toBeGreaterThan(i1)
    expectRouteClears(route, obstacle)
  })
})

describe("routeStraightPolyline — endpoint own-node exemption", () => {
  it("leaves a node the source sits on instead of being trapped", () => {
    // Source (0,0) lies on the right edge of its own node body; the node overlaps
    // the source, so it must be exempt or the edge could never depart.
    const ownNode: StraightRouteObstacle = {
      id: "own",
      x: -50,
      y: -25,
      width: 50,
      height: 50,
      soft: false,
    }
    const route = routeStraightPolyline(
      baseReq({
        source: { x: 0, y: 0 },
        target: { x: 100, y: 0 },
        obstacles: [ownNode],
      })
    )
    // The obstacle is behind the source, so the straight chord is valid.
    expect(route).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
  })
})

describe("chordClearsObstacles", () => {
  const obstacle: StraightRouteObstacle = {
    id: "n",
    x: 40,
    y: -20,
    width: 40,
    height: 40,
    soft: false,
  }
  it("is false when the chord passes through the obstacle", () => {
    expect(
      chordClearsObstacles({ x: 0, y: 0 }, { x: 100, y: 0 }, [obstacle], MIN)
    ).toBe(false)
  })
  it("is true when the chord keeps clearance", () => {
    expect(
      chordClearsObstacles(
        { x: 0, y: 200 },
        { x: 100, y: 200 },
        [obstacle],
        MIN
      )
    ).toBe(true)
  })
  it("ignores soft obstacles", () => {
    const soft = { ...obstacle, id: "s", soft: true }
    expect(
      chordClearsObstacles({ x: 0, y: 0 }, { x: 100, y: 0 }, [soft], MIN)
    ).toBe(true)
  })
})

describe("routeStraightPolyline — determinism under shuffled input", () => {
  const shuffle = <T>(items: T[], seed: number): T[] => {
    // Deterministic Fisher–Yates from a tiny LCG — same seed, same permutation.
    const out = items.slice()
    let s = seed >>> 0
    for (let i = out.length - 1; i > 0; i--) {
      s = (s * 1_664_525 + 1_013_904_223) >>> 0
      const j = s % (i + 1)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  const obstacles: StraightRouteObstacle[] = [
    { id: "b1", x: 80, y: -15, width: 40, height: 75, soft: false },
    { id: "b2", x: 180, y: -60, width: 40, height: 75, soft: false },
    { id: "b3", x: 130, y: 120, width: 40, height: 40, soft: false },
    { id: "far", x: 500, y: 500, width: 30, height: 30, soft: false },
    { id: "soft", x: 40, y: -200, width: 20, height: 100, soft: true },
  ]
  const neighbors: IPoint[][] = [
    [
      { x: 0, y: -100 },
      { x: 300, y: 100 },
    ],
    [
      { x: 150, y: -200 },
      { x: 150, y: 200 },
    ],
  ]

  it("produces byte-identical output regardless of obstacle & neighbour order", () => {
    const reference = routeStraightPolyline(
      baseReq({
        source: { x: 0, y: 0 },
        target: { x: 300, y: 0 },
        obstacles,
        neighborRoutes: neighbors,
      })
    )
    for (let seed = 1; seed <= 8; seed++) {
      const shuffled = routeStraightPolyline(
        baseReq({
          source: { x: 0, y: 0 },
          target: { x: 300, y: 0 },
          obstacles: shuffle(obstacles, seed),
          neighborRoutes: shuffle(neighbors, seed * 7 + 1),
        })
      )
      expect(shuffled).toEqual(reference)
    }
    expect(reference[0]).toEqual({ x: 0, y: 0 })
    expect(reference[reference.length - 1]).toEqual({ x: 300, y: 0 })
    expect(isInteger(reference)).toBe(true)
  })
})
