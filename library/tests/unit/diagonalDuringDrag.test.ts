import { describe, expect, it } from "vitest"
import { Position } from "@xyflow/react"
import { preserveOrthogonalEdgePoints } from "@/utils/edgeUtils"
import { applyTerminalSegmentBend } from "@/utils/geometry/bendHandles"

// Repro: user creates aligned R→L edge, bends UP to make U, drags source CLOSE
// to target (triggers stubsWouldOverlap fallback), then drags
// source AWAY again, then bends. The bend must NOT produce a diagonal segment.

describe("diagonal-during-drag repro", () => {
  it("safePoints when stubs overlap is rendered as orthogonal U", () => {
    const sourcePoint = { x: 100, y: 200 }
    const targetPoint = { x: 150, y: 200 }

    const stored6PointU = [
      { x: 0, y: 200 },
      { x: 30, y: 200 },
      { x: 30, y: 100 },
      { x: 270, y: 100 },
      { x: 270, y: 200 },
      { x: 300, y: 200 },
    ]

    const result = preserveOrthogonalEdgePoints(
      stored6PointU,
      sourcePoint,
      targetPoint,
      Position.Right,
      Position.Left
    )

    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1]
      const curr = result[i]
      const orthogonal = prev.x === curr.x || prev.y === curr.y
      expect(orthogonal, `segment ${i - 1}→${i} not orthogonal`).toBe(true)
    }
  })

  it("re-expansion from [src,tgt] after stubs no longer overlap", () => {
    const sourcePoint = { x: 0, y: 200 }
    const targetPoint = { x: 400, y: 200 }

    const stored2Point = [
      { x: 150, y: 200 },
      { x: 400, y: 200 },
    ]

    const result = preserveOrthogonalEdgePoints(
      stored2Point,
      sourcePoint,
      targetPoint,
      Position.Right,
      Position.Left
    )

    expect(result).toEqual([
      { x: 0, y: 200 },
      { x: 400, y: 200 },
    ])
  })

  it("bend with 2-point input produces orthogonal U", () => {
    const points = [
      { x: 0, y: 200 },
      { x: 400, y: 200 },
    ]
    const handle = {
      segmentIndex: 0,
      position: { x: 200, y: 200 },
      orientation: "H" as const,
      kind: "source-terminal" as const,
    }
    const delta = { x: 0, y: -100 }

    const result = applyTerminalSegmentBend(
      points,
      handle,
      delta,
      Position.Right,
      Position.Left,
      30,
      10
    )

    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1]
      const curr = result[i]
      const orthogonal = prev.x === curr.x || prev.y === curr.y
      expect(orthogonal, `segment ${i - 1}→${i} not orthogonal`).toBe(true)
    }
  })

  it("bend with 4-point collinear path (auto-routed straight) produces orthogonal output", () => {
    // After collapse-then-expand, the stored 2-point path can render as a
    // 4-point collinear safePoints path [src, src+stub, tgt-stub, tgt]. A
    // source-terminal bend on this input must not leak the intermediate
    // waypoints into the result as a diagonal segment.
    const points = [
      { x: 0, y: 200 },
      { x: 30, y: 200 },
      { x: 370, y: 200 },
      { x: 400, y: 200 },
    ]
    const handle = {
      segmentIndex: 0,
      position: { x: 15, y: 200 },
      orientation: "H" as const,
      kind: "source-terminal" as const,
    }
    const delta = { x: 0, y: -100 }

    const result = applyTerminalSegmentBend(
      points,
      handle,
      delta,
      Position.Right,
      Position.Left,
      30,
      10
    )

    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1]
      const curr = result[i]
      const orthogonal = prev.x === curr.x || prev.y === curr.y
      expect(
        orthogonal,
        `segment ${i - 1}→${i} not orthogonal: ${JSON.stringify(prev)}→${JSON.stringify(curr)}`
      ).toBe(true)
    }
  })
})
