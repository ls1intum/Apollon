import { describe, it, expect } from "vitest"
import {
  getMidSegment,
  computeMiddleLabelLayout,
  computeUseCaseLabelLayout,
  collectNeighborPolylines,
  candidateBox,
} from "@/utils/geometry/edgeLabelLayout"
import { EDGES } from "@/constants"
import type { IPoint } from "@/edges/Connection"

const p = (x: number, y: number): IPoint => ({ x, y })

describe("getMidSegment", () => {
  it("returns the analytic midpoint for a straight horizontal edge", () => {
    const mid = getMidSegment([p(0, 50), p(300, 50)], p(0, 50), p(300, 50))
    expect(mid.point).toEqual({ x: 150, y: 50 })
    expect(mid.isHorizontal).toBe(true)
    expect(mid.segmentIndex).toBe(0)
  })

  it("classifies a straight vertical edge", () => {
    const mid = getMidSegment([p(100, 0), p(100, 300)], p(100, 0), p(100, 300))
    expect(mid.point).toEqual({ x: 100, y: 150 })
    expect(mid.isHorizontal).toBe(false)
  })

  it("falls back to the source/target midpoint when there is no polyline", () => {
    const mid = getMidSegment([], p(0, 0), p(40, 10))
    expect(mid.point).toEqual({ x: 20, y: 5 })
    expect(mid.isHorizontal).toBe(true) // |dx| 40 >= |dy| 10
  })

  it("picks the longer interior segment of an L-shape and lerps inside it", () => {
    // H arm 50 + V arm 150 = 200; half = 100 lands inside the vertical arm.
    const mid = getMidSegment(
      [p(0, 0), p(50, 0), p(50, 150)],
      p(0, 0),
      p(50, 150)
    )
    expect(mid.segmentIndex).toBe(1)
    expect(mid.isHorizontal).toBe(false)
    expect(mid.point).toEqual({ x: 50, y: 50 }) // 50px into the V arm
  })

  it("on a symmetric L picks the segment ending at the corner, never the corner", () => {
    // Two equal 100px arms; half = 100 falls exactly on the corner vertex.
    // ">=" selects the first (horizontal) arm so orientation is well-defined.
    const mid = getMidSegment(
      [p(0, 0), p(100, 0), p(100, 100)],
      p(0, 0),
      p(100, 100)
    )
    expect(mid.segmentIndex).toBe(0)
    expect(mid.isHorizontal).toBe(true)
    expect(mid.point).toEqual({ x: 100, y: 0 }) // the corner, owned by the H arm
  })

  it("finds the middle arm of a Z-shape", () => {
    // 50 (H) + 100 (V) + 50 (H) = 200; half = 100 is inside the V arm.
    const mid = getMidSegment(
      [p(0, 0), p(50, 0), p(50, 100), p(100, 100)],
      p(0, 0),
      p(100, 100)
    )
    expect(mid.segmentIndex).toBe(1)
    expect(mid.isHorizontal).toBe(false)
    expect(mid.point).toEqual({ x: 50, y: 50 })
  })

  it("exposes the chosen segment's endpoints in source->target order", () => {
    const mid = getMidSegment(
      [p(0, 0), p(50, 0), p(50, 100), p(100, 100)],
      p(0, 0),
      p(100, 100)
    )
    expect(mid.start).toEqual({ x: 50, y: 0 })
    expect(mid.end).toEqual({ x: 50, y: 100 })
  })

  it("collapses collinear vertices before measuring", () => {
    const mid = getMidSegment(
      [p(0, 50), p(150, 50), p(300, 50)],
      p(0, 50),
      p(300, 50)
    )
    expect(mid.point).toEqual({ x: 150, y: 50 })
    expect(mid.segmentIndex).toBe(0)
  })

  it("rounds the midpoint to whole pixels", () => {
    const mid = getMidSegment([p(0, 0), p(15, 0)], p(0, 0), p(15, 0))
    expect(Number.isInteger(mid.point.x)).toBe(true)
    expect(mid.point.x).toBe(8) // round(7.5)
  })
})

describe("computeMiddleLabelLayout", () => {
  const horizontal = (
    over: Partial<Parameters<typeof computeMiddleLabelLayout>[0]> = {}
  ) =>
    computeMiddleLabelLayout({
      renderPoints: [p(0, 100), p(200, 100)],
      labelText: "Rel",
      fontSize: 12,
      ...over,
    })
  const vertical = (
    over: Partial<Parameters<typeof computeMiddleLabelLayout>[0]> = {}
  ) =>
    computeMiddleLabelLayout({
      renderPoints: [p(100, 0), p(100, 200)],
      labelText: "Rel",
      fontSize: 12,
      ...over,
    })

  it("defaults a horizontal edge label to centered ON TOP (above)", () => {
    const placed = horizontal()
    expect(placed.side).toBe("above")
    expect(placed.x).toBe(100)
    expect(placed.y).toBe(100 - EDGES.LABEL_GAP)
    expect(placed.textAnchor).toBe("middle")
    expect(placed.dominantBaseline).toBe("auto")
  })

  it("defaults a vertical edge label to the right", () => {
    const placed = vertical()
    expect(placed.side).toBe("right")
    expect(placed.x).toBe(100 + EDGES.LABEL_GAP)
    expect(placed.textAnchor).toBe("start")
  })

  it("flips below when a node occupies the default (above) side (#129)", () => {
    // A wide node spanning the whole arm above, so no clear above window exists.
    const placed = horizontal({
      nodeRects: [{ x: -50, y: 100 - 40, width: 300, height: 40 }],
    })
    expect(placed.side).toBe("below")
    expect(placed.dominantBaseline).toBe("hanging")
  })

  it("keeps the default side when both sides are clear", () => {
    const placed = horizontal({
      nodeRects: [{ x: 1000, y: 1000, width: 10, height: 10 }],
    })
    expect(placed.side).toBe("above")
  })

  it("keeps the default side when BOTH sides are equally blocked (deterministic)", () => {
    const placed = horizontal({
      nodeRects: [
        { x: -50, y: 100 - 40, width: 300, height: 40 },
        { x: -50, y: 100, width: 300, height: 40 },
      ],
    })
    expect(placed.side).toBe("above")
  })

  it("breaks a node-clear tie away from a side crossed by another edge", () => {
    // A neighbour edge runs along the whole arm above → flip below.
    const placed = horizontal({
      neighborGeometry: [[p(0, 86), p(200, 86)]],
    })
    expect(placed.side).toBe("below")
  })

  it("never sits on a node to avoid merely crossing an edge", () => {
    // Node blocks BELOW, a neighbour crosses ABOVE: node avoidance dominates.
    const placed = horizontal({
      nodeRects: [{ x: -50, y: 100, width: 300, height: 40 }],
      neighborGeometry: [[p(0, 86), p(200, 86)]],
    })
    expect(placed.side).toBe("above")
  })

  it("moves the label onto a longer arm when the mid-segment is too short (stepped edge)", () => {
    // The user's flowchart staircase: the arc-midpoint lands on the short
    // horizontal arm at y=468 (x 524..541) squeezed between two vertical arms,
    // so a wide label there would cross them. It must move to a clear arm.
    const renderPoints = [
      p(511, 385),
      p(541, 385),
      p(541, 468),
      p(524, 468),
      p(524, 550),
      p(554, 550),
    ]
    const placed = computeMiddleLabelLayout({
      renderPoints,
      labelText: "sdfasd fas dfg",
      fontSize: 12,
    })
    // Not centered on the cramped y=468 arm (that would overlap the arms).
    expect(placed.y).not.toBe(468)
    // Sits beside one of the long vertical arms (x = 541 or 524, ± the gap).
    expect([
      541 + EDGES.LABEL_GAP,
      541 - EDGES.LABEL_GAP,
      524 + EDGES.LABEL_GAP,
      524 - EDGES.LABEL_GAP,
    ]).toContain(placed.x)
    // And it does not cross any of the edge's own arms (verified by the side
    // being a vertical-arm placement, anchored start/end).
    expect(["start", "end"]).toContain(placed.textAnchor)
  })
})

describe("collectNeighborPolylines", () => {
  it("keeps nearby other-edges, drops self / far / degenerate", () => {
    const geometryById: Record<string, IPoint[]> = {
      self: [p(0, 100), p(200, 100)],
      near: [p(90, 90), p(90, 200)],
      far: [p(1000, 1000), p(1000, 1100)],
      degenerate: [p(95, 95)],
    }
    const result = collectNeighborPolylines(
      geometryById,
      "self",
      { x: 100, y: 100 },
      68
    )
    expect(result).toEqual([[p(90, 90), p(90, 200)]])
  })
})

describe("computeUseCaseLabelLayout", () => {
  it("centers on the line with no rotation for a horizontal connector at offset 0", () => {
    const r = computeUseCaseLabelLayout(p(0, 100), p(200, 100), 0)
    expect(r).toEqual({ x: 100, y: 100, rotation: 0 })
  })

  it("offsets perpendicular for a horizontal connector (matches legacy direction)", () => {
    // perp = (-dy, dx) normalized = (0, 1) for a left->right line, so the label
    // is pushed downward by the offset — same as the pre-refactor behavior.
    const r = computeUseCaseLabelLayout(p(0, 100), p(200, 100), 15)
    expect(r.x).toBe(100)
    expect(r.y).toBe(115)
  })

  it("rotates to the slope and flips to stay upright for a leftward connector", () => {
    // target left of source → angle 180 → +180 = 360, which is upright
    // (≡ 0°). Matches the legacy math exactly (360, not normalized).
    const r = computeUseCaseLabelLayout(p(200, 0), p(0, 0), 0)
    expect(((r.rotation % 360) + 360) % 360).toBe(0)
  })

  it("keeps a moderate downward-right diagonal un-flipped", () => {
    const r = computeUseCaseLabelLayout(p(0, 0), p(100, 100), 0)
    expect(r.rotation).toBeCloseTo(45)
  })
})

describe("candidateBox", () => {
  it("sizes the box to the label and offsets it by the gap on the chosen side", () => {
    const point = p(100, 100)
    const above = candidateBox(point, "above", 40, 14)
    expect(above.width).toBe(40)
    expect(above.height).toBe(14)
    expect(above.y + above.height).toBe(100 - EDGES.LABEL_GAP) // gap below text
    const below = candidateBox(point, "below", 40, 14)
    expect(below.y).toBe(100 + EDGES.LABEL_GAP)
    const right = candidateBox(point, "right", 40, 14)
    expect(right.x).toBe(100 + EDGES.LABEL_GAP)
  })
})
