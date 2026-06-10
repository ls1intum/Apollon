import { describe, expect, it } from "vitest"
import { flowToCanvasPosition } from "@/components/collaboration/coordinates"

describe("flowToCanvasPosition", () => {
  it("converts flow coordinates into coordinates local to the canvas", () => {
    expect(
      flowToCanvasPosition({ x: 120, y: 80 }, { x: -40, y: 30, zoom: 1.5 })
    ).toEqual({ x: 140, y: 150 })
  })

  it("does not include the browser or host layout offset", () => {
    expect(
      flowToCanvasPosition({ x: 600, y: 200 }, { x: 10, y: -20, zoom: 0.5 })
    ).toEqual({ x: 310, y: 80 })
  })
})
