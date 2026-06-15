import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { EdgeStyleEditor } from "@/components/ui/StyleEditor/EdgeStyleEditor"
import { NodeStyleEditor } from "@/components/ui/StyleEditor/NodeStyleEditor"

describe("Style editor color panels", () => {
  it("uses tight separators inside the node color editor and leaves space below reset", () => {
    render(
      <NodeStyleEditor
        nodeData={{
          name: "Class",
          fillColor: "#ffffff",
          strokeColor: "#000000",
          textColor: "#111111",
        }}
        handleDataFieldUpdate={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /edit colors/i }))

    const dividers = [...document.querySelectorAll("div")].filter(
      (element) => element.style.height === "1px"
    )
    expect(dividers).toHaveLength(2)
    dividers.forEach((divider) =>
      expect(divider).toHaveStyle({ margin: "0px" })
    )

    expect(
      screen.getByRole("button", { name: /reset/i }).parentElement
    ).toHaveStyle({ paddingBottom: "12px" })
  })

  it("uses tight separators inside the edge color editor and leaves space below reset", () => {
    render(
      <EdgeStyleEditor
        edgeData={{
          strokeColor: "#000000",
          textColor: "#111111",
        }}
        handleDataFieldUpdate={vi.fn()}
        label="Edge"
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /edit colors/i }))

    const dividers = [...document.querySelectorAll("div")].filter(
      (element) => element.style.height === "1px"
    )
    expect(dividers).toHaveLength(1)
    expect(dividers[0]).toHaveStyle({ margin: "0px" })

    expect(
      screen.getByRole("button", { name: /reset/i }).parentElement
    ).toHaveStyle({ paddingBottom: "12px" })
  })
})
