import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import {
  NodeSubtext,
  countNodeSubtextLines,
  hasNodeSubtext,
} from "@/components/svgs/nodes/NodeSubtext"
import { StereotypeAndName } from "@/components/svgs/nodes/StereotypeAndName"

const renderInSvg = (ui: React.ReactElement) =>
  render(
    <svg width={200} height={140} viewBox="0 0 200 140">
      {ui}
    </svg>
  )

const linesOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("tspan")).map((t) => t.textContent)

describe("NodeSubtext", () => {
  it("renders the technology in brackets and the description below it", () => {
    const { container } = renderInSvg(
      <NodeSubtext
        technology="Kotlin/Ktor"
        description="Accepts orders"
        x={100}
        y={60}
        maxWidth={180}
        maxLines={4}
      />
    )
    const lines = linesOf(container)
    expect(lines).toContain("[Kotlin/Ktor]")
    expect(lines).toContain("Accepts orders")
    // The technology is a marker, not prose — it is set apart in italics.
    const technology = Array.from(container.querySelectorAll("text")).find(
      (t) => t.textContent === "[Kotlin/Ktor]"
    )!
    expect(technology.getAttribute("font-style")).toBe("italic")
  })

  it("renders nothing at all when both halves are absent", () => {
    const { container } = renderInSvg(
      <NodeSubtext x={100} y={60} maxWidth={180} maxLines={4} />
    )
    expect(container.querySelectorAll("tspan")).toHaveLength(0)
    expect(hasNodeSubtext({})).toBe(false)
    expect(hasNodeSubtext({ description: "   " })).toBe(false)
    expect(hasNodeSubtext({ technology: "Kotlin" })).toBe(true)
  })

  it("gives the technology its line before the description gets any", () => {
    // One line of budget between them: the marker wins it, because a
    // half-rendered description says less than a technology does.
    const { container } = renderInSvg(
      <NodeSubtext
        technology="Kotlin"
        description="Accepts orders"
        x={100}
        y={60}
        maxWidth={180}
        maxLines={1}
      />
    )
    expect(linesOf(container)).toEqual(["[Kotlin]"])
    expect(
      countNodeSubtextLines(
        { technology: "Kotlin", description: "Accepts orders" },
        180,
        1
      )
    ).toBe(1)
  })
})

describe("StereotypeAndName with a subtext", () => {
  it("shows the name, the stereotype and both subtext halves together", () => {
    const { container } = renderInSvg(
      <StereotypeAndName
        name="Orders API"
        stereotype="node"
        showStereotype
        width={200}
        height={140}
        technology="Kotlin/Ktor"
        description="Accepts orders"
      />
    )
    // The stereotype is a plain <text>, the rest are wrapped <tspan> lines.
    expect(container.textContent).toContain("«node»")
    const lines = linesOf(container)
    expect(lines).toContain("Orders API")
    expect(lines).toContain("[Kotlin/Ktor]")
    expect(lines).toContain("Accepts orders")
  })

  it("keeps the subtext below the name rather than over it", () => {
    const { container } = renderInSvg(
      <StereotypeAndName
        name="Orders API"
        showStereotype={false}
        width={200}
        height={140}
        description="Accepts orders"
      />
    )
    const yOf = (text: string) =>
      Number(
        Array.from(container.querySelectorAll("tspan"))
          .find((t) => t.textContent === text)!
          .getAttribute("y")
      )
    expect(yOf("Accepts orders")).toBeGreaterThan(yOf("Orders API"))
  })

  it("leaves a node with neither half exactly as it was", () => {
    const withoutSubtext = renderInSvg(
      <StereotypeAndName
        name="Orders API"
        showStereotype={false}
        width={200}
        height={140}
      />
    )
    const withEmptySubtext = renderInSvg(
      <StereotypeAndName
        name="Orders API"
        showStereotype={false}
        width={200}
        height={140}
        technology=""
        description=""
      />
    )
    expect(withEmptySubtext.container.innerHTML).toBe(
      withoutSubtext.container.innerHTML
    )
  })
})
