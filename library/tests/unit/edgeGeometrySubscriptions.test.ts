import { describe, expect, it } from "vitest"
import { shallow } from "zustand/shallow"
import type { IPoint } from "@/edges/Connection"
import { computeLineJumpsForEdge } from "@/utils/edgeUtils"
import { collectNeighborPolylines } from "@/utils/geometry/edgeLabelLayout"
import {
  createRouteEntriesSelector,
  selectedRoutesToRecord,
  selectRouteEntriesIntersectingRect,
} from "@/utils/geometry/edgeGeometrySubscriptions"

const p = (x: number, y: number): IPoint => ({ x, y })
const query = { x: 0, y: 0, width: 100, height: 100 }

describe("selectRouteEntriesIntersectingRect", () => {
  it("returns its cached selection for preview-only store writes", () => {
    const exact = {
      near: [p(20, 0), p(20, 100)],
      far: [p(500, 500), p(600, 500)],
    }
    const select = createRouteEntriesSelector(query)
    const first = select(exact)

    expect(select(exact)).toBe(first)
    expect(select({ ...exact })).not.toBe(first)
  })

  it("stays shallow-equal when only a far route reference changes", () => {
    const near = [p(20, 0), p(20, 100)]
    const before = selectRouteEntriesIntersectingRect(
      {
        near,
        far: [p(500, 500), p(600, 500)],
      },
      query
    )
    const after = selectRouteEntriesIntersectingRect(
      {
        near,
        far: [p(510, 500), p(610, 500)],
      },
      query
    )

    expect(before).toEqual(["near", near])
    expect(shallow(before, after)).toBe(true)
  })

  it("changes when a route enters, changes within, or leaves the query", () => {
    const far = [p(500, 0), p(500, 100)]
    const entering = [p(80, 0), p(80, 100)]
    const changedInside = [p(60, 0), p(60, 100)]

    const outside = selectRouteEntriesIntersectingRect({ route: far }, query)
    const inside = selectRouteEntriesIntersectingRect(
      { route: entering },
      query
    )
    const changed = selectRouteEntriesIntersectingRect(
      { route: changedInside },
      query
    )
    const left = selectRouteEntriesIntersectingRect({ route: far }, query)

    expect(outside).toEqual([])
    expect(inside).toEqual(["route", entering])
    expect(shallow(outside, inside)).toBe(false)
    expect(shallow(inside, changed)).toBe(false)
    expect(shallow(changed, left)).toBe(false)
  })

  it("preserves the exact line-jump result after broad-phase filtering", () => {
    const base = [p(0, 50), p(100, 50)]
    const geometry = {
      base,
      crossing: [p(50, 0), p(50, 100)],
      nearbyButNotCrossing: [p(0, 80), p(100, 80)],
      boundaryFalsePositive: [p(100, 100), p(120, 100)],
      far: [p(500, 0), p(500, 100)],
    }
    const fullMap = new Map(Object.entries(geometry))
    const full = computeLineJumpsForEdge(
      "base",
      base,
      Object.keys(geometry).map((id) => ({ id })),
      fullMap
    )

    const selected = selectedRoutesToRecord(
      selectRouteEntriesIntersectingRect(geometry, query, "base")
    )
    const filtered = computeLineJumpsForEdge(
      "base",
      base,
      Object.keys(selected).map((id) => ({ id })),
      new Map(Object.entries(selected))
    )

    expect(filtered).toEqual(full)
    expect(filtered).toHaveLength(1)
  })

  it("preserves exact label neighbors, including strict boundary filtering", () => {
    const self = [p(0, 50), p(100, 50)]
    const near = [p(50, 0), p(50, 100)]
    const boundaryOnly = [p(150, 40), p(170, 40)]
    const far = [p(500, 500), p(600, 500)]
    const geometry = { self, near, boundaryOnly, far }
    const center = p(50, 50)
    const radius = 100
    const labelQuery = {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
    }

    const full = collectNeighborPolylines(geometry, "self", center, radius)
    const selected = selectedRoutesToRecord(
      selectRouteEntriesIntersectingRect(geometry, labelQuery, "self")
    )
    const filtered = collectNeighborPolylines(selected, "self", center, radius)

    expect(filtered).toEqual(full)
    expect(filtered).toEqual([near])
  })

  it("updates exact jump and label consumers while a route crosses the broad-phase boundary", () => {
    const base = [p(0, 50), p(100, 50)]
    const baseBounds = { x: 0, y: 50, width: 100, height: 0 }
    const touching = [p(50, 50), p(50, 100)]
    const crossing = [p(50, 40), p(50, 100)]
    const outside = [p(50, 51), p(50, 100)]
    const jumpsFor = (other: IPoint[]) => {
      const selected = selectRouteEntriesIntersectingRect(
        { base, other },
        baseBounds,
        "base"
      )
      const routes = selectedRoutesToRecord(selected)
      return {
        selected,
        jumps: computeLineJumpsForEdge(
          "base",
          base,
          Object.keys(routes).map((id) => ({ id })),
          new Map(Object.entries(routes))
        ),
      }
    }

    const boundaryJump = jumpsFor(touching)
    const enteredJump = jumpsFor(crossing)
    const leftJump = jumpsFor(outside)
    expect(boundaryJump.jumps).toEqual([])
    expect(enteredJump.jumps).toHaveLength(1)
    expect(leftJump.jumps).toEqual([])
    // Boundary-touching is deliberately selected as a false positive. A route
    // moving just inside must still change the shallow value and wake the exact
    // consumer even though its id remains present on both sides.
    expect(shallow(boundaryJump.selected, enteredJump.selected)).toBe(false)
    expect(shallow(enteredJump.selected, leftJump.selected)).toBe(false)

    const center = p(50, 50)
    const radius = 100
    const labelQuery = { x: -50, y: -50, width: 200, height: 200 }
    const labelNeighbor = (route: IPoint[]) => {
      const selected = selectRouteEntriesIntersectingRect(
        { self: base, other: route },
        labelQuery,
        "self"
      )
      return {
        selected,
        neighbors: collectNeighborPolylines(
          selectedRoutesToRecord(selected),
          "self",
          center,
          radius
        ),
      }
    }
    const boundaryLabel = labelNeighbor([p(150, 40), p(170, 40)])
    const enteredLabel = labelNeighbor([p(149, 40), p(170, 40)])
    const leftLabel = labelNeighbor([p(151, 40), p(170, 40)])

    expect(boundaryLabel.neighbors).toEqual([])
    expect(enteredLabel.neighbors).toHaveLength(1)
    expect(leftLabel.neighbors).toEqual([])
    expect(shallow(boundaryLabel.selected, enteredLabel.selected)).toBe(false)
    expect(shallow(enteredLabel.selected, leftLabel.selected)).toBe(false)
  })
})
