import { describe, expect, it } from "vitest"
import { Position } from "@xyflow/react"
import {
  endpointPlacementCost,
  endpointPreferenceCost,
  polylineConflictCost,
  ROUTING_COST,
  sideGapBalance,
  weightedRoutingCost,
} from "@/utils/geometry/routingCost"
import { routeAroundObstaclesBetweenCandidates } from "@/utils/geometry/orthogonalRouter"

describe("shared routing cost", () => {
  it("prices every n+1 side stretch against its grid-balanced counterpart", () => {
    expect(sideGapBalance([0.5], 100, 5)).toEqual({
      cost: 0,
      maxGapErrorPx: 0,
      totalGapErrorPx: 0,
    })
    expect(sideGapBalance([0.55], 100, 5)).toEqual({
      cost: 10,
      maxGapErrorPx: 5,
      totalGapErrorPx: 10,
    })

    // On a 160px side the closest equal thirds are 55/50/55px.
    expect(sideGapBalance([55 / 160, 105 / 160], 160, 5).cost).toBe(0)
    expect(sideGapBalance([0.25, 0.5, 0.75], 160, 5).cost).toBe(0)
    expect(sideGapBalance([0.7, 0.3], 100, 5)).toEqual(
      sideGapBalance([0.3, 0.7], 100, 5)
    )
    expect(sideGapBalance([0.3, 0.7], 100, 5).cost).toBe(20)
  })

  it("uses the complete two-gap error for a lone endpoint", () => {
    expect(
      endpointPlacementCost({ side: Position.Top, ratio: 0.5 }, 160, 5)
    ).toBe(0)
    expect(
      endpointPlacementCost({ side: Position.Top, ratio: 0.375 }, 160, 5)
    ).toBe(40)
  })

  it("keeps side selection soft while preserving coordinated seats", () => {
    const preferred = { side: Position.Right, ratio: 0.5 }
    const otherSide = { side: Position.Top, ratio: 0.5 }
    const cost = endpointPreferenceCost(otherSide, preferred, 100, 5)
    const sameSideDisplacement = endpointPreferenceCost(
      { side: Position.Right, ratio: 0.6 },
      preferred,
      100,
      5
    )

    expect(cost).toBeLessThan(ROUTING_COST.bendInGridCells * 5)
    expect(sameSideDisplacement).toBe(31)
    expect(
      endpointPreferenceCost(
        { side: Position.Right, ratio: 1 },
        preferred,
        800,
        5
      )
    ).toBe(1201)
  })

  it("scores diagonal crossings and crowding independent of direction/order", () => {
    const route = [
      { x: 0, y: 50 },
      { x: 120, y: 50 },
    ]
    const diagonal = [
      { x: 20, y: 0 },
      { x: 100, y: 100 },
    ]
    const crossing = polylineConflictCost(route, [diagonal], 10)
    const reversed = polylineConflictCost(
      [...route].reverse(),
      [[...diagonal].reverse()],
      10
    )
    expect(crossing).toEqual(reversed)
    expect(crossing.crossings).toBe(1)
    expect(crossing.cost).toBe(ROUTING_COST.edgeCrossing)

    const parallel = polylineConflictCost(
      [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ],
      [
        [
          { x: 0, y: 5 },
          { x: 100, y: 105 },
        ],
      ],
      10
    )
    expect(parallel.crossings).toBe(0)
    expect(parallel.crowdingPx).toBeGreaterThan(0)
    expect(parallel.cost).toBeGreaterThan(0)
  })

  it("distinguishes diagonal overlap from an endpoint-only touch", () => {
    const diagonal = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ]
    const overlap = [
      { x: 20, y: 20 },
      { x: 80, y: 80 },
    ]
    const touching = [
      { x: 100, y: 100 },
      { x: 140, y: 60 },
    ]

    const score = polylineConflictCost(diagonal, [overlap, touching], 10)
    const reversed = polylineConflictCost(
      [...diagonal].reverse(),
      [[...touching].reverse(), [...overlap].reverse()],
      10
    )

    expect(score).toEqual(reversed)
    expect(score.crossings).toBe(0)
    expect(score.overlapPx).toBe(60)
    expect(score.crowdingPx).toBe(0)
  })

  it("prices a shallow authored diagonal that crowds a straight route", () => {
    const route = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    const shallow = [
      { x: 0, y: 5 },
      { x: 100, y: 9 },
    ]
    const forward = polylineConflictCost(route, [shallow], 10)
    const reversed = polylineConflictCost(shallow, [route], 10)

    expect(forward).toEqual(reversed)
    expect(forward.crossings).toBe(0)
    expect(forward.crowdingPx).toBe(30)
    expect(forward.cost).toBe(30 * ROUTING_COST.crowdingPerPx)
  })

  it("keeps the canonical crossing tradeoff additive", () => {
    expect(weightedRoutingCost({ crossings: 1 }, 5)).toBe(400)
    expect(weightedRoutingCost({ bends: 2, lengthPx: 319 }, 5)).toBe(399)
    expect(weightedRoutingCost({ bends: 2, lengthPx: 321 }, 5)).toBe(401)
  })

  it("avoids an ordinary crossing without taking a pathological long detour", () => {
    const source = {
      point: { x: 0, y: 0 },
      position: Position.Right,
      stubLength: 15,
    }
    const target = {
      point: { x: 300, y: 0 },
      position: Position.Left,
      stubLength: 15,
    }
    const routeAgainst = (halfHeight: number) => {
      const neighbor = [
        { x: 150, y: -halfHeight },
        { x: 150, y: halfHeight },
      ]
      const result = routeAroundObstaclesBetweenCandidates(
        [source],
        [target],
        [],
        [neighbor]
      )
      expect(result).not.toBeNull()
      return {
        route: result!.route,
        crossings: polylineConflictCost(result!.route, [neighbor], 10)
          .crossings,
      }
    }

    const ordinary = routeAgainst(40)
    expect(ordinary.crossings).toBe(0)
    expect(ordinary.route.length).toBeGreaterThan(2)

    // Clearing a 400px line would add roughly 400px plus two bends. One neat
    // right-angle crossing is preferable to that lap around the diagram.
    const veryLong = routeAgainst(200)
    expect(veryLong.crossings).toBe(1)
    expect(veryLong.route).toHaveLength(2)
  })
})
