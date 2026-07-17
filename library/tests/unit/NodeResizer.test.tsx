import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { ReactFlowProvider } from "@xyflow/react"
import { NodeResizer } from "@/nodes/wrappers"

// React Flow's resize controls read their store from the provider context.
const renderResizer = (props: Parameters<typeof NodeResizer>[0]) =>
  render(
    <ReactFlowProvider>
      <NodeResizer {...props} />
    </ReactFlowProvider>
  )

// Resize controls are bare divs: no role, no accessible name, no tabindex, and
// no keyboard path — so a position/variant class is the only handle on them, and
// it is the same published class React Flow's own stylesheet keys the resize
// cursor off. (It also means dropping a control costs assistive tech nothing:
// there was never anything there to reach.)
const controlClasses = (container: HTMLElement): string[] =>
  [...container.querySelectorAll(".react-flow__resize-control")]
    .map((el) =>
      [...el.classList]
        .filter((c) => c !== "react-flow__resize-control" && c !== "nodrag")
        .join(".")
    )
    .sort()

describe("<NodeResizer>", () => {
  it("renders every line and corner when both axes are free", () => {
    const { container } = renderResizer({ minWidth: 50, minHeight: 50 })

    expect(controlClasses(container)).toEqual(
      [
        "top.line",
        "right.line",
        "bottom.line",
        "left.line",
        "top.left.handle",
        "top.right.handle",
        "bottom.left.handle",
        "bottom.right.handle",
      ].sort()
    )
  })

  it("sizes corner handles to 8px without the caller asking", () => {
    const { container } = renderResizer({ minWidth: 50, minHeight: 50 })

    expect(container.querySelector<HTMLElement>(".handle")?.style.width).toBe(
      "8px"
    )
  })

  // `apollon-resize-line` widens the hit area: with no corner handles these
  // lines are the only grab target, and React Flow draws them 1px wide.
  it("renders only the left/right lines when height is locked (issue #629)", () => {
    const { container } = renderResizer({
      minWidth: 100,
      minHeight: 60,
      maxHeight: 60,
    })

    expect(controlClasses(container)).toEqual([
      "left.line.apollon-resize-line",
      "right.line.apollon-resize-line",
    ])
  })

  it("renders only the top/bottom lines when width is locked", () => {
    const { container } = renderResizer({
      minWidth: 20,
      maxWidth: 20,
      minHeight: 40,
    })

    expect(controlClasses(container)).toEqual([
      "bottom.line.apollon-resize-line",
      "top.line.apollon-resize-line",
    ])
  })

  it("renders nothing when both axes are locked", () => {
    const { container } = renderResizer({
      minWidth: 20,
      maxWidth: 20,
      minHeight: 20,
      maxHeight: 20,
    })

    expect(controlClasses(container)).toEqual([])
  })

  // `isVisible` exists only on NodeResizer, not on the NodeResizeControl the
  // locked path renders — so nothing but this component honours it, and a
  // regression would put live resize controls on a read-only diagram.
  it("renders nothing when not visible", () => {
    const { container } = renderResizer({
      isVisible: false,
      minWidth: 100,
      minHeight: 60,
      maxHeight: 60,
    })

    expect(controlClasses(container)).toEqual([])
  })
})
