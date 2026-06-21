import { describe, expect, it } from "vitest"
import {
  flattenPath,
  pathTotalLength,
  pathPointAtLength,
} from "./svgPathGeometry.js"

// The user's BPMN sequence-flow path: a 3-segment orthogonal polyline.
const BPMN = "M 376 426 L 470 426 L 470 216 L 500 216"
// lengths: 94 (right) + 210 (up) + 30 (right) = 334

describe("flattenPath", () => {
  it("flattens an M/L polyline to its exact vertices", () => {
    expect(flattenPath(BPMN)).toEqual([
      { x: 376, y: 426 },
      { x: 470, y: 426 },
      { x: 470, y: 216 },
      { x: 500, y: 216 },
    ])
  })

  it("treats coordinates after an M as implicit line-tos", () => {
    expect(flattenPath("M 0 0 10 0 10 10")).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ])
  })

  it("supports H/V and relative commands", () => {
    expect(flattenPath("M 0 0 H 10 V 10 h -5 v -5")).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 5, y: 10 },
      { x: 5, y: 5 },
    ])
  })

  it("samples a quadratic curve through its endpoints", () => {
    // The line-jump hop shape: a small bump that returns to the baseline.
    const pts = flattenPath("M 0 0 Q 10 10 20 0")
    expect(pts[0]).toEqual({ x: 0, y: 0 })
    expect(pts[pts.length - 1]).toEqual({ x: 20, y: 0 })
    // The peak of the bump sits at the curve midpoint (y = 5 for this control).
    const peak = Math.max(...pts.map((p) => p.y))
    expect(peak).toBeCloseTo(5, 1)
  })
})

describe("pathTotalLength", () => {
  it("sums the polyline segment lengths", () => {
    expect(pathTotalLength(BPMN)).toBeCloseTo(334, 5)
  })

  it("is zero for a lone move", () => {
    expect(pathTotalLength("M 5 5")).toBe(0)
  })
})

describe("pathPointAtLength", () => {
  it("returns the start at length 0 and the end at total length", () => {
    expect(pathPointAtLength(BPMN, 0)).toEqual({ x: 376, y: 426 })
    expect(pathPointAtLength(BPMN, 334)).toEqual({ x: 500, y: 216 })
  })

  it("walks segments to find the on-path midpoint", () => {
    // Half of 334 = 167: 94 along the first segment lands the corner (470,426),
    // then 73 down the vertical segment → (470, 353).
    expect(pathPointAtLength(BPMN, 167)).toEqual({ x: 470, y: 353 })
  })

  it("lands exactly on a corner", () => {
    expect(pathPointAtLength(BPMN, 94)).toEqual({ x: 470, y: 426 })
  })

  it("clamps below 0 and beyond the total length to the endpoints", () => {
    expect(pathPointAtLength(BPMN, -10)).toEqual({ x: 376, y: 426 })
    expect(pathPointAtLength(BPMN, 9999)).toEqual({ x: 500, y: 216 })
  })
})
