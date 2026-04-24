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

  it("centers the first line exactly on y when verticalAnchor=top", () => {
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
    // "top" places the first line's visual center exactly at `y` — the
    // intent is a drop-in replacement for dominantBaseline="middle" so
    // single-line nodes keep their pre-change position.
    expect(firstLineY).toBeCloseTo(30, 1)
  })

  it("centers the last line exactly on y when verticalAnchor=bottom", () => {
    const { container } = renderInSvg(
      <MultilineText
        text="one two three"
        x={100}
        y={60}
        maxWidth={40}
        fontSize={16}
        lineHeight={20}
        verticalAnchor="bottom"
      />
    )
    const tspans = Array.from(container.querySelectorAll("tspan"))
    const lastLineY = parseFloat(
      tspans[tspans.length - 1].getAttribute("y") || "0"
    )
    const firstLineY = parseFloat(tspans[0].getAttribute("y") || "0")
    // Bottom-anchored: last line lands on `y`; earlier lines stack above by
    // exactly `lineHeight`. Guards against a block-direction regression that
    // would still land the last line on y while misplacing the first.
    expect(lastLineY).toBeCloseTo(60, 1)
    expect(firstLineY).toBeCloseTo(60 - (tspans.length - 1) * 20, 1)
  })

  it("single-line placement is a drop-in for dominantBaseline=middle", () => {
    // Regression guard: for a short label that fits on one line, the rendered
    // tspan's y must equal the `y` prop exactly, regardless of anchor mode.
    // This is what makes MultilineText safely swappable for <CustomText>
    // wherever the old code used dominantBaseline="middle".
    for (const anchor of ["top", "middle", "bottom"] as const) {
      const { container } = renderInSvg(
        <MultilineText
          text="short"
          x={100}
          y={42}
          maxWidth={500}
          fontSize={16}
          lineHeight={20}
          verticalAnchor={anchor}
        />
      )
      const tspan = container.querySelector("tspan")!
      expect(parseFloat(tspan.getAttribute("y") || "0")).toBeCloseTo(42, 1)
    }
  })

  it("appends an ellipsis when maxLines truncates the content", () => {
    const { container } = renderInSvg(
      <MultilineText
        text="one two three four five six"
        x={100}
        y={50}
        maxWidth={40}
        fontSize={16}
        maxLines={2}
      />
    )
    const tspans = container.querySelectorAll("tspan")
    expect(tspans.length).toBe(2)
    expect(tspans[tspans.length - 1].textContent).toMatch(/…$/)
  })
})
