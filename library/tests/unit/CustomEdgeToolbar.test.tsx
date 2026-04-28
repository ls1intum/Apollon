import { render } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { CustomEdgeToolbar } from "@/components/toolbars/edgeToolBar/CustomEdgeToolBar"

vi.mock("@/hooks/useDiagramModifiable", () => ({
  useDiagramModifiable: () => true,
}))

vi.mock("@/hooks/useIsOnlyThisElementSelected", () => ({
  useIsOnlyThisElementSelected: () => true,
}))

const renderToolbar = (draggers: { x: number; y: number }[] = []) => {
  const anchorRef = createRef<SVGForeignObjectElement>()
  const result = render(
    <svg>
      <g>
        <g className="edge-container">
          {draggers.map((dragger, index) => (
            <circle
              className="edge-circle"
              key={index}
              cx={dragger.x}
              cy={dragger.y}
              r={10}
            />
          ))}
        </g>
        <CustomEdgeToolbar
          edgeId="edge-1"
          position={{ x: 100, y: 100 }}
          anchorRef={anchorRef}
          onDeleteClick={vi.fn()}
          onEditClick={vi.fn()}
        />
      </g>
    </svg>
  )

  const toolbar = result.container.querySelector("foreignObject")
  if (!toolbar) {
    throw new Error("Expected edge toolbar foreignObject to be rendered")
  }

  return { ...result, toolbar }
}

describe("CustomEdgeToolbar", () => {
  it("keeps the existing toolbar position when there are no edge draggers", () => {
    const { toolbar } = renderToolbar()

    expect(toolbar.getAttribute("x")).toBe("104")
    expect(toolbar.getAttribute("y")).toBe("92")
  })

  it("moves the toolbar away when the default position overlaps an edge dragger", () => {
    const { toolbar } = renderToolbar([{ x: 100, y: 100 }])

    expect(toolbar.getAttribute("x")).toBe("120")
    expect(toolbar.getAttribute("y")).toBe("72")
  })
})
