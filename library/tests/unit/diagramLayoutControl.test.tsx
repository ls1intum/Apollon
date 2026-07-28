import { useLayoutEffect, type CSSProperties, type ReactNode } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import {
  ReactFlowProvider,
  useStoreApi,
  type Edge,
  type Node,
} from "@xyflow/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as Y from "yjs"
import { DiagramLayoutControl } from "@/chrome/builtins/DiagramLayoutControl"
import {
  DiagramStoreContext,
  MetadataStoreContext,
  OverlayStoreContext,
} from "@/store/context"
import { createDiagramStore } from "@/store/diagramStore"
import { createMetadataStore } from "@/store/metadataStore"
import { createOverlayStore } from "@/overlay/overlayStore"
import { DiagramLayoutError } from "@/layout/workerController"

const { executeArrangeDiagram, fitArrangedDiagram } = vi.hoisted(() => ({
  executeArrangeDiagram: vi.fn(),
  fitArrangedDiagram: vi.fn(),
}))
vi.mock("@/layout/arrangeDiagram", () => ({ executeArrangeDiagram }))
vi.mock("@/layout/fitView", () => ({ fitArrangedDiagram }))

const nodes: Node[] = [
  {
    id: "a",
    type: "class",
    position: { x: 0, y: 0 },
    width: 100,
    height: 60,
    measured: { width: 100, height: 60 },
    data: {},
  },
  {
    id: "b",
    type: "class",
    position: { x: 200, y: 0 },
    width: 100,
    height: 60,
    measured: { width: 100, height: 60 },
    data: {},
  },
]

function SeedReactFlow({ children }: { children: ReactNode }) {
  const store = useStoreApi()
  useLayoutEffect(() => {
    store.setState({ nodes })
  }, [store])
  return children
}

const renderControl = ({
  edges,
  diagramType = "ClassDiagram",
}: {
  edges: Edge[]
  diagramType?: "ClassDiagram" | "ActivityDiagram"
}) => {
  const doc = new Y.Doc()
  const diagramStore = createDiagramStore(doc)
  const metadataStore = createMetadataStore(
    doc,
    () => diagramStore.getState().previewMode
  )
  const overlayStore = createOverlayStore()
  diagramStore.getState().setNodes(structuredClone(nodes))
  diagramStore.getState().setEdges(edges)
  metadataStore.getState().updateDiagramType(diagramType)
  const editorStyle = {
    "--apollon-primary": "rgb(12, 34, 56)",
  } as CSSProperties
  const result = render(
    <div className="apollon-editor" style={editorStyle}>
      <DiagramStoreContext value={diagramStore}>
        <MetadataStoreContext value={metadataStore}>
          <OverlayStoreContext value={overlayStore}>
            <ReactFlowProvider>
              <SeedReactFlow>
                <DiagramLayoutControl />
              </SeedReactFlow>
            </ReactFlowProvider>
          </OverlayStoreContext>
        </MetadataStoreContext>
      </DiagramStoreContext>
    </div>
  )
  return { ...result, doc, diagramStore }
}

describe("DiagramLayoutControl", () => {
  afterEach(() => {
    executeArrangeDiagram.mockReset()
    fitArrangedDiagram.mockReset()
  })

  it("discloses and reports replacement of visible manual routing", async () => {
    executeArrangeDiagram.mockReturnValue({
      cancel: vi.fn(),
      result: Promise.resolve({
        status: "applied",
        movedNodeCount: 0,
        replacedManualRouteCount: 1,
      }),
    })
    const { unmount, doc, diagramStore } = renderControl({
      edges: [
        {
          id: "edge",
          source: "a",
          target: "b",
          type: "ClassUnidirectional",
          data: { points: [{ x: 100, y: 30 }] },
        },
      ],
    })

    const button = screen.getByRole("button", {
      name: "Arrange diagram",
    })
    expect(button).not.toHaveAttribute("aria-disabled", "true")
    expect(button).toHaveAccessibleDescription(
      "Arrange nodes. Replacing 1 visible manually routed edge requires confirmation."
    )
    fireEvent.click(button)
    expect(executeArrangeDiagram).not.toHaveBeenCalled()
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveAccessibleName("Replace manual edge routing?")
    expect(dialog).toHaveTextContent(
      "Arrange will replace 1 visible manually routed edge with automatic routing. Undo restores both the node positions and manual routing."
    )
    expect(dialog).toHaveStyle({ "--apollon-primary": "rgb(12, 34, 56)" })
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus()
    )

    fireEvent.keyDown(dialog, { key: "Escape" })
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(executeArrangeDiagram).not.toHaveBeenCalled()
    expect(diagramStore.getState().edges[0].data?.points).toEqual([
      { x: 100, y: 30 },
    ])
    expect(button).toHaveFocus()

    fireEvent.click(button)
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }))
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(executeArrangeDiagram).not.toHaveBeenCalled()
    expect(diagramStore.getState().edges[0].data?.points).toEqual([
      { x: 100, y: 30 },
    ])
    expect(button).toHaveFocus()

    fireEvent.click(button)
    fireEvent.click(
      await screen.findByRole("button", { name: "Replace and arrange" })
    )
    expect(executeArrangeDiagram).toHaveBeenCalledWith(
      expect.objectContaining({ replaceManualRoutes: true })
    )
    expect(await screen.findByRole("status")).toHaveTextContent(
      "1 visible manual edge route was replaced. Node positions were already optimal. Undo restores the route."
    )
    expect(fitArrangedDiagram).not.toHaveBeenCalled()
    unmount()
    doc.destroy()
  })

  it("runs for a flat diagram family outside the original profile", async () => {
    executeArrangeDiagram.mockReturnValue({
      cancel: vi.fn(),
      result: Promise.resolve({
        status: "applied",
        movedNodeCount: 1,
        replacedManualRouteCount: 0,
      }),
    })
    const { unmount, doc } = renderControl({
      edges: [
        {
          id: "edge",
          source: "a",
          target: "b",
          type: "ActivityControlFlow",
        },
      ],
      diagramType: "ActivityDiagram",
    })

    const button = screen.getByRole("button", { name: "Arrange diagram" })
    expect(button).not.toHaveAttribute("aria-disabled", "true")
    fireEvent.click(button)
    expect(executeArrangeDiagram).toHaveBeenCalledOnce()
    expect(executeArrangeDiagram.mock.calls[0][0].getDiagramType()).toBe(
      "ActivityDiagram"
    )
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Diagram arranged and fitted to view."
    )
    expect(fitArrangedDiagram).toHaveBeenCalledOnce()
    unmount()
    doc.destroy()
  })

  it("keeps manual-route disclosure ahead of an earlier result", async () => {
    executeArrangeDiagram.mockReturnValue({
      cancel: vi.fn(),
      result: Promise.resolve({ status: "unchanged" }),
    })
    const { unmount, doc, diagramStore } = renderControl({
      edges: [
        {
          id: "edge",
          source: "a",
          target: "b",
          type: "ClassUnidirectional",
          data: { points: [] },
        },
      ],
    })
    const button = screen.getByRole("button", { name: "Arrange diagram" })

    fireEvent.click(button)
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "No clearer arrangement was found."
      )
    )
    act(() => {
      diagramStore.getState().setEdges([
        {
          id: "edge",
          source: "a",
          target: "b",
          type: "ClassUnidirectional",
          data: { points: [{ x: 100, y: 30 }] },
        },
      ])
    })

    await waitFor(() =>
      expect(button).toHaveAccessibleDescription(
        "Arrange nodes. Replacing 1 visible manually routed edge requires confirmation."
      )
    )
    unmount()
    doc.destroy()
  })

  it.each([
    ["timeout", "Arrangement took too long. No changes were made."],
    [
      "worker-start",
      "Automatic arrangement isn’t available in this environment.",
    ],
    [
      "worker-runtime",
      "Arrangement failed unexpectedly. No changes were made.",
    ],
    [
      "invalid-result",
      "Arrangement failed unexpectedly. No changes were made.",
    ],
  ] as const)("reports an actionable %s failure", async (code, message) => {
    executeArrangeDiagram.mockReturnValue({
      cancel: vi.fn(),
      result: Promise.reject(new DiagramLayoutError(code, "internal detail")),
    })
    const { unmount, doc } = renderControl({
      edges: [
        {
          id: "edge",
          source: "a",
          target: "b",
          type: "ClassUnidirectional",
          data: { points: [] },
        },
      ],
    })

    fireEvent.click(screen.getByRole("button", { name: "Arrange diagram" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(message)
    unmount()
    doc.destroy()
  })
})
