import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { ReactFlowProvider, useStoreApi } from "@xyflow/react"
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
// there was never anything there to reach.) `apollon-*` marker classes are
// dropped here so the set reads as pure geometry; a dedicated test covers them.
const controlClasses = (container: HTMLElement): string[] =>
  [...container.querySelectorAll(".react-flow__resize-control")]
    .map((el) =>
      [...el.classList]
        .filter(
          (c) =>
            c !== "react-flow__resize-control" &&
            c !== "nodrag" &&
            !c.startsWith("apollon-")
        )
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

  it("sizes corner handles to 10px without the caller asking", () => {
    const { container } = renderResizer({ minWidth: 50, minHeight: 50 })

    expect(container.querySelector<HTMLElement>(".handle")?.style.width).toBe(
      "10px"
    )
  })

  // The handle class carries the grab-area widening (app.css) that takes the
  // pointer target to the 24x24 CSS pixels WCAG 2.2 SC 2.5.8 asks for, without
  // enlarging the drawn square. Every corner needs it, free path and locked path
  // alike — React Flow renders the two through different components.
  it("marks every corner handle with the hit-area class", () => {
    const free = renderResizer({ minWidth: 50, minHeight: 50 })
    expect(
      free.container.querySelectorAll(".handle.apollon-resize-handle")
    ).toHaveLength(4)

    const locked = renderResizer({
      minWidth: 100,
      minHeight: 60,
      maxHeight: 60,
    })
    expect(
      locked.container.querySelectorAll(".handle.apollon-resize-handle")
    ).toHaveLength(4)
  })

  // The line class carries the z-index lift + widened hit area (app.css) that
  // keeps edge lines reachable over a filled node's content; every edge line
  // needs it, on the free path and the locked path alike.
  it("marks every edge line with the hit-area class", () => {
    const free = renderResizer({ minWidth: 50, minHeight: 50 })
    expect(
      free.container.querySelectorAll(".line.apollon-resize-line")
    ).toHaveLength(4)

    const locked = renderResizer({
      minWidth: 100,
      minHeight: 60,
      maxHeight: 60,
    })
    expect(
      locked.container.querySelectorAll(".line.apollon-resize-line")
    ).toHaveLength(2)
  })

  // Height pinned: keep the corners, drop the top/bottom lines that promise a
  // vertical resize (issue #629).
  it("keeps corners but only the side lines when height is locked", () => {
    const { container } = renderResizer({
      minWidth: 100,
      minHeight: 60,
      maxHeight: 60,
    })

    expect(controlClasses(container)).toEqual([
      "bottom.left.handle",
      "bottom.right.handle",
      "left.line",
      "right.line",
      "top.left.handle",
      "top.right.handle",
    ])
  })

  it("labels a locked node's corners with the free axis's cursor", () => {
    const { container } = renderResizer({
      minWidth: 100,
      minHeight: 60,
      maxHeight: 60,
    })

    // Only width can move, so the corners get the horizontal-cursor marker (and
    // never the vertical one).
    expect(
      container.querySelectorAll(".apollon-resize-corner--x")
    ).toHaveLength(4)
    expect(container.querySelector(".apollon-resize-corner--y")).toBeNull()
  })

  // The locked path must honour a caller's `handleClassName` the same way the
  // free path (which spreads it to React Flow) does — the axis marker is added
  // alongside it, not in place of it.
  it("forwards a caller's handleClassName to a locked node's corners", () => {
    const { container } = renderResizer({
      minWidth: 100,
      minHeight: 60,
      maxHeight: 60,
      handleClassName: "custom-handle",
    })

    expect(
      container.querySelectorAll(".apollon-resize-corner--x.custom-handle")
    ).toHaveLength(4)
  })

  it("keeps corners but only the top/bottom lines when width is locked", () => {
    const { container } = renderResizer({
      minWidth: 20,
      maxWidth: 20,
      minHeight: 40,
    })

    expect(controlClasses(container)).toEqual([
      "bottom.left.handle",
      "bottom.line",
      "bottom.right.handle",
      "top.left.handle",
      "top.line",
      "top.right.handle",
    ])
    expect(
      container.querySelectorAll(".apollon-resize-corner--y")
    ).toHaveLength(4)
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

  // Call sites pass `isVisible={isDiagramModifiable}`, which only answers "may
  // this diagram be edited". Without the selection gate that painted handles and
  // lines around every node on the canvas at once, permanently.
  describe("selection gate", () => {
    // Seeds the store so the resizer has a real node to read `selected` from;
    // `nodeId` is passed explicitly because the node-id context React Flow reads
    // through `useNodeId` is not exported for tests to provide.
    const renderForNode = (selected: boolean) => {
      const Seed = () => {
        const store = useStoreApi()
        store.getState().setNodes([
          {
            id: "n1",
            position: { x: 0, y: 0 },
            data: {},
            selected,
          },
        ])
        return null
      }
      return render(
        <ReactFlowProvider>
          <Seed />
          <NodeResizer nodeId="n1" minWidth={50} minHeight={50} />
        </ReactFlowProvider>
      )
    }

    it("renders nothing while its node is unselected", () => {
      const { container } = renderForNode(false)

      expect(controlClasses(container)).toEqual([])
    })

    it("renders the controls once its node is selected", () => {
      const { container } = renderForNode(true)

      expect(controlClasses(container)).not.toEqual([])
    })
  })
})
