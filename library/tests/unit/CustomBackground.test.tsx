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
  it("passes half the gap as offset so the grid is not displaced by React Flow's precedence bug", () => {
    gaps.length = 0
    rendered.length = 0
    render(<CustomBackground />)

    // React Flow computes `offsetXY[0] * zoom || 1 + patternDimensions[0] / 2`, which with the
    // default `offset={0}` takes the falsy branch and shifts the grid a pixel off the snap step.
    // Half the gap keeps the left branch truthy and equals the intended `patternDimensions / 2`.
    expect(rendered).not.toHaveLength(0)
    for (const { gap, offset } of rendered) {
      expect(offset).toBe(gap / 2)
    }
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
