import { Position } from "@xyflow/react"
import { describe, expect, it } from "vitest"
import { routeOrthogonalPath } from "@/utils/edgeUtils"
import {
  neighborsWithinReach,
  routeConflictsWithNeighborEdges,
} from "@/utils/geometry/orthogonalRouter"
import type { IPoint } from "@/edges/Connection"

const overlapsColinear = (route: IPoint[], neighbor: IPoint[]): boolean =>
  routeConflictsWithNeighborEdges(route, [neighbor])

describe("edge-aware routing", () => {
  const source: IPoint = { x: 100, y: 100 }
  const target: IPoint = { x: 400, y: 100 }

  it("leaves a route untouched when it conflicts with no neighbour", () => {
    const farAway: IPoint[] = [
      { x: 100, y: 300 },
      { x: 400, y: 300 },
    ]
    const withNeighbor = routeOrthogonalPath(
      source,
      target,
      Position.Right,
      Position.Left,
      [],
      [farAway]
    )
    const without = routeOrthogonalPath(
      source,
      target,
      Position.Right,
      Position.Left
    )
    // No conflict → identical to the plain route: neighbours never reshape an
    // edge that already runs clear of them.
    expect(withNeighbor).toEqual(without)
  })

  it("steps off a neighbour it would otherwise be drawn on top of", () => {
    // A second edge running colinear along the same lane. Drawn naively, the two
    // are one indistinguishable line — the #115 / #268 bug.
    const neighbor: IPoint[] = [
      { x: 150, y: 100 },
      { x: 350, y: 100 },
    ]
    const route = routeOrthogonalPath(
      source,
      target,
      Position.Right,
      Position.Left,
      [],
      [neighbor]
    )

    expect(overlapsColinear(route, neighbor)).toBe(false)
    // It actually moved off the shared lane rather than staying straight.
    expect(route.some((p) => p.y !== 100)).toBe(true)
    for (const p of route) {
      expect(Math.abs(p.x % 5)).toBe(0)
      expect(Math.abs(p.y % 5)).toBe(0)
    }
  })

  it("treats being drawn on top of, or crowded against, a neighbour as a conflict", () => {
    const horizontal: IPoint[] = [
      { x: 0, y: 100 },
      { x: 500, y: 100 },
    ]
    // Colinear on the same lane — the worst case, read as a missing edge.
    expect(
      routeConflictsWithNeighborEdges(
        [
          { x: 100, y: 100 },
          { x: 300, y: 100 },
        ],
        [horizontal]
      )
    ).toBe(true)
    // A hair apart is barely better: two lines that close smudge into one, and
    // no jump arc fits between them.
    expect(
      routeConflictsWithNeighborEdges(
        [
          { x: 100, y: 105 },
          { x: 300, y: 105 },
        ],
        [horizontal]
      )
    ).toBe(true)
    // Two grid cells apart is visibly separate — not a conflict.
    expect(
      routeConflictsWithNeighborEdges(
        [
          { x: 100, y: 110 },
          { x: 300, y: 110 },
        ],
        [horizontal]
      )
    ).toBe(false)
    // Merely sharing an endpoint is a touch, not a conflict.
    expect(
      routeConflictsWithNeighborEdges(
        [
          { x: 0, y: 100 },
          { x: 0, y: 200 },
        ],
        [horizontal]
      )
    ).toBe(false)
  })

  it("prices a crossing by whether its jump has room to draw", () => {
    const horizontal: IPoint[] = [
      { x: 0, y: 100 },
      { x: 500, y: 100 },
    ]
    // A crossing out in the open is fine — often unavoidable, and drawn as a
    // neat hop. It must NOT drag the edge through a re-route for nothing.
    expect(
      routeConflictsWithNeighborEdges(
        [
          { x: 250, y: 0 },
          { x: 250, y: 200 },
        ],
        [horizontal]
      )
    ).toBe(false)
    // A crossing right at the neighbour's tip has nowhere to put the hop, so the
    // two edges just merge into each other. That IS worth re-routing for.
    expect(
      routeConflictsWithNeighborEdges(
        [
          { x: 495, y: 0 },
          { x: 495, y: 200 },
        ],
        [horizontal]
      )
    ).toBe(true)
  })

  it("treats the diagonal jump-clearance threshold exactly", () => {
    const diagonal: IPoint[] = [
      { x: 0, y: 0 },
      { x: 30, y: 40 },
    ]
    // The 3-4-5 diagonal meets y=12 at (9, 12), exactly 15px from its
    // endpoint. The strict clearance rule permits that jump.
    expect(
      routeConflictsWithNeighborEdges(
        [
          { x: -100, y: 12 },
          { x: 100, y: 12 },
        ],
        [diagonal]
      )
    ).toBe(false)
    // At (6, 8) the crossing is only 10px from the endpoint and must reroute.
    expect(
      routeConflictsWithNeighborEdges(
        [
          { x: -100, y: 8 },
          { x: 100, y: 8 },
        ],
        [[...diagonal].reverse()]
      )
    ).toBe(true)
  })

  it("clips long neighbour lanes to the corridor without inventing terminals", () => {
    const segments = neighborsWithinReach(
      { x: 0, y: 0 },
      [{ x: 100, y: 100 }],
      [],
      [
        [
          { x: -1_000, y: 50 },
          { x: 1_000, y: 50 },
        ],
      ]
    )

    // The reach margin is 45px. Remote ends and their midpoint must not add
    // turning lines hundreds of pixels away from the route being solved.
    expect(segments).toEqual([
      {
        x1: -45,
        y1: 50,
        x2: 145,
        y2: 50,
        startTerminal: false,
        endTerminal: false,
      },
    ])
  })

  it("keeps only real neighbour terminals that lie inside the corridor", () => {
    const segments = neighborsWithinReach(
      { x: 0, y: 0 },
      [{ x: 100, y: 100 }],
      [],
      [
        [
          { x: 20, y: 20 },
          { x: 500, y: 20 },
        ],
        [
          { x: 50, y: 500 },
          { x: 50, y: 30 },
        ],
      ]
    )

    expect(segments).toEqual([
      {
        x1: 20,
        y1: 20,
        x2: 145,
        y2: 20,
        startTerminal: true,
        endTerminal: false,
      },
      {
        x1: 50,
        y1: 145,
        x2: 50,
        y2: 30,
        startTerminal: false,
        endTerminal: true,
      },
    ])
  })
})
