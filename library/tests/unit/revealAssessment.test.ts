import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { ApollonEditor } from "@/apollon-editor"
import { ApollonMode, UMLDiagramType } from "@/typings"
import { getEdgesMap } from "@/sync/ydoc"
import type * as Y from "yjs"

/**
 * `revealAssessment` is what lets a host's feedback list drive the canvas: an
 * entry in that list is only readable, never navigable, unless selecting it can
 * answer "which element is this about?". Asserted at the store level — jsdom has
 * no layout, so the pan itself is a browser concern.
 */
const MODEL = {
  version: "4.0.0" as const,
  id: "reveal-model",
  title: "Reveal",
  type: UMLDiagramType.ClassDiagram,
  nodes: [
    {
      id: "node-a",
      type: "class",
      position: { x: 100, y: 200 },
      width: 160,
      height: 100,
      data: {
        name: "A",
        attributes: [{ id: "attr-a1", name: "+ id: int" }],
        methods: [],
      },
    },
    {
      id: "node-b",
      type: "class",
      parentId: "node-a",
      position: { x: 400, y: 0 },
      width: 160,
      height: 100,
      data: { name: "B", attributes: [], methods: [] },
    },
  ],
  edges: [
    {
      id: "edge-ab",
      type: "ClassUnidirectional",
      source: "node-a",
      target: "node-b",
      sourceHandle: "right",
      targetHandle: "left",
      data: { points: [] },
    },
  ],
  assessments: {
    "node-b": {
      modelElementId: "node-b",
      elementType: "class",
      score: 1,
    },
    "edge-ab": {
      modelElementId: "edge-ab",
      elementType: "ClassUnidirectional",
      score: 0,
      feedback: "Edge feedback",
    },
    "attr-a1": {
      modelElementId: "attr-a1",
      elementType: "classAttribute",
      score: 0,
      feedback: "Attribute feedback",
    },
  },
}

describe("ApollonEditor.revealAssessment", () => {
  let container: HTMLElement
  let editor: ApollonEditor

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    editor = new ApollonEditor(container, {
      mode: ApollonMode.Assessment,
      readonly: true,
      model: MODEL,
    })
  })

  afterEach(() => {
    editor.destroy()
    container.remove()
  })

  it("selects a node and opens its feedback popover", () => {
    editor.revealAssessment("node-b")

    const internals = editor as unknown as {
      diagramStore: {
        getState: () => {
          nodes: { id: string; selected?: boolean }[]
          selectedElementIds: string[]
        }
      }
      popoverStore: { getState: () => { popoverElementId: string | null } }
      assessmentSelectionStore: {
        getState: () => { selectedElementIds: string[] }
      }
    }
    const selected = internals.diagramStore
      .getState()
      .nodes.filter((node) => node.selected)
      .map((node) => node.id)

    expect(selected).toEqual(["node-b"])
    expect(internals.diagramStore.getState().selectedElementIds).toEqual([
      "node-b",
    ])
    expect(internals.popoverStore.getState().popoverElementId).toBe("node-b")
    expect(
      internals.assessmentSelectionStore.getState().selectedElementIds
    ).toEqual(["node-b"])
  })

  it("pans to a nested node's absolute canvas position", () => {
    const setCenter = vi.fn()
    const internals = editor as unknown as {
      reactFlowInstance: {
        setCenter: typeof setCenter
        getZoom: () => number
      } | null
    }
    internals.reactFlowInstance = { setCenter, getZoom: () => 1.25 }

    editor.revealAssessment("node-b")

    // Parent (100,200) + local child (400,0) + half size (80,50).
    expect(setCenter).toHaveBeenCalledWith(580, 250, {
      duration: 220,
      zoom: 1.25,
    })
  })

  it("selects an edge, which has no position of its own", () => {
    editor.revealAssessment("edge-ab")

    const internals = editor as unknown as {
      diagramStore: {
        getState: () => {
          nodes: { selected?: boolean }[]
          edges: { id: string; selected?: boolean }[]
        }
      }
      popoverStore: { getState: () => { popoverElementId: string | null } }
    }
    expect(
      internals.diagramStore
        .getState()
        .edges.filter((edge) => edge.selected)
        .map((edge) => edge.id)
    ).toEqual(["edge-ab"])
    expect(
      internals.diagramStore.getState().nodes.some((node) => node.selected)
    ).toBe(false)
    expect(internals.popoverStore.getState().popoverElementId).toBe("edge-ab")
  })

  it("clears the selection and closes the popover for null", () => {
    editor.revealAssessment("node-a")
    editor.revealAssessment(null)

    const internals = editor as unknown as {
      diagramStore: {
        getState: () => {
          nodes: { selected?: boolean }[]
          selectedElementIds: string[]
        }
      }
      popoverStore: { getState: () => { popoverElementId: string | null } }
      assessmentSelectionStore: {
        getState: () => { selectedElementIds: string[] }
      }
    }
    expect(
      internals.diagramStore.getState().nodes.some((node) => node.selected)
    ).toBe(false)
    expect(internals.diagramStore.getState().selectedElementIds).toEqual([])
    expect(internals.popoverStore.getState().popoverElementId).toBeNull()
    expect(
      internals.assessmentSelectionStore.getState().selectedElementIds
    ).toEqual([])
  })

  it("opens the owning node for a member id, which is not clickable itself", () => {
    // A class attribute is assessable but is shown by its class's popover, so a
    // list entry for it has to resolve to that class or it opens nothing.
    editor.revealAssessment("attr-a1")

    const internals = editor as unknown as {
      diagramStore: {
        getState: () => { nodes: { id: string; selected?: boolean }[] }
      }
      popoverStore: { getState: () => { popoverElementId: string | null } }
    }
    expect(internals.popoverStore.getState().popoverElementId).toBe("node-a")
    expect(
      internals.diagramStore
        .getState()
        .nodes.filter((node) => node.selected)
        .map((node) => node.id)
    ).toEqual(["node-a"])
  })

  it("does not leave a popover target for ungraded read-only feedback", () => {
    editor.revealAssessment("node-b")
    expect(() => editor.revealAssessment("ghost-id")).not.toThrow()
    const internals = editor as unknown as {
      popoverStore: { getState: () => { popoverElementId: string | null } }
    }
    expect(internals.popoverStore.getState().popoverElementId).toBeNull()
  })

  it("selects without opening editing UI outside assessment mode", () => {
    editor.destroy()
    editor = new ApollonEditor(container, {
      mode: ApollonMode.Modelling,
      model: MODEL,
    })

    editor.revealAssessment("node-b")

    const internals = editor as unknown as {
      diagramStore: {
        getState: () => {
          selectedElementIds: string[]
        }
      }
      popoverStore: { getState: () => { popoverElementId: string | null } }
    }
    expect(internals.diagramStore.getState().selectedElementIds).toEqual([
      "node-b",
    ])
    expect(internals.popoverStore.getState().popoverElementId).toBeNull()
  })

  it("keeps revealed edge selection out of Yjs and undo history", () => {
    editor.destroy()
    editor = new ApollonEditor(container, {
      mode: ApollonMode.Modelling,
      model: MODEL,
    })

    const selectionChanges: string[][] = []
    editor.subscribeToSelectionChange((ids) => selectionChanges.push(ids))
    editor.revealAssessment("edge-ab")

    const internals = editor as unknown as {
      ydoc: Y.Doc
      diagramStore: {
        getState: () => {
          selectedElementIds: string[]
          undoManager: { undoStack: unknown[] } | null
        }
      }
    }
    expect(internals.diagramStore.getState().selectedElementIds).toEqual([
      "edge-ab",
    ])
    expect(selectionChanges).toEqual([["edge-ab"]])
    expect(getEdgesMap(internals.ydoc).get("edge-ab")?.selected).toBeUndefined()
    expect(internals.diagramStore.getState().undoManager?.undoStack).toEqual([])
  })
})
