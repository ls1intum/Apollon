import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { HeaderSection } from "@/components/svgs/nodes/HeaderSection"
import { ClassStereotype } from "@/types/nodes/enums"

const renderInSvg = (ui: React.ReactElement) =>
  render(
    <svg width={200} height={100} viewBox="0 0 200 100">
      {ui}
    </svg>
  )

describe("HeaderSection (class header)", () => {
  it("renders an abstract class as an italic name + {abstract}, with no keyword line", () => {
    const { container } = renderInSvg(
      <HeaderSection
        showStereotype={false}
        name="Shape"
        width={200}
        headerHeight={40}
        isAbstract
      />
    )
    const tspans = Array.from(container.querySelectorAll("tspan"))
    // Abstract is a modifier, not a keyword — no «…» line.
    expect(tspans.some((t) => t.textContent?.includes("«"))).toBe(false)
    const nameTspan = tspans.find((t) => t.textContent?.includes("Shape"))!
    // Italic for the editor, {abstract} for the export/screen-reader cue.
    expect(nameTspan.getAttribute("font-style")).toBe("italic")
    expect(nameTspan.textContent).toBe("Shape {abstract}")
  })

  it("renders an interface with a lowercase «interface» keyword and an upright name", () => {
    const { container } = renderInSvg(
      <HeaderSection
        showStereotype
        stereotype={ClassStereotype.Interface}
        name="Drawable"
        width={200}
        headerHeight={50}
      />
    )
    const tspans = Array.from(container.querySelectorAll("tspan"))
    expect(tspans.some((t) => t.textContent === "«interface»")).toBe(true)
    const nameTspan = tspans.find((t) => t.textContent === "Drawable")!
    expect(nameTspan.getAttribute("font-style")).toBe("normal")
  })

  it("renders a plain class name with neither keyword nor italics", () => {
    const { container } = renderInSvg(
      <HeaderSection
        showStereotype={false}
        name="Truck"
        width={200}
        headerHeight={40}
      />
    )
    const tspans = Array.from(container.querySelectorAll("tspan"))
    expect(tspans).toHaveLength(1)
    expect(tspans[0].textContent).toBe("Truck")
    expect(tspans[0].getAttribute("font-style")).toBe("normal")
  })
})
