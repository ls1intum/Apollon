import { describe, it, expect } from "vitest"
import {
  anchorPoint,
  effectiveStepPx,
  formatAnchor,
  formatRatio,
  GRID_STEP_PX,
  keyHandlesForSide,
  keyRatiosForSide,
  parseAnchor,
  quantizeRatio,
  QUARTER_THRESHOLD_PX,
  snapRadiusScreenPx,
  snapToAnchor,
  visibleKeyRatios,
  type Rect,
} from "@/nodes/handles/anchorModel"

const RECT: Rect = { x: 0, y: 0, width: 200, height: 100 }

describe("anchorModel: encoding", () => {
  it("formats ratios to 3 decimals", () => {
    expect(formatRatio(0)).toBe("0.000")
    expect(formatRatio(0.5)).toBe("0.500")
    expect(formatRatio(1)).toBe("1.000")
    expect(formatRatio(0.333)).toBe("0.333")
  })

  it("round-trips canonical anchor ids", () => {
    for (const id of ["t:0.000", "r:0.500", "b:1.000", "l:0.250"]) {
      const a = parseAnchor(id)!
      expect(a).not.toBeNull()
      expect(formatAnchor(a.side, a.ratio)).toBe(id)
    }
  })

  it("rejects non-anchor strings", () => {
    for (const id of [
      "top",
      "top-left",
      "right-mid-bottom",
      "",
      "x:0.5",
      "t:abc",
      null,
      undefined,
    ]) {
      expect(parseAnchor(id as string)).toBeNull()
    }
  })
})

describe("anchorModel: key handles", () => {
  it("returns 3 key ratios below the quarter threshold", () => {
    expect(keyRatiosForSide(QUARTER_THRESHOLD_PX - 5)).toEqual([0, 0.5, 1])
  })

  it("returns 5 key ratios at/above the quarter threshold", () => {
    expect(keyRatiosForSide(QUARTER_THRESHOLD_PX)).toEqual([
      0, 0.25, 0.5, 0.75, 1,
    ])
  })

  it("labels semantic kinds", () => {
    const kinds = keyHandlesForSide(QUARTER_THRESHOLD_PX).map((h) => h.kind)
    expect(kinds).toEqual(["corner", "quarter", "center", "quarter", "corner"])
  })
})

describe("anchorModel: grid quantization", () => {
  it("snaps a ratio to the 5px world grid with no drift", () => {
    // axis multiples of 5 → quantized ratio * axis is an integer px on grid.
    for (const axis of [20, 35, 100, 205, 400]) {
      for (const raw of [0.07, 0.13, 0.49, 0.83, 0.97]) {
        const r = quantizeRatio(raw, axis)
        const px = r * axis
        expect(
          Math.abs(px - Math.round(px / GRID_STEP_PX) * GRID_STEP_PX)
        ).toBeLessThan(1e-9)
      }
    }
  })

  it("keeps key ratios on grid for grid-multiple axes", () => {
    expect(quantizeRatio(0.5, 200)).toBe(0.5)
    expect(quantizeRatio(0.25, 200)).toBe(0.25)
    expect(quantizeRatio(0, 200)).toBe(0)
    expect(quantizeRatio(1, 200)).toBe(1)
  })

  it("round-trips a grid drop through format→parse→quantize on large nodes", () => {
    // The 3-decimal id must recover the exact grid cell even on wide nodes
    // (2-decimal drifts up to a full 5px cell above ~200px). Idempotent re-save.
    for (const axis of [205, 300, 530, 1000, 4995]) {
      for (let px = 0; px <= axis; px += GRID_STEP_PX) {
        const id = formatAnchor("t", px / axis)
        const parsed = parseAnchor(id)!
        const recovered = quantizeRatio(parsed.ratio, axis) * axis
        expect(Math.abs(recovered - px)).toBeLessThan(1e-6)
      }
    }
  })
})

describe("anchorModel: zoom LOD ladder (pinned against 0.4–2.5 range)", () => {
  it("matches the derived effective grid step", () => {
    expect(effectiveStepPx(2.5)).toBe(5)
    expect(effectiveStepPx(2.0)).toBe(10)
    expect(effectiveStepPx(1.0)).toBe(15)
    expect(effectiveStepPx(0.5)).toBe(25)
    expect(effectiveStepPx(0.4)).toBe(30)
  })

  it("never lets on-screen spacing fall below the budget", () => {
    for (const z of [0.4, 0.5, 0.75, 1, 1.5, 2, 2.5]) {
      expect(effectiveStepPx(z) * z).toBeGreaterThanOrEqual(12)
    }
  })

  it("the finest 5px grid is reachable within max zoom", () => {
    expect(effectiveStepPx(2.4)).toBe(5)
  })

  it("clamps the snap radius", () => {
    expect(snapRadiusScreenPx(2.5)).toBe(14)
    expect(snapRadiusScreenPx(1)).toBe(14)
    expect(snapRadiusScreenPx(0.5)).toBe(28)
    expect(snapRadiusScreenPx(0.4)).toBe(30)
  })
})

describe("anchorModel: visible arc LOD", () => {
  it("shows all five key arcs on a long side at default zoom", () => {
    expect(visibleKeyRatios(200, 1)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })

  it("drops quarters first, then corners, as zoom decreases", () => {
    // 160px side: 5 arcs need (160/4)*z >= 28 → z >= 0.7; 3 arcs need
    // (160/2)*z >= 28 → z >= 0.35.
    expect(visibleKeyRatios(160, 1)).toEqual([0, 0.25, 0.5, 0.75, 1])
    expect(visibleKeyRatios(160, 0.45)).toEqual([0, 0.5, 1])
    expect(visibleKeyRatios(160, 0.3)).toEqual([0.5])
  })

  it("always keeps the centre arc", () => {
    for (const z of [0.4, 0.5, 1, 2.5]) {
      for (const axis of [20, 60, 120, 300]) {
        expect(visibleKeyRatios(axis, z)).toContain(0.5)
      }
    }
  })

  it("never shows quarters on a short (3-key) side", () => {
    expect(visibleKeyRatios(80, 2.5)).not.toContain(0.25)
  })
})

describe("anchorModel: geometry", () => {
  it("places anchors on the correct border point", () => {
    expect(anchorPoint(RECT, "t", 0.5)).toEqual({ x: 100, y: 0 })
    expect(anchorPoint(RECT, "b", 0)).toEqual({ x: 0, y: 100 })
    expect(anchorPoint(RECT, "l", 1)).toEqual({ x: 0, y: 100 })
    expect(anchorPoint(RECT, "r", 0.5)).toEqual({ x: 200, y: 50 })
  })
})

describe("anchorModel: snapToAnchor", () => {
  it("snaps to the side center as the easiest target", () => {
    const r = snapToAnchor(RECT, { x: 104, y: -3 }, 1)
    expect(r.side).toBe("t")
    expect(r.ratio).toBe(0.5)
    expect(r.kind).toBe("center")
    expect(r.id).toBe("t:0.500")
  })

  it("prefers a corner over a nearby grid point", () => {
    const r = snapToAnchor(RECT, { x: 2, y: -2 }, 1)
    expect(r.side).toBe("t")
    expect(r.ratio).toBe(0)
    expect(r.kind).toBe("corner")
  })

  it("a key handle wins over a closer grid tick within radius (priority)", () => {
    // Cursor at x=103 on the 200px top side: centre is at x=100 (dist 3) and a
    // grid tick sits at x=105 (dist 2) — both inside the snap radius. Priority
    // (center > grid) must pick the centre even though the grid tick is closer.
    const r = snapToAnchor(RECT, { x: 103, y: -1 }, 1)
    expect(r.side).toBe("t")
    expect(r.ratio).toBe(0.5)
    expect(r.kind).toBe("center")
  })

  it("snaps to a fine grid tick when no key handle is in range", () => {
    // Cursor at x=15 (a grid tick at zoom 1, step 15px). Nearest key handles
    // are corner(0, dist 15 — just outside the 14px radius) and quarter(50,
    // far), so only the grid tick at x=15 (dist 0) is in range → grid wins.
    const r = snapToAnchor(RECT, { x: 15, y: -1 }, 1)
    expect(r.kind).toBe("grid")
    expect(r.point.x).toBe(15)
  })

  it("a bottom-center cursor never grabs a side (no cross-side bleed)", () => {
    const r = snapToAnchor(RECT, { x: 100, y: 98 }, 1)
    expect(r.side).toBe("b")
    expect(r.ratio).toBe(0.5)
  })

  it("falls back to closest point on side when nothing is within radius", () => {
    const r = snapToAnchor(RECT, { x: 37, y: -200 }, 1)
    expect(r.side).toBe("t")
    expect(r.point.y).toBe(0)
    expect(parseAnchor(r.id)).not.toBeNull()
  })

  it("center variant only ever yields the side centre", () => {
    const r = snapToAnchor(RECT, { x: 5, y: -2 }, 1, { variant: "center" })
    expect(r.ratio).toBe(0.5)
    expect(r.kind).toBe("center")
  })

  it("resolves a corner drop to the horizontal side, not l/r", () => {
    // Top-left corner: top and left are equidistant; corners are owned by the
    // horizontal side, so the result is t:0.000 (one handle per corner).
    const r = snapToAnchor(RECT, { x: -2, y: -2 }, 1)
    expect(r.side).toBe("t")
    expect(r.ratio).toBe(0)
  })

  it("a left-side drop never yields a corner", () => {
    const r = snapToAnchor(RECT, { x: -3, y: 1 }, 1)
    expect(r.side).toBe("l")
    expect(r.ratio).not.toBe(0)
    expect(r.ratio).not.toBe(1)
  })

  it("excludeCorners never snaps to ratio 0 or 1", () => {
    const r = snapToAnchor(RECT, { x: 1, y: -1 }, 1, { excludeCorners: true })
    expect(r.ratio).not.toBe(0)
    expect(r.ratio).not.toBe(1)
  })

  it("restricts to the allowed sides", () => {
    const r = snapToAnchor(RECT, { x: 100, y: 110 }, 1, { sides: ["t"] })
    expect(r.side).toBe("t")
  })

  it("always returns a parseable, grid-quantized id", () => {
    for (const z of [0.4, 1, 2.5]) {
      for (const p of [
        { x: 33, y: -1 },
        { x: 201, y: 71 },
        { x: 88, y: 101 },
        { x: -1, y: 42 },
      ]) {
        const r = snapToAnchor(RECT, p, z)
        const parsed = parseAnchor(r.id)
        expect(parsed).not.toBeNull()
        const axis = r.side === "t" || r.side === "b" ? RECT.width : RECT.height
        const px = r.ratio * axis
        expect(
          Math.abs(px - Math.round(px / GRID_STEP_PX) * GRID_STEP_PX)
        ).toBeLessThan(1e-9)
      }
    }
  })
})
