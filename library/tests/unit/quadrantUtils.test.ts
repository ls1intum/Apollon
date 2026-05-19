import { describe, it, expect } from "vitest"
import { getQuadrant } from "@/utils/quadrantUtils"
import { Quadrant } from "@/enums/Quadrant"

describe("getQuadrant", () => {
  const ref = { x: 100, y: 100 }

  it("returns BottomRight when target is to the right and below", () => {
    expect(getQuadrant({ x: 150, y: 150 }, ref)).toBe(Quadrant.BottomRight)
  })

  it("returns BottomLeft when target is to the left and below", () => {
    expect(getQuadrant({ x: 50, y: 150 }, ref)).toBe(Quadrant.BottomLeft)
  })

  it("returns TopRight when target is to the right and above", () => {
    expect(getQuadrant({ x: 150, y: 50 }, ref)).toBe(Quadrant.TopRight)
  })

  it("returns TopLeft when target is to the left and above", () => {
    expect(getQuadrant({ x: 50, y: 50 }, ref)).toBe(Quadrant.TopLeft)
  })

  // Axis-equality tiebreak: `>=` on both axes lands at BottomRight.
  it("returns TopRight when x equals reference x and y < ref.y", () => {
    expect(getQuadrant({ x: 100, y: 50 }, ref)).toBe(Quadrant.TopRight)
  })

  it("returns BottomLeft when y equals reference y and x < ref.x", () => {
    expect(getQuadrant({ x: 50, y: 100 }, ref)).toBe(Quadrant.BottomLeft)
  })

  it("returns BottomRight when target sits exactly on the reference", () => {
    expect(getQuadrant({ x: 100, y: 100 }, ref)).toBe(Quadrant.BottomRight)
  })

  it("returns BottomRight when x equals reference x and y > ref.y", () => {
    expect(getQuadrant({ x: 100, y: 200 }, ref)).toBe(Quadrant.BottomRight)
  })

  it("returns BottomRight when y equals reference y and x > ref.x", () => {
    expect(getQuadrant({ x: 200, y: 100 }, ref)).toBe(Quadrant.BottomRight)
  })

  it("works with negative coordinates", () => {
    expect(getQuadrant({ x: -50, y: -50 }, { x: 0, y: 0 })).toBe(
      Quadrant.TopLeft
    )
    expect(getQuadrant({ x: 50, y: 50 }, { x: 0, y: 0 })).toBe(
      Quadrant.BottomRight
    )
  })

  it("works with zero reference point", () => {
    expect(getQuadrant({ x: 1, y: -1 }, { x: 0, y: 0 })).toBe(Quadrant.TopRight)
    expect(getQuadrant({ x: -1, y: 1 }, { x: 0, y: 0 })).toBe(
      Quadrant.BottomLeft
    )
  })

  it("works with floating point coordinates", () => {
    expect(getQuadrant({ x: 100.001, y: 100.001 }, ref)).toBe(
      Quadrant.BottomRight
    )
    expect(getQuadrant({ x: 99.999, y: 99.999 }, ref)).toBe(Quadrant.TopLeft)
  })
})
