import { describe, it, expect } from "vitest"
import {
  PALETTE,
  computePaletteLayout,
  previewScaleForCell,
} from "@/utils/paletteLayout"

// Helper: the rendered block size for a layout, mirroring the algorithm.
function block(cols: number, rows: number, cellW: number, cellH: number) {
  return {
    w: cols * cellW + (cols - 1) * PALETTE.GAP + 2 * PALETTE.PAD,
    h: rows * cellH + (rows - 1) * PALETTE.GAP + 2 * PALETTE.PAD,
  }
}

describe("computePaletteLayout", () => {
  it("fits all items without scrolling within the canvas fraction", () => {
    // Sweep representative item counts and viewports; every result must fit.
    const viewports = [
      [375, 667], // iPhone portrait
      [844, 390], // iPhone landscape
      [768, 1024], // iPad portrait
      [1280, 800], // laptop
      [1920, 1080], // desktop
    ]
    for (const n of [1, 4, 6, 9, 14]) {
      for (const [w, h] of viewports) {
        const l = computePaletteLayout(n, w, h, 0)
        const rows = Math.ceil(n / l.cols)
        const b = block(l.cols, rows, l.cellW, l.cellH)
        if (!l.scroll) {
          expect(b.w).toBeLessThanOrEqual(w * PALETTE.MAX_FRAC_W + 0.5)
          expect(b.h).toBeLessThanOrEqual(h * PALETTE.MAX_FRAC_H + 0.5)
        }
        expect(l.cellH).toBeGreaterThanOrEqual(PALETTE.CELL_MIN_H)
        expect(l.cellH).toBeLessThanOrEqual(PALETTE.CELL_MAX_H)
        expect(l.cols).toBeGreaterThanOrEqual(1)
        expect(l.cols).toBeLessThanOrEqual(n)
      }
    }
  })

  it("never shrinks a cell below the touch floor", () => {
    // Absurdly small canvas → falls back to floor + scroll, not sub-44 cells.
    const l = computePaletteLayout(14, 200, 160, 0)
    expect(l.cellH).toBe(PALETTE.CELL_MIN_H)
  })

  it("uses the largest cell when there is plenty of room", () => {
    const l = computePaletteLayout(6, 1920, 1080, 0)
    expect(l.cellH).toBe(PALETTE.CELL_MAX_H)
    expect(l.scroll).toBe(false)
  })

  it("prefers fewer columns (a tall card) over a wide bar when height allows", () => {
    // Tall desktop, 14 items → should stay around 2 columns, not spread wide.
    const l = computePaletteLayout(14, 1280, 800, 0)
    expect(l.cols).toBeLessThanOrEqual(2)
    expect(l.scroll).toBe(false)
  })

  it("adds columns when the viewport is short (landscape phone)", () => {
    const l = computePaletteLayout(14, 844, 390, 0)
    expect(l.cols).toBeGreaterThanOrEqual(3)
    expect(l.scroll).toBe(false)
  })

  it("handles empty / degenerate input safely", () => {
    expect(computePaletteLayout(0, 800, 600, 0).cols).toBe(1)
    expect(computePaletteLayout(5, 0, 0, 0).cols).toBe(1)
  })
})

describe("previewScaleForCell", () => {
  it("fits a wide element to the cell width", () => {
    // 160×60 task in a 90×56 cell → width-bound.
    const s = previewScaleForCell(160, 60, 90, 56)
    expect(s).toBeCloseTo((90 - 12) / 160, 5)
  })

  it("fits a tall/square element to the cell height", () => {
    const s = previewScaleForCell(40, 40, 90, 56)
    expect(s).toBeCloseTo((56 - 12) / 40, 5)
  })
})
