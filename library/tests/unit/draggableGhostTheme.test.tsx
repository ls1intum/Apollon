import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { CSSProperties } from "react"
import type { DropElementConfig } from "@/constants"

// The ghost only needs the viewport zoom and a place to drop into; the canvas
// itself is irrelevant to how it is themed.
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    screenToFlowPosition: (position: { x: number; y: number }) => position,
    getIntersectingNodes: () => [],
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  }),
}))

vi.mock("@/store/context", () => ({
  useDiagramStore: (select: (state: unknown) => unknown) =>
    select({
      diagramId: "diagram",
      nodes: [],
      setNodes: () => {},
      edges: [],
      setEdges: () => {},
      selectedElementIds: [],
      setSelectedElementsId: () => {},
      lastPlacedElementId: null,
      setLastPlacedElementId: () => {},
    }),
  useMetadataStore: (select: (state: unknown) => unknown) =>
    select({
      labels: { addElement: "Add element", nodeTypeLabel: (t: string) => t },
    }),
}))

import { DraggableGhost } from "@/components/DraggableGhost"

const config = {
  type: "Class",
  width: 200,
  height: 100,
  defaultData: {},
} as unknown as DropElementConfig

/** The ghost portals to `document.body`, so it is a sibling of the mount. */
const renderedGhost = (): HTMLElement | undefined =>
  [...document.body.children].find(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element.style.position === "fixed"
  )

const grab = (mount: { dataTheme?: string; style?: CSSProperties } = {}) => {
  const { getByTestId } = render(
    <div
      className="apollon-editor"
      style={mount.style}
      {...(mount.dataTheme ? { "data-theme": mount.dataTheme } : {})}
    >
      <DraggableGhost dropElementConfig={config}>
        <div data-testid="entry">entry</div>
      </DraggableGhost>
    </div>
  )
  fireEvent.pointerDown(getByTestId("entry").parentElement as HTMLElement, {
    clientX: 10,
    clientY: 10,
  })
}

describe("palette drag ghost theming", () => {
  // The token deltas are scoped to the `[data-theme]` subtree. The ghost leaves
  // it for `document.body`, so it has to re-declare the attribute — the value it
  // was grabbed under, not a hard-coded one.
  it.each(["dark", "light"])("carries a scoped %s theme", (dataTheme) => {
    grab({ dataTheme })
    expect(renderedGhost()?.getAttribute("data-theme")).toBe(dataTheme)
  })

  // `data-theme` alone is not enough: a mount themed by inline custom properties
  // (the `theme` option) or by a host stylesheet (VS Code) declares no attribute
  // at all, so the ghost has to carry the resolved token values too.
  it("carries the resolved tokens of a mount that declares no `data-theme`", () => {
    grab({ style: { "--apollon-surface": "rgb(4, 4, 4)" } as CSSProperties })
    const ghost = renderedGhost()
    expect(ghost?.hasAttribute("data-theme")).toBe(false)
    expect(ghost?.style.getPropertyValue("--apollon-surface")).toBe(
      "rgb(4, 4, 4)"
    )
  })
})
