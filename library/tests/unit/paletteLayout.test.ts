import { describe, it, expect } from "vitest"
import {
  COMPACT_PALETTE,
  PALETTE,
  computePaletteLayout,
  previewScaleForCell,
} from "@/utils/paletteLayout"

// `availH` (3rd arg) is the palette's REAL available band (the space between the
// palette top and the bottom controls), not the full viewport height; the
// algorithm fills the band it is given without re-subtracting any reserve.
//
// Helper: the rendered block size for a layout, mirroring the algorithm.
function block(cols: number, rows: number, cellW: number, cellH: number) {
  return {
    w: cols * cellW + (cols - 1) * PALETTE.GAP + 2 * PALETTE.PAD,
    h: rows * cellH + (rows - 1) * PALETTE.GAP + 2 * PALETTE.PAD,
  }
}

describe("computePaletteLayout", () => {
  it("fits all items without scrolling within the canvas budget", () => {
    // [availW, availBandH] across representative bands (viewport minus chrome).
    const bands = [
      [375, 540], // iPhone portrait
      [844, 250], // iPhone landscape
      [768, 880], // iPad portrait
      [1280, 680], // laptop
      [1920, 960], // desktop
    ]
    for (const n of [1, 4, 6, 9, 14]) {
      for (const [w, h] of bands) {
        const l = computePaletteLayout(n, w, h, 0)
        const rows = Math.ceil(n / l.cols)
        const b = block(l.cols, rows, l.cellW, l.cellH)
        if (!l.scroll) {
          // Narrow horizontally (≤ half the canvas) and within the band.
          expect(b.w).toBeLessThanOrEqual(w * PALETTE.MAX_FRAC_W + l.cols)
          expect(b.h).toBeLessThanOrEqual(h + 0.5)
        }
        expect(l.cellH).toBeGreaterThanOrEqual(PALETTE.CELL_MIN_H)
        expect(l.cellH).toBeLessThanOrEqual(PALETTE.CELL_MAX_H)
        expect(l.cols).toBeGreaterThanOrEqual(1)
        expect(l.cols).toBeLessThanOrEqual(n)
      }
    }
  })

  it("never shrinks a cell below the touch floor", () => {
    // Absurdly small band → falls back to floor + scroll, not sub-44 cells.
    const l = computePaletteLayout(14, 200, 160, 0)
    expect(l.cellH).toBe(PALETTE.CELL_MIN_H)
  })

  it("uses the largest cell when there is plenty of room", () => {
    const l = computePaletteLayout(6, 1920, 960, 0)
    expect(l.cellH).toBe(PALETTE.CELL_MAX_H)
    expect(l.scroll).toBe(false)
  })

  it("prefers a single column filling the height on a tall band", () => {
    // A modest count on a tall band → one narrow column down the side, not a
    // grid, with legible (≥ threshold) cells.
    const l = computePaletteLayout(8, 1920, 960, 0)
    expect(l.cols).toBe(1)
    expect(l.scroll).toBe(false)
    expect(l.cellH).toBeGreaterThanOrEqual(PALETTE.COMFORT_MIN_H)
  })

  it("spills to another column to keep cells legible, not shrink them small", () => {
    // 14 items wouldn't stay legible in one column even on a tall band, so it
    // spills — and the resulting cells are still ≥ the legibility threshold.
    const l = computePaletteLayout(14, 1920, 960, 0)
    expect(l.cols).toBeGreaterThanOrEqual(2)
    expect(l.scroll).toBe(false)
    expect(l.cellH).toBeGreaterThanOrEqual(PALETTE.COMFORT_MIN_H)
    // Only a genuinely tiny band drops below the legibility threshold (fallback),
    // and even then it stays at or above the touch floor without scrolling.
    const land = computePaletteLayout(14, 844, 250, 0)
    expect(land.cols).toBeGreaterThanOrEqual(3)
    expect(land.cellH).toBeGreaterThanOrEqual(PALETTE.CELL_MIN_H)
    expect(land.scroll).toBe(false)
  })

  it("keeps a single column for a sparse diagram even when tall", () => {
    // 6 items never need a second column at any normal size.
    for (const [w, h] of [
      [1920, 960],
      [1280, 680],
      [768, 880],
    ] as const) {
      expect(computePaletteLayout(6, w, h, 0).cols).toBe(1)
    }
  })

  it("keeps sparse mobile palettes compact in portrait and landscape", () => {
    const portrait = computePaletteLayout(4, 375, 540, 0, true)
    expect(portrait.cols).toBe(1)
    expect(portrait.cellH).toBe(COMPACT_PALETTE.CELL_MAX_H)

    const portraitRows = Math.ceil(4 / portrait.cols)
    const portraitHeight =
      portraitRows * portrait.cellH +
      (portraitRows - 1) * COMPACT_PALETTE.GAP +
      2 * COMPACT_PALETTE.PAD
    expect(portraitHeight).toBeLessThanOrEqual(268)

    const landscape = computePaletteLayout(6, 844, 250, 0, true)
    expect(landscape.cols).toBe(2)
    expect(landscape.cellH).toBe(COMPACT_PALETTE.CELL_MAX_H)
    expect(landscape.scroll).toBe(false)
  })

  it("still fits a dense mobile palette without scrolling", () => {
    for (const [w, h] of [
      [375, 540],
      [844, 250],
    ] as const) {
      const layout = computePaletteLayout(14, w, h, 0, true)
      const rows = Math.ceil(14 / layout.cols)
      const height =
        rows * layout.cellH +
        (rows - 1) * COMPACT_PALETTE.GAP +
        2 * COMPACT_PALETTE.PAD

      expect(layout.scroll).toBe(false)
      expect(height).toBeLessThanOrEqual(h)
    }
  })

  it("handles empty / degenerate input safely", () => {
    expect(computePaletteLayout(0, 800, 600, 0).cols).toBe(1)
    expect(computePaletteLayout(5, 0, 0, 0).cols).toBe(1)
  })
})

describe("previewScaleForCell", () => {
  const inset = 2 * PALETTE.CONTENT_INSET // padding subtracted on both axes

  it("fits a wide element to the cell width", () => {
    // 160×60 task in a 90×56 cell → width-bound.
    const s = previewScaleForCell(160, 60, 90, 56)
    expect(s).toBeCloseTo((90 - inset) / 160, 5)
  })

  it("fits a tall/square element to the cell height", () => {
    const s = previewScaleForCell(40, 40, 90, 56)
    expect(s).toBeCloseTo((56 - inset) / 40, 5)
  })

  it("uses the tighter content inset for compact cells", () => {
    const compactInset = 2 * COMPACT_PALETTE.CONTENT_INSET
    const scale = previewScaleForCell(160, 60, 100, 60, true)
    expect(scale).toBeCloseTo((100 - compactInset) / 160, 5)
  })
})
