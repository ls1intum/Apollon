import { describe, expect, it } from "vitest"
import {
  parsePath,
  pathBBox,
  tokenizePath,
} from "../../src/utils/svgPathParser"

describe("tokenizePath", () => {
  it("parses absolute commands without separators between negative numbers", () => {
    const tokens = tokenizePath("M0 0L1-1")
    expect(tokens).toEqual([
      { cmd: "M", args: [0, 0] },
      { cmd: "L", args: [1, -1] },
    ])
  })

  it("handles leading dot decimals and exponents", () => {
    const tokens = tokenizePath("M.5 .5L1e2 2e-1")
    expect(tokens[0].args).toEqual([0.5, 0.5])
    expect(tokens[1].args).toEqual([100, 0.2])
  })

  it("treats arc flags as single 0/1 digits with no required separator", () => {
    // "A 5 5 0 1 1 10 10" with packed flags: rx=5 ry=5 rot=0 large=1 sweep=1 x=10 y=10
    const tokens = tokenizePath("M0 0A5 5 0 11 10 10")
    expect(tokens[1].cmd).toBe("A")
    expect(tokens[1].args).toEqual([5, 5, 0, 1, 1, 10, 10])
  })
})

describe("parsePath", () => {
  it("emits implicit lineTo after a moveTo with multiple coord pairs", () => {
    const segs = parsePath("M0 0 1 1 2 2")
    expect(segs.map((s) => s.type)).toEqual(["M", "L", "L"])
  })

  it("normalizes quadratic to cubic", () => {
    const segs = parsePath("M0 0 Q5 -5 10 0")
    expect(segs).toHaveLength(2)
    expect(segs[1].type).toBe("C")
  })

  it("reflects S control point off the previous cubic", () => {
    const segs = parsePath("M0 0 C0 -5 5 -5 5 0 S10 5 10 0")
    expect(segs).toHaveLength(3)
    const second = segs[2]
    if (second.type !== "C") throw new Error("expected cubic")
    // Reflected control point of (5, -5) about (5, 0) is (5, 5).
    expect(second.c1.x).toBe(5)
    expect(second.c1.y).toBe(5)
  })

  it("Z resets current point to subpath start", () => {
    const segs = parsePath("M2 2 L4 4 Z L6 6")
    // After Z, the implicit line should originate from (2,2) not (4,4).
    expect(segs[0]).toEqual({ type: "M", pt: { x: 2, y: 2 } })
    expect(segs[1]).toEqual({ type: "L", pt: { x: 4, y: 4 } })
    expect(segs[2]).toEqual({ type: "Z" })
    // L6 6 follows; we don't assert position math, just that it is captured.
    expect(segs[3]).toEqual({ type: "L", pt: { x: 6, y: 6 } })
  })

  it("handles relative commands updating the current point", () => {
    const segs = parsePath("M10 10 l5 0 l0 5")
    expect(segs[1]).toEqual({ type: "L", pt: { x: 15, y: 10 } })
    expect(segs[2]).toEqual({ type: "L", pt: { x: 15, y: 15 } })
  })

  it("emits a straight line for an arc with zero radii", () => {
    const segs = parsePath("M0 0 A0 0 0 0 0 10 10")
    expect(segs.length).toBe(2)
    // The single emitted segment is a degenerate cubic that lands at (10,10).
    const last = segs[1]
    if (last.type !== "C") throw new Error("expected cubic")
    expect(last.pt).toEqual({ x: 10, y: 10 })
  })

  it("returns an empty array for malformed input", () => {
    expect(parsePath("")).toEqual([])
    expect(parsePath("garbage")).toEqual([])
  })
})

describe("pathBBox", () => {
  it("includes cubic control points (control-polygon bound)", () => {
    const segs = parsePath("M0 0 C 50 -50 50 50 100 0")
    const bbox = pathBBox(segs)
    // Anchors are (0,0) and (100,0); control points push y to ±50.
    expect(bbox.x).toBe(0)
    expect(bbox.y).toBe(-50)
    expect(bbox.width).toBe(100)
    expect(bbox.height).toBe(100)
  })

  it("returns a zero-area bbox for empty paths", () => {
    expect(pathBBox([])).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })
})
