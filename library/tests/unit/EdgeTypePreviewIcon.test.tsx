import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EdgeTypePreviewIcon } from "@/components/popovers/edgePopovers/EdgeTypePreviewIcon"

// The type -> marker/dash mapping is covered by edgeUtils.test.ts. These tests
// cover the rendering layer it adds: dash-attribute translation, marker
// presence, that hollow vs filled markers stay visually distinct, and that the
// oversized interface socket is scaled down to fit.

const renderIcon = (edgeType: string) => {
  const { container } = render(<EdgeTypePreviewIcon edgeType={edgeType} />)
  return container.querySelector("svg") as SVGSVGElement
}

describe("EdgeTypePreviewIcon", () => {
  it("draws a solid line for solid edge types", () => {
    const line = renderIcon("ClassBidirectional").querySelector("line")
    expect(line?.getAttribute("stroke-dasharray")).toBeNull()
  })

  it("draws a dashed line for dashed edge types", () => {
    const line = renderIcon("ClassDependency").querySelector("line")
    expect(line?.getAttribute("stroke-dasharray")).toBe("4 3")
  })

  it("renders an end marker only when the type has one", () => {
    expect(
      renderIcon("ClassBidirectional").querySelectorAll("path")
    ).toHaveLength(0)
    expect(
      renderIcon("ClassInheritance").querySelectorAll("path").length
    ).toBeGreaterThan(0)
  })

  it("renders both start and end markers (BPMN message flow)", () => {
    const svg = renderIcon("BPMNMessageFlow")
    expect(svg.querySelector("circle")).not.toBeNull()
    expect(svg.querySelector("path")).not.toBeNull()
  })

  it("keeps hollow and filled markers distinct (aggregation vs composition)", () => {
    // The hollow/filled diamond is the only thing telling these two apart.
    const hollow = renderIcon("ClassAggregation").querySelector("path")
    const filled = renderIcon("ClassComposition").querySelector("path")
    expect(hollow?.getAttribute("fill")).not.toBe(filled?.getAttribute("fill"))
  })

  it("scales the oversized interface socket down to fit, but not small markers", () => {
    expect(
      renderIcon("ComponentRequiredInterface").querySelector("g[transform]")
    ).not.toBeNull()
    expect(
      renderIcon("ClassUnidirectional").querySelector("g[transform]")
    ).toBeNull()
  })
})
