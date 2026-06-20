import { describe, it, expect } from "vitest"
import * as Y from "yjs"
import { createDiagramStore } from "@/store/diagramStore"
import type { Edge, Node } from "@xyflow/react"

const node = (id: string): Node => ({
  id,
  type: "class",
  position: { x: 0, y: 0 },
  data: { name: id },
})

const edge = (overrides: Partial<Edge>): Edge => ({
  id: "e1",
  source: "a",
  target: "b",
  ...overrides,
})

/**
 * Guards the live-app regression: a diagram loaded straight into the editor
 * (e.g. `new ApollonEditor({ model })` / `editor.model =`) must have its legacy
 * handle ids migrated to the canonical anchor model, otherwise React Flow drops
 * every edge onto a handle the node no longer renders.
 */
describe("diagramStore handle migration on ingestion", () => {
  it("migrates legacy edge handles on setNodesAndEdges", () => {
    const store = createDiagramStore(new Y.Doc())
    store
      .getState()
      .setNodesAndEdges(
        [node("a"), node("b")],
        [edge({ sourceHandle: "right", targetHandle: "top-left" })]
      )
    const [stored] = store.getState().edges
    expect(stored.sourceHandle).toBe("r:0.500")
    expect(stored.targetHandle).toBe("t:0.000")
  })

  it("leaves canonical anchor handles untouched (idempotent)", () => {
    const store = createDiagramStore(new Y.Doc())
    const original = edge({ sourceHandle: "r:0.350", targetHandle: "l:0.500" })
    store.getState().setNodesAndEdges([node("a"), node("b")], [original])
    const [stored] = store.getState().edges
    expect(stored.sourceHandle).toBe("r:0.350")
    expect(stored.targetHandle).toBe("l:0.500")
  })
})
