import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CANVAS } from "@/constants"

// Capture the gap each <Background> is rendered with, without pulling in the
// real React Flow store/provider.
const gaps: number[] = []
vi.mock("@xyflow/react", () => ({
  BackgroundVariant: { Lines: "lines" },
  Background: ({ gap }: { gap: number }) => {
    gaps.push(gap)
    return null
  },
}))

import { CustomBackground } from "@/components/CustomBackground"

describe("CustomBackground grid spacing", () => {
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
