import { describe, it, expect } from "vitest"
import { Position } from "@xyflow/react"
import {
  routeAroundObstacles,
  routeAroundObstaclesToTargets,
  type RouteTarget,
} from "@/utils/geometry/orthogonalRouter"
import { EDGES } from "@/constants"
import type { IPoint } from "@/edges/Connection"

const STUB = EDGES.STUB_LENGTH

const bends = (route: IPoint[]): number => Math.max(0, route.length - 2)

/**
 * The multi-target router is the endpoint-anchor selector: given a source and a
 * set of candidate landing points, one A* pass returns the cheapest reachable one
 * and says which candidate it was. These tests pin that contract; the byte-for-byte
 * equivalence of the single-target case is proven separately by the whole existing
 * unit + visual suite (they all route through the one-target wrapper).
 */
describe("routeAroundObstaclesToTargets", () => {
  it("a one-target search equals the point-to-point wrapper", () => {
    const source: IPoint = { x: 0, y: 0 }
    const target: IPoint = { x: 300, y: 120 }
    const multi = routeAroundObstaclesToTargets(
      source,
      Position.Right,
      STUB,
      [{ point: target, position: Position.Left, stubLength: STUB }],
      []
    )
    const single = routeAroundObstacles(
      source,
      target,
      Position.Right,
      Position.Left,
      [],
      STUB,
      STUB
    )
    expect(multi).not.toBeNull()
    expect(multi!.targetIndex).toBe(0)
    expect(multi!.route).toEqual(single)
  })

  it("picks the target that yields the cheaper route", () => {
    // Source exits right at the same height as one target (a straight shot, zero
    // bends) and well below another (which needs two bends). The straight one wins.
    const source: IPoint = { x: 0, y: 0 }
    const targets: RouteTarget[] = [
      // index 0: far above, forces a jog
      { point: { x: 300, y: -160 }, position: Position.Left, stubLength: STUB },
      // index 1: dead ahead, a straight line
      { point: { x: 300, y: 0 }, position: Position.Left, stubLength: STUB },
    ]
    const result = routeAroundObstaclesToTargets(
      source,
      Position.Right,
      STUB,
      targets,
      []
    )
    expect(result).not.toBeNull()
    expect(result!.targetIndex).toBe(1)
    expect(bends(result!.route)).toBe(0)
    // It really landed on target 1.
    expect(result!.route[result!.route.length - 1]).toEqual({ x: 300, y: 0 })
  })

  it("is deterministic and order-stable across candidate reordering", () => {
    const source: IPoint = { x: 0, y: 0 }
    const a: RouteTarget = {
      point: { x: 300, y: 0 },
      position: Position.Left,
      stubLength: STUB,
    }
    const b: RouteTarget = {
      point: { x: 300, y: -160 },
      position: Position.Left,
      stubLength: STUB,
    }
    const first = routeAroundObstaclesToTargets(
      source,
      Position.Right,
      STUB,
      [a, b],
      []
    )
    const second = routeAroundObstaclesToTargets(
      source,
      Position.Right,
      STUB,
      [a, b],
      []
    )
    expect(first).toEqual(second)
    // The winning geometry is the straight shot regardless of the list order; only
    // the reported index tracks the position of that winner in the input.
    const reordered = routeAroundObstaclesToTargets(
      source,
      Position.Right,
      STUB,
      [b, a],
      []
    )
    expect(reordered!.route).toEqual(first!.route)
    expect(reordered!.targetIndex).toBe(1)
  })

  it("holds no route for an empty target set", () => {
    const result = routeAroundObstaclesToTargets(
      { x: 0, y: 0 },
      Position.Right,
      STUB,
      [],
      []
    )
    expect(result).toBeNull()
  })
})
