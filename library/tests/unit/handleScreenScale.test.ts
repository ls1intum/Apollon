import { describe, expect, it } from "vitest"
import { getHandleScreenScale } from "@/utils/geometry/scalar"
import { CANVAS } from "@/constants"

/**
 * Connection indicators hold a usable on-screen size when zoomed out and grow with
 * the node when zoomed in. The identity above 1 is what lets the publisher skip
 * writes for most of a zoom-in gesture.
 */
describe("getHandleScreenScale", () => {
  it("leaves the arc at its natural size once zoomed in", () => {
    expect(getHandleScreenScale(1)).toBe(1)
    expect(getHandleScreenScale(2)).toBe(1)
  })

  it("counter-scales below 1 so the arc keeps its on-screen size", () => {
    expect(getHandleScreenScale(0.5)).toBe(2)
  })

  it("clamps rather than diverging at a very small zoom", () => {
    expect(getHandleScreenScale(CANVAS.MIN_SCALE_TO_ZOOM_OUT / 10)).toBe(
      1 / CANVAS.MIN_SCALE_TO_ZOOM_OUT
    )
  })

  it("falls back to natural size for a zoom that is not a positive number", () => {
    expect(getHandleScreenScale(0)).toBe(1)
    expect(getHandleScreenScale(-1)).toBe(1)
    expect(getHandleScreenScale(Number.NaN)).toBe(1)
  })
})
