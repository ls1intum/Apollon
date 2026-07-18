import { describe, it, expect } from "vitest"
import { Position, type Rect } from "@xyflow/react"
import { facingSide } from "@/utils/geometry/rectSides"

const rect = (x: number, y: number, w = 100, h = 60): Rect => ({
  x,
  y,
  width: w,
  height: h,
})
const centerOf = (r: Rect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 })

describe("facingSide", () => {
  it("picks the side whose axis the partner is most displaced along", () => {
    const a = rect(0, 0)
    expect(facingSide(a, centerOf(rect(300, 0)))).toBe(Position.Right)
    expect(facingSide(a, centerOf(rect(-300, 0)))).toBe(Position.Left)
    expect(facingSide(a, centerOf(rect(0, 300)))).toBe(Position.Bottom)
    expect(facingSide(a, centerOf(rect(0, -300)))).toBe(Position.Top)
  })

  it("weighs displacement against the half-extent, so a wide node still exits its top", () => {
    // 400x20: a partner only 40px up but 120px across still leaves the TOP, because
    // the vertical half-extent is tiny. |dx|·halfH = 1200 < |dy|·halfW = 8000.
    const wide = rect(0, 0, 400, 20)
    expect(facingSide(wide, { x: 320, y: -30 })).toBe(Position.Top)
  })
})
