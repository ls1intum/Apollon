import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EdgeMiddleLabels } from "@/edges/labelTypes/EdgeMiddleLabels"
import { EDGES } from "@/constants"

const renderLabels = (
  props: Partial<Parameters<typeof EdgeMiddleLabels>[0]> = {}
) =>
  render(
    <svg>
      <EdgeMiddleLabels
        activePoints={[
          { x: 0, y: 100 },
          { x: 200, y: 100 },
        ]}
        showRelationshipLabels
        textColor="#000"
        {...props}
      />
    </svg>
  )

const tspans = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("tspan"))

describe("EdgeMiddleLabels", () => {
  it("renders nothing when the edge has no text at all", () => {
    const { container } = renderLabels()
    expect(container.querySelector("text")).toBeNull()
  })

  it("stacks the label, the bracketed technology and the description", () => {
    const { container } = renderLabels({
      label: "makes API calls to",
      technology: "JSON/HTTPS",
      description: "Reads account balances",
    })
    expect(tspans(container).map((t) => t.textContent)).toEqual([
      "makes API calls to",
      "[JSON/HTTPS]",
      "Reads account balances",
    ])
  })

  it("keeps the name larger and bolder than its two detail lines", () => {
    const { container } = renderLabels({
      label: "uses",
      technology: "gRPC",
      description: "Streams events",
    })
    const [name, technology, description] = tspans(container)
    expect(Number(name.getAttribute("font-size"))).toBeGreaterThan(
      Number(technology.getAttribute("font-size"))
    )
    expect(name.getAttribute("font-weight")).toBe("700")
    expect(technology.getAttribute("font-style")).toBe("italic")
    expect(description.getAttribute("font-style")).toBe("normal")
  })

  it("draws a detail line even when the relation has no label", () => {
    // A C4 `Rel(a, b, "", "HTTPS")` is unusual but legal, and the old renderer
    // bailed on the empty label and dropped the technology with it.
    const { container } = renderLabels({ technology: "HTTPS" })
    expect(tspans(container).map((t) => t.textContent)).toEqual(["[HTTPS]"])
  })

  it("grows upwards from an above-the-line anchor so no line lands on the arm", () => {
    const { container } = renderLabels({
      label: "uses",
      technology: "gRPC",
      description: "Streams events",
    })
    const ys = tspans(container).map((t) => Number(t.getAttribute("y")))
    // Evenly spaced, in reading order...
    expect(ys[1] - ys[0]).toBe(EDGES.LABEL_LINE_HEIGHT)
    expect(ys[2] - ys[1]).toBe(EDGES.LABEL_LINE_HEIGHT)
    // ...and the *last* line — not the first — keeps the gap off the arm.
    expect(ys[2]).toBe(100 - EDGES.LABEL_GAP)
  })

  it("grows downwards when the block is pushed below the line", () => {
    const { container } = renderLabels({
      label: "uses",
      technology: "gRPC",
      // A node covering everything above the arm leaves only the below side.
      nodeRects: [{ x: -50, y: 0, width: 300, height: 100 }],
    })
    const ys = tspans(container).map((t) => Number(t.getAttribute("y")))
    expect(ys[0]).toBe(100 + EDGES.LABEL_GAP)
    expect(ys[1]).toBe(100 + EDGES.LABEL_GAP + EDGES.LABEL_LINE_HEIGHT)
  })

  it("repeats x and the baseline on every line, as CustomText does", () => {
    const { container } = renderLabels({ label: "uses", technology: "gRPC" })
    const text = container.querySelector("text")!
    for (const tspan of tspans(container)) {
      expect(tspan.getAttribute("x")).toBe(text.getAttribute("x"))
      expect(tspan.getAttribute("dominant-baseline")).toBe(
        text.getAttribute("dominant-baseline")
      )
    }
  })
})
