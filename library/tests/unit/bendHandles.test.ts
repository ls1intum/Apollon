import { describe, expect, it } from "vitest"
import { Position } from "@xyflow/react"
import {
  applyInnerSegmentBend,
  applyTerminalSegmentBend,
  getBendHandlePosition,
  getBendableSegments,
  getSegmentKind,
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

  it("offers a bend handle on a segment with room", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]

    const handles = getBendableSegments(
      points,
      Position.Right,
      Position.Left,
      stubLength
    )

    expect(handles).toHaveLength(1)
    expect(handles[0].segmentIndex).toBe(0)
    expect(handles[0].orientation).toBe("H")
    // Handle is centered on the full geometric segment.
    expect(handles[0].position).toEqual({ x: 100, y: 0 })
  })

  it("gives EVERY segment a handle, however short", () => {
    // Handles used to be deleted when a fixed-size 34px pill would not fit,
    // which left short edges with nothing to grab — and, since a terminal
    // segment also gives up 25px of safe area, made the default 30px stub
    // unbendable at ANY zoom (25 + 34 > 30 is arithmetic, not a threshold).
    // Availability is no longer a function of length: the renderer shrinks the
    // handle, and the drag is kept legal by the lane clamp instead.
    const shortSegment = [
      { x: 0, y: 0 },
      { x: 12, y: 0 },
    ]
    expect(
      getBendableSegments(
        shortSegment,
        Position.Right,
        Position.Left,
        EDGES.BEND_HANDLE_SAFE_AREA_PX
      )
    ).toHaveLength(1)

    // A default-length stub, the case that was impossible before.
    const stub = [
      { x: 0, y: 0 },
      { x: EDGES.STUB_LENGTH, y: 0 },
    ]
    const [stubHandle] = getBendableSegments(
      stub,
      Position.Right,
      Position.Left,
      EDGES.BEND_HANDLE_SAFE_AREA_PX
    )
    expect(stubHandle).toBeDefined()
    expect(stubHandle.position).toEqual({ x: EDGES.STUB_LENGTH / 2, y: 0 })

    // Every segment of a multi-bend route gets one, none skipped.
    const route = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 8 },
      { x: 300, y: 8 },
      { x: 300, y: 20 },
    ]
    expect(
      getBendableSegments(
        route,
        Position.Right,
        Position.Left,
        EDGES.BEND_HANDLE_SAFE_AREA_PX
      )
    ).toHaveLength(4)
  })

  it("reports the room each handle has, so the renderer can size it", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]
    const safeArea = EDGES.BEND_HANDLE_SAFE_AREA_PX

    const [roomy] = getBendableSegments(
      points,
      Position.Right,
      Position.Left,
      safeArea
    )
    // One segment is both terminals, so it gives up the safe area at both ends.
    expect(roomy.bendableLength).toBe(200 - 2 * safeArea)

    // A segment with no room to spare reports its own length instead of a
    // negative one, and the handle sits at its plain midpoint.
    const tight = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
    ]
    const [cramped] = getBendableSegments(
      tight,
      Position.Right,
      Position.Left,
      safeArea
    )
    expect(cramped.bendableLength).toBe(20)
    expect(cramped.position).toEqual({ x: 10, y: 0 })
  })

  it("keeps a handle past the node safe area when the segment has room for it", () => {
    const safeArea = EDGES.BEND_HANDLE_SAFE_AREA_PX
    const points = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]
    // bendable = 200 - 2*25 = 150; handle centred over [25, 175] → x = 100.
    const [handle] = getBendableSegments(
      points,
      Position.Right,
      Position.Left,
      safeArea
    )
    expect(handle.position.x).toBeGreaterThanOrEqual(safeArea)
    expect(handle.position.x).toBeLessThanOrEqual(200 - safeArea)
    expect(handle.position).toEqual({ x: 100, y: 0 })
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
