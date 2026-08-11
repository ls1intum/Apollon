import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CANVAS } from "@/constants"

// Capture the gap and offset each <Background> is rendered with, without
// pulling in the real React Flow store/provider.
const gaps: number[] = []
const rendered: { gap: number; offset?: number }[] = []
vi.mock("@xyflow/react", () => ({
  BackgroundVariant: { Lines: "lines" },
  Background: ({ gap, offset }: { gap: number; offset?: number }) => {
    gaps.push(gap)
    rendered.push({ gap, offset })
    return null
  },
}))

import { CustomBackground } from "@/components/CustomBackground"

describe("CustomBackground grid spacing", () => {
  it("passes a non-zero offset so the grid is not displaced by React Flow's precedence bug", () => {
    gaps.length = 0
    rendered.length = 0
    render(<CustomBackground />)

    // React Flow computes `offsetXY[0] * zoom || 1 + patternDimensions[0] / 2`, which with the
    // default `offset={0}` takes the falsy branch and shifts the grid a pixel off the snap step.
    // Any non-zero offset keeps the left branch truthy.
    expect(rendered).not.toHaveLength(0)
    for (const { offset } of rendered) {
      expect(offset).toBeGreaterThan(0)
    }
  })

  it("keeps every grid line on a whole device pixel", () => {
    gaps.length = 0
    rendered.length = 0
    render(<CustomBackground />)

    // React Flow strokes each line down the middle of the tile, so a line lands at `gap / 2 - offset`
    // and a half-integer there splits a 1px line across two device pixels. At 1x - any non-Retina
    // monitor - the fine tile is only five device pixels wide and WebKit rasterises it once before
    // repeating it, so a half-intensity line vanishes from that bitmap and takes whole grid lines
    // with it until a zoom rebuilds it.
    for (const { gap, offset } of rendered) {
      const linePosition = gap / 2 - offset!
      expect(Number.isInteger(linePosition * 2)).toBe(true)
      expect(Number.isInteger(linePosition)).toBe(false)
    }
    // Still within a pixel of the tile centre, so the grid stays visually on the snap step.
    for (const { gap, offset } of rendered) {
      expect(Math.abs(offset! - gap / 2)).toBeLessThanOrEqual(1)
    }
  })

  it("shifts both layers identically so the grids never split into double lines when zoomed", () => {
    gaps.length = 0
    rendered.length = 0
    render(<CustomBackground />)

    // The offset is scaled by the zoom, so any difference in the per-layer shift grows with it: a
    // major grid nudged differently from the fine grid sits `delta * zoom` away from it, which is
    // invisible at 100% and a clearly doubled line once zoomed in.
    const shifts = rendered.map(({ gap, offset }) => offset! - gap / 2)
    expect(new Set(shifts).size).toBe(1)
  })

  it("draws the fine grid at exactly the snap step so connectors sit on visible lines", () => {
    gaps.length = 0
    render(<CustomBackground />)

    // The finest visible grid line must coincide with the snap step: a
    // grid-snapped node position or connection point always lands on a line.
    expect(Math.min(...gaps)).toBe(CANVAS.SNAP_TO_GRID_PX)
    // A coarser major grid (10x) stays for readability.
    expect(gaps).toContain(CANVAS.SNAP_TO_GRID_PX * 10)
  })
})
