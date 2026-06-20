import { describe, expect, it } from "vitest"
import { computeSlideViewport } from "../../src/utils/svgToPptx"

describe("computeSlideViewport", () => {
  it("fits the canvas to the diagram when no canvas is given (1:1)", () => {
    const v = computeSlideViewport({ width: 480, height: 240 })
    expect(v.scale).toBe(1)
    expect(v.offsetX).toBe(0)
    expect(v.offsetY).toBe(0)
    expect(v.slideWidth).toBeCloseTo(5)
    expect(v.slideHeight).toBeCloseTo(2.5)
  })

  it("never scales below 1 inch — defends against PowerPoint sub-1″ slide bug", () => {
    const v = computeSlideViewport({ width: 48, height: 48 })
    expect(v.slideWidth).toBe(1)
    expect(v.slideHeight).toBe(1)
  })

  it("shrink mode never enlarges small diagrams on a fixed canvas", () => {
    const v = computeSlideViewport(
      { width: 480, height: 240 },
      { width: 13.333, height: 7.5 },
      "shrink"
    )
    expect(v.scale).toBe(1)
    expect(v.offsetX).toBeGreaterThan(0)
    expect(v.offsetY).toBeGreaterThan(0)
  })

  it("shrink mode scales down oversized diagrams", () => {
    const v = computeSlideViewport(
      { width: 4000, height: 1500 },
      { width: 13.333, height: 7.5 },
      "shrink"
    )
    expect(v.scale).toBeLessThan(1)
    expect(v.scale).toBeGreaterThan(0)
  })

  it("fill mode scales small diagrams up to the canvas", () => {
    const v = computeSlideViewport(
      { width: 480, height: 240 },
      { width: 13.333, height: 7.5 },
      "fill"
    )
    expect(v.scale).toBeGreaterThan(1)
  })

  it("actual mode never scales (may overflow)", () => {
    const v = computeSlideViewport(
      { width: 4000, height: 1500 },
      { width: 13.333, height: 7.5 },
      "actual"
    )
    expect(v.scale).toBe(1)
    // Overflow: drawn diagram is wider than the canvas, so X offset goes negative.
    expect(v.offsetX).toBeLessThan(0)
  })

  it("centres the diagram within the canvas", () => {
    const canvas = { width: 13.333, height: 7.5 }
    const v = computeSlideViewport(
      { width: 480, height: 240 },
      canvas,
      "shrink"
    )
    const drawnW = (480 / 96) * v.scale
    const drawnH = (240 / 96) * v.scale
    expect(v.offsetX).toBeCloseTo((canvas.width - drawnW) / 2, 6)
    expect(v.offsetY).toBeCloseTo((canvas.height - drawnH) / 2, 6)
  })
})
