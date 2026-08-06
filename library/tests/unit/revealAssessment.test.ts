import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { ApollonEditor } from "@/apollon-editor"
import { ApollonMode, UMLDiagramType } from "@/typings"

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
      position: { x: 0, y: 0 },
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
  assessments: {},
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
        getState: () => { nodes: { id: string; selected?: boolean }[] }
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
    expect(internals.popoverStore.getState().popoverElementId).toBe("node-b")
    expect(
      internals.assessmentSelectionStore.getState().selectedElementIds
    ).toEqual(["node-b"])
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
    // Selecting the edge must not leave a node selected alongside it.
    expect(
      internals.diagramStore.getState().nodes.some((node) => node.selected)
    ).toBe(false)
    expect(internals.popoverStore.getState().popoverElementId).toBe("edge-ab")
  })

  it("clears the selection and closes the popover for null", () => {
    editor.revealAssessment("node-a")
    editor.revealAssessment(null)

    const internals = editor as unknown as {
      diagramStore: { getState: () => { nodes: { selected?: boolean }[] } }
      popoverStore: { getState: () => { popoverElementId: string | null } }
      assessmentSelectionStore: {
        getState: () => { selectedElementIds: string[] }
      }
    }
    expect(
      internals.diagramStore.getState().nodes.some((node) => node.selected)
    ).toBe(false)
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

  it("falls back to the id itself when nothing owns it", () => {
    expect(() => editor.revealAssessment("ghost-id")).not.toThrow()
    const internals = editor as unknown as {
      popoverStore: { getState: () => { popoverElementId: string | null } }
    }
    expect(internals.popoverStore.getState().popoverElementId).toBe("ghost-id")
  })
})
