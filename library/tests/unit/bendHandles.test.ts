import { describe, expect, it } from "vitest"
import { Position } from "@xyflow/react"
import {
  applyInnerSegmentBend,
  applyTerminalSegmentBend,
  collapseCollinearPoints,
  getBendHandlePosition,
  getBendableSegments,
  getSegmentKind,
} from "@/utils/geometry/bendHandles"
import { IPoint } from "@/edges/Connection"
import { EDGES } from "@/constants"

const stubLength = 30

const isOrthogonal = (points: IPoint[]): boolean =>
  points.every(
    (p, i) => i === 0 || p.x === points[i - 1].x || p.y === points[i - 1].y
  )

const hasZeroLengthSegment = (points: IPoint[]): boolean =>
  points.some(
    (p, i) => i > 0 && p.x === points[i - 1].x && p.y === points[i - 1].y
  )

/**
 * A path with no collinear no-op and no overshoot "spike": collapsing collinear
 * runs must not shrink it (a collinear jog would vanish), and it must be free of
 * zero-length segments (a spike doubles back through a repeated point).
 */
const isCleanBend = (points: IPoint[]): boolean =>
  isOrthogonal(points) &&
  !hasZeroLengthSegment(points) &&
  collapseCollinearPoints(points).length === points.length

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

    const handles = getBendableSegments(points, stubLength)

    expect(handles).toHaveLength(1)
    expect(handles[0].segmentIndex).toBe(0)
    expect(handles[0].orientation).toBe("H")
    // Handle is centered on the full geometric segment.
    expect(handles[0].position).toEqual({ x: 100, y: 0 })
  })

  it("keeps inner + lone-segment handles at any length, but withholds a bend handle from a too-short TERMINAL segment", () => {
    // A lone single segment (2-point edge) always gets a handle, however short:
    // its bend jogs BETWEEN the two ports, so it is not a pinned stub. The
    // renderer shrinks the handle to fit; availability is not a function of length.
    const shortLone = [
      { x: 0, y: 0 },
      { x: 12, y: 0 },
    ]
    expect(
      getBendableSegments(shortLone, EDGES.BEND_HANDLE_SAFE_AREA_PX)
    ).toHaveLength(1)

    // A default-length stub as a lone segment, the case that was impossible before.
    const stub = [
      { x: 0, y: 0 },
      { x: EDGES.STUB_LENGTH, y: 0 },
    ]
    const [stubHandle] = getBendableSegments(
      stub,
      EDGES.BEND_HANDLE_SAFE_AREA_PX
    )
    expect(stubHandle).toBeDefined()
    expect(stubHandle.position).toEqual({ x: EDGES.STUB_LENGTH / 2, y: 0 })

    // Multi-bend route with SHORT terminal segments (10px source stub, 12px target
    // stub): both terminals are pinned to a port and cannot bend cleanly at that
    // length, so they get no handle — the endpoint reconnect target owns them. Only
    // the two INNER segments keep a handle (inner segments bend cleanly at any length).
    const shortTerminals = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 8 },
      { x: 300, y: 8 },
      { x: 300, y: 20 },
    ]
    const shortHandles = getBendableSegments(
      shortTerminals,
      EDGES.BEND_HANDLE_SAFE_AREA_PX
    )
    expect(shortHandles.map((h) => h.kind)).toEqual(["inner", "inner"])

    // The SAME route with LONG terminal segments (60px each) keeps all four handles:
    // a terminal long enough to bend without cramping its stub is bendable.
    const longTerminals = [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 60, y: 8 },
      { x: 300, y: 8 },
      { x: 300, y: 80 },
    ]
    expect(
      getBendableSegments(longTerminals, EDGES.BEND_HANDLE_SAFE_AREA_PX).map(
        (h) => h.kind
      )
    ).toEqual(["source-terminal", "inner", "inner", "target-terminal"])
  })

  it("gates a terminal handle on the segment's full length, not its reserved bend region (regression)", () => {
    const safeArea = EDGES.BEND_HANDLE_SAFE_AREA_PX
    // The user's repro: a 30px target terminal stub. Its reserved bend region is only
    // 30 - min(safeArea, 30/2) = 15px, but `computeTerminalJogCoordinate` bends the
    // FULL 30px segment cleanly, so the handle must be shown. Gating on the reserved
    // region (15 < 20) wrongly withheld it — which also uncapped the endpoint target so
    // it swallowed the neighbouring inner handle.
    const repro = [
      { x: 440, y: -265 },
      { x: 440, y: -405 }, // seg0 V 140px  → source-terminal
      { x: 495, y: -405 }, // seg1 H 55px   → inner
      { x: 495, y: -345 }, // seg2 V 60px   → inner
      { x: 525, y: -345 }, // seg3 H 30px   → target-terminal (was wrongly withheld)
    ]
    expect(getBendableSegments(repro, safeArea).map((h) => h.kind)).toEqual([
      "source-terminal",
      "inner",
      "inner",
      "target-terminal",
    ])

    // Boundary: MIN_STUB_LENGTH + armFloor. A terminal AT the floor (20px) bends
    // cleanly and keeps its handle; one below it (15px) degenerates and is withheld.
    const atFloor = [
      { x: 0, y: 0 },
      { x: 20, y: 0 }, // 20px source terminal — bendable
      { x: 20, y: 200 }, // long inner
      { x: 300, y: 200 }, // 280px target terminal — bendable
    ]
    expect(getBendableSegments(atFloor, safeArea).map((h) => h.kind)).toEqual([
      "source-terminal",
      "inner",
      "target-terminal",
    ])
    const belowFloor = [
      { x: 0, y: 0 },
      { x: 15, y: 0 }, // 15px source terminal — spike, withheld
      { x: 15, y: 200 },
      { x: 300, y: 200 },
    ]
    expect(
      getBendableSegments(belowFloor, safeArea).map((h) => h.kind)
    ).toEqual(["inner", "target-terminal"])
  })

  it("reports the room each handle has, so the renderer can size it", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]
    const safeArea = EDGES.BEND_HANDLE_SAFE_AREA_PX

    const [roomy] = getBendableSegments(points, safeArea)
    // One segment is both terminals, so it gives up the safe area at both ends.
    expect(roomy.bendableLength).toBe(200 - 2 * safeArea)

    // A segment with no room to spare reports its own length instead of a
    // negative one, and the handle sits at its plain midpoint.
    const tight = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
    ]
    const [cramped] = getBendableSegments(tight, safeArea)
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
    const [handle] = getBendableSegments(points, safeArea)
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

  // A terminal segment exactly STUB_LENGTH long has its corner sitting right on
  // the stub exit. Jogging at the stub exit then produces a zero-length move
  // (collinear no-op when dragged "in") or an overshoot (spike when dragged
  // "out"). These guard the clean S-jog that reopens room on both sides.
  describe("bending a stub-length terminal segment (corner == stub exit)", () => {
    // Repro geometry: target arrowhead pinned to a Left port at (525,-345); the
    // 30px terminal stub (495,-345)->(525,-345) is the segment being dragged.
    const targetPath: IPoint[] = [
      { x: 440, y: -265 },
      { x: 440, y: -405 },
      { x: 495, y: -405 },
      { x: 495, y: -345 },
      { x: 525, y: -345 },
    ]
    const targetHandle = {
      segmentIndex: 3,
      position: { x: 510, y: -345 },
      orientation: "H" as const,
      kind: "target-terminal" as const,
      bendableLength: 30,
    }

    it("target terminal (H, Left port) bends cleanly dragging away from the endpoint", () => {
      const result = applyTerminalSegmentBend(
        targetPath,
        targetHandle,
        { x: 0, y: 30 },
        Position.Bottom,
        Position.Left,
        stubLength,
        5
      )

      expect(result).toEqual([
        { x: 440, y: -265 },
        { x: 440, y: -405 },
        { x: 495, y: -405 },
        { x: 495, y: -315 },
        { x: 510, y: -315 },
        { x: 510, y: -345 },
        { x: 525, y: -345 },
      ])
      expect(isCleanBend(result)).toBe(true)
      // Endpoints preserved.
      expect(result[0]).toEqual(targetPath[0])
      expect(result[result.length - 1]).toEqual(
        targetPath[targetPath.length - 1]
      )
      // Anchor-side entry preserved: final segment horizontal into the Left port.
      expect(result[result.length - 2].y).toBe(result[result.length - 1].y)
    })

    it("target terminal (H, Left port) bends cleanly dragging toward the endpoint", () => {
      const result = applyTerminalSegmentBend(
        targetPath,
        targetHandle,
        { x: 0, y: -30 },
        Position.Bottom,
        Position.Left,
        stubLength,
        5
      )

      expect(result).toEqual([
        { x: 440, y: -265 },
        { x: 440, y: -405 },
        { x: 495, y: -405 },
        { x: 495, y: -375 },
        { x: 510, y: -375 },
        { x: 510, y: -345 },
        { x: 525, y: -345 },
      ])
      expect(isCleanBend(result)).toBe(true)
      expect(result[result.length - 2].y).toBe(result[result.length - 1].y)
    })

    // Source mirror: source pinned to a Right port at (0,0); the 30px stub
    // (0,0)->(30,0) is dragged.
    const sourcePath: IPoint[] = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 100 },
    ]
    const sourceHandle = {
      segmentIndex: 0,
      position: { x: 15, y: 0 },
      orientation: "H" as const,
      kind: "source-terminal" as const,
      bendableLength: 30,
    }

    it("source terminal (H, Right port) bends cleanly in both directions", () => {
      const down = applyTerminalSegmentBend(
        sourcePath,
        sourceHandle,
        { x: 0, y: 30 },
        Position.Right,
        Position.Bottom,
        stubLength,
        5
      )
      expect(down).toEqual([
        { x: 0, y: 0 },
        { x: 15, y: 0 },
        { x: 15, y: 30 },
        { x: 30, y: 30 },
        { x: 30, y: 100 },
      ])
      expect(isCleanBend(down)).toBe(true)
      // Anchor-side entry preserved: first segment horizontal out of the Right port.
      expect(down[1].y).toBe(down[0].y)

      const up = applyTerminalSegmentBend(
        sourcePath,
        sourceHandle,
        { x: 0, y: -30 },
        Position.Right,
        Position.Bottom,
        stubLength,
        5
      )
      expect(up).toEqual([
        { x: 0, y: 0 },
        { x: 15, y: 0 },
        { x: 15, y: -30 },
        { x: 30, y: -30 },
        { x: 30, y: 100 },
      ])
      expect(isCleanBend(up)).toBe(true)
    })

    // Vertical orientation: target pinned to a Top port at (100,100); the 30px
    // stub (100,70)->(100,100) is dragged perpendicular (in x).
    const targetVPath: IPoint[] = [
      { x: 0, y: 0 },
      { x: 0, y: 70 },
      { x: 100, y: 70 },
      { x: 100, y: 100 },
    ]
    const targetVHandle = {
      segmentIndex: 2,
      position: { x: 100, y: 85 },
      orientation: "V" as const,
      kind: "target-terminal" as const,
      bendableLength: 30,
    }

    it("target terminal (V, Top port) bends cleanly in both directions", () => {
      const right = applyTerminalSegmentBend(
        targetVPath,
        targetVHandle,
        { x: 30, y: 0 },
        Position.Right,
        Position.Top,
        stubLength,
        5
      )
      expect(right).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 70 },
        { x: 130, y: 70 },
        { x: 130, y: 85 },
        { x: 100, y: 85 },
        { x: 100, y: 100 },
      ])
      expect(isCleanBend(right)).toBe(true)
      // Anchor-side entry preserved: final segment vertical into the Top port.
      expect(right[right.length - 2].x).toBe(right[right.length - 1].x)

      const left = applyTerminalSegmentBend(
        targetVPath,
        targetVHandle,
        { x: -30, y: 0 },
        Position.Right,
        Position.Top,
        stubLength,
        5
      )
      expect(left).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 70 },
        { x: 70, y: 70 },
        { x: 70, y: 85 },
        { x: 100, y: 85 },
        { x: 100, y: 100 },
      ])
      expect(isCleanBend(left)).toBe(true)
    })
  })
})
