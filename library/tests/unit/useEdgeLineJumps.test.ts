import { describe, expect, it } from "vitest"
import { buildEdgePath } from "@/hooks/useEdgeLineJumps"

describe("buildEdgePath label gap", () => {
  it("carves an include/extend gap from the local arc-mid segment", () => {
    const path = buildEdgePath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 300 },
      ],
      [],
      {
        segmentIndex: 1,
        center: { x: 100, y: 100 },
        halfSize: 40,
      }
    )
    expect(path).toBe("M 0 0 L 100 0 L 100 60 M 100 140 L 100 300")
  })

  it("clamps the gap so a short segment never reverses", () => {
    const path = buildEdgePath(
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
      ],
      [],
      {
        segmentIndex: 0,
        center: { x: 10, y: 0 },
        halfSize: 40,
      }
    )
    expect(path).toBe("M 0 0 L 1 0 M 19 0 L 20 0")
  })

  it("keeps bridge jumps outside the label gap", () => {
    const path = buildEdgePath(
      [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        { x: 200, y: 300 },
      ],
      [
        {
          segmentIndex: 0,
          point: { x: 80, y: 0 },
          orientation: "horizontal",
        },
      ],
      {
        segmentIndex: 1,
        center: { x: 200, y: 100 },
        halfSize: 40,
      }
    )
    expect(path).toContain("L 72 0 Q 80 -10 88 0")
    expect(path).toContain("L 200 60 M 200 140")
  })

  it("clamps against a nearby bend instead of reversing through it", () => {
    const path = buildEdgePath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 300 },
      ],
      [],
      {
        segmentIndex: 1,
        center: { x: 100, y: 10 },
        halfSize: 40,
      }
    )
    expect(path).toBe("M 0 0 L 100 0 L 100 1 M 100 19 L 100 300")
  })
})
