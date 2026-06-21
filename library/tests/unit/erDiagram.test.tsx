import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// The ER node SVGs only read `assessments` from the diagram store; feed the
// selector an empty state so they render as pure components.
vi.mock("@/store", () => ({
  useDiagramStore: (selector: (state: { assessments: object }) => unknown) =>
    selector({ assessments: {} }),
}))

import { EREntitySVG } from "@/components/svgs/nodes/erDiagram/EREntitySVG"
import { ERRelationshipSVG } from "@/components/svgs/nodes/erDiagram/ERRelationshipSVG"
import { ERAttributeSVG } from "@/components/svgs/nodes/erDiagram/ERAttributeSVG"
import { ErEntityKind, ErRelationshipKind } from "@/types"

const renderSvg = (node: React.ReactNode) => render(<svg>{node}</svg>)

describe("EREntitySVG", () => {
  it("draws a single border for a strong entity", () => {
    const { container } = renderSvg(
      <EREntitySVG
        id="e1"
        width={160}
        height={70}
        data={{ name: "Student", kind: ErEntityKind.Strong }}
      />
    )
    expect(container.querySelectorAll("rect")).toHaveLength(1)
  })

  it("draws a double border for a weak entity", () => {
    const { container } = renderSvg(
      <EREntitySVG
        id="e1"
        width={160}
        height={70}
        data={{ name: "Dependent", kind: ErEntityKind.Weak }}
      />
    )
    expect(container.querySelectorAll("rect")).toHaveLength(2)
  })
})

describe("ERRelationshipSVG", () => {
  it("draws a single diamond for a regular relationship", () => {
    const { container } = renderSvg(
      <ERRelationshipSVG
        id="r1"
        width={140}
        height={80}
        data={{ name: "Enrolls", kind: ErRelationshipKind.Regular }}
      />
    )
    expect(container.querySelectorAll("polygon")).toHaveLength(1)
  })

  it("draws a double diamond for an identifying relationship", () => {
    const { container } = renderSvg(
      <ERRelationshipSVG
        id="r1"
        width={140}
        height={80}
        data={{ name: "Has", kind: ErRelationshipKind.Identifying }}
      />
    )
    expect(container.querySelectorAll("polygon")).toHaveLength(2)
  })
})

describe("ERAttributeSVG", () => {
  // Underlines are drawn as explicit <line>s (not CSS text-decoration) so they
  // survive resvg PNG/PDF export; a dashed CSS underline does not.
  const underline = (container: HTMLElement) => container.querySelector("line")

  it("draws a solid underline for a key attribute", () => {
    const { container } = renderSvg(
      <ERAttributeSVG
        id="a1"
        width={120}
        height={50}
        data={{ name: "id", isKey: true }}
      />
    )
    expect(underline(container)).not.toBeNull()
    expect(underline(container)?.getAttribute("stroke-dasharray")).toBeNull()
  })

  it("draws a dashed underline for a partial key", () => {
    const { container } = renderSvg(
      <ERAttributeSVG
        id="a1"
        width={120}
        height={50}
        data={{ name: "name", isPartialKey: true }}
      />
    )
    expect(underline(container)?.getAttribute("stroke-dasharray")).toBe("3 2")
  })

  it("renders a key as solid even if partial key is also set (key wins)", () => {
    const { container } = renderSvg(
      <ERAttributeSVG
        id="a1"
        width={120}
        height={50}
        data={{ name: "id", isKey: true, isPartialKey: true }}
      />
    )
    expect(underline(container)?.getAttribute("stroke-dasharray")).toBeNull()
  })

  it("draws no underline for a plain attribute", () => {
    const { container } = renderSvg(
      <ERAttributeSVG
        id="a1"
        width={120}
        height={50}
        data={{ name: "grade" }}
      />
    )
    expect(underline(container)).toBeNull()
  })

  it("draws a second ellipse for a multivalued attribute", () => {
    const { container } = renderSvg(
      <ERAttributeSVG
        id="a1"
        width={120}
        height={50}
        data={{ name: "phone", isMultivalued: true }}
      />
    )
    expect(container.querySelectorAll("ellipse")).toHaveLength(2)
  })

  it("dashes the outline of a derived attribute", () => {
    const { container } = renderSvg(
      <ERAttributeSVG
        id="a1"
        width={120}
        height={50}
        data={{ name: "age", isDerived: true }}
      />
    )
    const ellipse = container.querySelector("ellipse")
    expect(ellipse?.getAttribute("stroke-dasharray")).toBe("6 4")
  })
})
