import { describe, expect, it } from "vitest"
import { Position } from "@xyflow/react"
import {
  applyInnerSegmentBend,
  applyTerminalSegmentBend,
  getBendHandlePosition,
  getBendableSegments,
  getSegmentKind,
  isLengthEditableAtZoom,
} from "@/utils/geometry/bendHandles"
import { EDGES } from "@/constants"

const stubLength = 30

// ---------------------------------------------------------------------------
// bend handle utilities
// ---------------------------------------------------------------------------

describe("bend handle utilities", () => {
  it("classifies terminal and inner segments", () => {
    expect(getSegmentKind(0, 4)).toBe("source-terminal")
    expect(getSegmentKind(2, 4)).toBe("target-terminal")
    expect(getSegmentKind(1, 4)).toBe("inner")
  })

  it("offers a bend handle on a segment with enough on-screen room", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]

    const handles = getBendableSegments(
      points,
      Position.Right,
      Position.Left,
      stubLength,
      100
    )

    expect(handles).toHaveLength(1)
    expect(handles[0].segmentIndex).toBe(0)
    expect(handles[0].orientation).toBe("H")
    // Handle is centered on the full geometric segment.
    expect(handles[0].position).toEqual({ x: 100, y: 0 })
  })

  it("treats the minimum edit length as zoom-aware screen length", () => {
    expect(isLengthEditableAtZoom(90, 100, 1)).toBe(false)
    expect(isLengthEditableAtZoom(90, 100, 2)).toBe(true)
    expect(isLengthEditableAtZoom(100, 100, 1)).toBe(true)
  })

  it("reveals a bend handle on a short segment once zoom gives it enough on-screen length", () => {
    // 40px bendable segment (no safe area here): below the 54px on-screen
    // budget at 1x, above it at 2x. Availability is judged on the *on-screen*
    // length, so zooming in reveals handles and never hides them.
    const points = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
    ]
    const minScreen = 54

    expect(
      getBendableSegments(
        points,
        Position.Right,
        Position.Left,
        0,
        minScreen,
        1
      )
    ).toHaveLength(0)
    expect(
      getBendableSegments(
        points,
        Position.Right,
        Position.Left,
        0,
        minScreen,
        2
      )
    ).toHaveLength(1)
  })

  it("uses the documented on-screen budget at the exact boundary", () => {
    // The budget is the handle's long axis plus clearance on both sides.
    const budget =
      EDGES.BEND_HANDLE_SCREEN_LENGTH_PX +
      2 * EDGES.BEND_HANDLE_CORNER_CLEARANCE_PX
    expect(EDGES.BEND_HANDLE_MIN_SEGMENT_SCREEN_PX).toBe(budget)
    expect(budget).toBe(54)

    const seg = (len: number) => [
      { x: 0, y: 0 },
      { x: len, y: 0 },
    ]
    // With no safe area, exactly at the budget (54px on screen at 1x) a handle
    // is offered; one pixel short, it is not.
    expect(
      getBendableSegments(
        seg(budget),
        Position.Right,
        Position.Left,
        0,
        budget,
        1
      )
    ).toHaveLength(1)
    expect(
      getBendableSegments(
        seg(budget - 1),
        Position.Right,
        Position.Left,
        0,
        budget,
        1
      )
    ).toHaveLength(0)
  })

  it("keeps bend handles out of the node safe area and places them past it", () => {
    const safeArea = EDGES.BEND_HANDLE_SAFE_AREA_PX // 25
    // A source-terminal segment from the node (x=0) to the first bend (x=200).
    const points = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]
    // Single segment = both terminals, so both ends lose the safe area:
    // bendable = 200 - 2*25 = 150; handle centred over [25, 175] → x = 100.
    const [handle] = getBendableSegments(
      points,
      Position.Right,
      Position.Left,
      safeArea,
      54,
      1
    )
    expect(handle).toBeDefined()
    expect(handle.position.x).toBeGreaterThanOrEqual(safeArea)
    expect(handle.position.x).toBeLessThanOrEqual(200 - safeArea)
    expect(handle.position).toEqual({ x: 100, y: 0 })

    // A segment that is entirely safe area (<= 2*safeArea) offers no handle.
    const allSafe = [
      { x: 0, y: 0 },
      { x: 2 * safeArea, y: 0 },
    ]
    expect(
      getBendableSegments(
        allSafe,
        Position.Right,
        Position.Left,
        safeArea,
        54,
        10
      )
    ).toHaveLength(0)
  })

  it("positions a target terminal handle using the stub exit", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 120 },
    ]

    const handlePosition = getBendHandlePosition(
      points,
      1,
      Position.Right,
      Position.Bottom,
      stubLength
    )

    // Midpoint of segment [{100,0} → {100,120}] = {100, 60}.
    expect(handlePosition).toEqual({ x: 100, y: 60 })
  })

  it("bends inner segments by shifting the perpendicular axis", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ]

    const result = applyInnerSegmentBend(points, 1, { x: 18, y: 0 }, 10)

    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 100 },
      { x: 200, y: 100 },
    ])
  })

  it("keeps a near-collapsed U-shape orthogonal during preview", () => {
    const points = [
      { x: 0, y: 200 },
      { x: 30, y: 200 },
      { x: 30, y: 250 },
      { x: 370, y: 250 },
      { x: 370, y: 200 },
      { x: 400, y: 200 },
    ]

    // Move only the left arm to x=360 while the right arm remains untouched at x=370.
    const result = applyInnerSegmentBend(points, 1, { x: 330, y: 0 }, 10)

    expect(result).toEqual([
      { x: 0, y: 200 },
      { x: 360, y: 200 },
      { x: 360, y: 250 },
      { x: 370, y: 250 },
      { x: 370, y: 200 },
      { x: 400, y: 200 },
    ])
  })

  it("does not snap a U-shape when vertical arms are farther than 10px apart", () => {
    const points = [
      { x: 0, y: 200 },
      { x: 30, y: 200 },
      { x: 30, y: 250 },
      { x: 370, y: 250 },
      { x: 370, y: 200 },
      { x: 400, y: 200 },
    ]

    // Move left arm to x=350; right arm remains at x=370 (20px gap).
    const result = applyInnerSegmentBend(points, 1, { x: 320, y: 0 }, 10)

    expect(result).toEqual([
      { x: 0, y: 200 },
      { x: 350, y: 200 },
      { x: 350, y: 250 },
      { x: 370, y: 250 },
      { x: 370, y: 200 },
      { x: 400, y: 200 },
    ])
  })

  it("adds a bridge when bending an inner segment next to a same-axis adjacent segment", () => {
    // 5-point path: source-stub(H) → inner-V → inner-H → target-stub(V)
    // Bending the inner-H (segment 2) with adjTargetSame=true (segment 3 is also V)
    // should insert a bridge at the old target corner.
    const points = [
      { x: 0, y: 200 }, // source
      { x: 30, y: 200 }, // source stub end
      { x: 30, y: 90 }, // first corner
      { x: 500, y: 90 }, // inner H segment end = second corner (segment 2)
      { x: 500, y: 429 }, // target (target stub is V, same axis as segment 3 if present)
    ]

    // Bend segment 2 (H, from {30,90} to {500,90}) downward by 10px (adjTargetSame=false here)
    const result = applyInnerSegmentBend(points, 2, { x: 0, y: 100 }, 10)

    expect(result).toEqual([
      { x: 0, y: 200 },
      { x: 30, y: 200 },
      { x: 30, y: 190 },
      { x: 500, y: 190 },
      { x: 500, y: 429 },
    ])
  })

  it("bends source terminal segments with lift-and-bridge", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]

    const result = applyTerminalSegmentBend(
      points,
      {
        segmentIndex: 0,
        position: { x: 65, y: 0 },
        orientation: "H",
        kind: "source-terminal",
      },
      { x: 0, y: 20 },
      Position.Right,
      Position.Bottom,
      stubLength,
      10
    )

    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 20 },
      { x: 100, y: 20 },
      { x: 100, y: 100 },
    ])
  })

  it("inserts both stubs when bending the single segment of a 2-point straight edge", () => {
    // Straight Right→Left edge: src handle at {0,200}, tgt handle at {400,200}
    const points = [
      { x: 0, y: 200 },
      { x: 400, y: 200 },
    ]

    const result = applyTerminalSegmentBend(
      points,
      {
        segmentIndex: 0,
        position: { x: 200, y: 200 },
        orientation: "H",
        kind: "source-terminal",
      },
      { x: 0, y: 50 },
      Position.Right,
      Position.Left,
      stubLength,
      10
    )

    // Expected 6-point orthogonal path with both stubs preserved:
    //   src → {src.x+30, src.y} → {src.x+30, newY} → {tgt.x-30, newY} → {tgt.x-30, tgt.y} → tgt
    expect(result).toEqual([
      { x: 0, y: 200 },
      { x: 30, y: 200 },
      { x: 30, y: 250 },
      { x: 370, y: 250 },
      { x: 370, y: 200 },
      { x: 400, y: 200 },
    ])
  })
})
