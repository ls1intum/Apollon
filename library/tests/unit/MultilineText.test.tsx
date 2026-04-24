import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { MultilineText } from "@/components/svgs/nodes/MultilineText"

const renderInSvg = (ui: React.ReactElement) =>
  render(
    <svg width={200} height={100} viewBox="0 0 200 100">
      {ui}
    </svg>
  )

describe("MultilineText", () => {
  it("renders nothing when text is empty", () => {
    const { container } = renderInSvg(
      <MultilineText text="" x={100} y={50} maxWidth={180} fontSize={16} />
    )
    expect(container.querySelector("text")).toBeNull()
  })

  it("wraps long text into multiple tspan lines", () => {
    // jsdom canvas mock: 8 px/char. Width 40 forces one word per line.
    const { container } = renderInSvg(
      <MultilineText
        text="one two three"
        x={100}
        y={50}
        maxWidth={40}
        fontSize={16}
      />
    )
    const tspans = container.querySelectorAll("tspan")
    expect(tspans.length).toBe(3)
  })

  it("centers the block around y when verticalAnchor=middle", () => {
    const { container } = renderInSvg(
      <MultilineText
        text="one two three"
        x={100}
        y={50}
        maxWidth={40}
        fontSize={16}
        verticalAnchor="middle"
      />
    )
    const ys = Array.from(container.querySelectorAll("tspan")).map((t) =>
      parseFloat(t.getAttribute("y") || "0")
    )
    // Offsets from y=50 should be symmetric around zero.
    const deltas = ys.map((v) => v - 50)
    const sum = deltas.reduce((a, b) => a + b, 0)
    expect(Math.abs(sum)).toBeLessThan(0.5)
  })

  it("places the first line at y when verticalAnchor=top", () => {
    const { container } = renderInSvg(
      <MultilineText
        text="one two three"
        x={100}
        y={30}
        maxWidth={40}
        fontSize={16}
        lineHeight={20}
        verticalAnchor="top"
      />
    )
    const firstLineY = parseFloat(
      container.querySelector("tspan")!.getAttribute("y") || "0"
    )
    // With verticalAnchor=top, the first line's center y is y + lineHeight/2.
    expect(firstLineY).toBeCloseTo(40, 1)
  })
})
