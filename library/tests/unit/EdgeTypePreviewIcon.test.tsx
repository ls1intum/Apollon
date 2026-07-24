import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EdgeTypePreviewIcon } from "@/components/popovers/edgePopovers/EdgeTypePreviewIcon"
import { MARKER_CONFIGS } from "@/constants"

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

  it("puts dependency and required markers on the same edge-tip contract", () => {
    const dependency = renderIcon("ComponentDependency")
    const dependencyLineEnd = Number(
      dependency.querySelector("line")?.getAttribute("x2")
    )
    expect(dependency.querySelector("path")?.getAttribute("d")).toContain(
      `L${dependencyLineEnd},14`
    )

    const svg = renderIcon("ComponentRequiredInterface")
    const lineEnd = Number(svg.querySelector("line")?.getAttribute("x2"))
    const markerPath = svg.querySelector("path")?.getAttribute("d")
    const match = markerPath?.match(/^M([^,]+),[^ ]+ A([^,]+),[^ ]+ 0 [01],0 /)
    expect(match).not.toBeNull()

    const arcEndpointX = Number(match?.[1])
    const radius = Number(match?.[2])
    const span = MARKER_CONFIGS["required-interface"].arcSpanDegrees ?? 180
    const halfAngle = ((span / 2) * Math.PI) / 180
    const inferredCenterX = arcEndpointX + radius * Math.cos(halfAngle)

    // The unscaled line endpoint is the socket's leftmost contact. FittedMarker
    // scales around this same anchor, so the rendered preview keeps the join.
    expect(inferredCenterX - radius).toBeCloseTo(lineEnd, 10)
  })
})
