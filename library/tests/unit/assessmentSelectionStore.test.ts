import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { createAssessmentSelectionStore } from "@/store/assessmentSelectionStore"
import { ApollonEditor } from "@/apollon-editor"

describe("assessmentSelectionStore host-driven highlights", () => {
  let store: ReturnType<typeof createAssessmentSelectionStore>

  beforeEach(() => {
    store = createAssessmentSelectionStore()
  })

  it("starts with an empty highlight map", () => {
    expect(store.getState().highlightedElements).toEqual({})
  })

  it("setElementHighlights replaces the whole map", () => {
    store.getState().setElementHighlights({
      "node-1": "rgba(23,162,184,0.3)",
      "edge-2": "rgba(219,53,69,0.6)",
    })
    expect(store.getState().highlightedElements).toEqual({
      "node-1": "rgba(23,162,184,0.3)",
      "edge-2": "rgba(219,53,69,0.6)",
    })

    // A subsequent call replaces rather than merges.
    store.getState().setElementHighlights({ "node-3": "#ff0000" })
    expect(store.getState().highlightedElements).toEqual({
      "node-3": "#ff0000",
    })

    // An empty map clears all highlights.
    store.getState().setElementHighlights({})
    expect(store.getState().highlightedElements).toEqual({})
  })

  it("host highlights are independent of selection state", () => {
    store.getState().setElementHighlights({ "node-1": "#ff0000" })
    store.getState().selectMultipleElements(["node-1", "node-2"])
    store.getState().setHighlightedElement("node-2")

    // Toggling assessment-selection mode off clears the interactive selection
    // and hover, but must NOT wipe the host-driven highlight overlay.
    store.getState().setAssessmentSelectionMode(false)

    const state = store.getState()
    expect(state.selectedElementIds).toEqual([])
    expect(state.highlightedElementId).toBeNull()
    expect(state.highlightedElements).toEqual({ "node-1": "#ff0000" })
  })

  it("reset clears host highlights along with the rest of the state", () => {
    store.getState().setElementHighlights({ "node-1": "#ff0000" })
    store.getState().reset()
    expect(store.getState().highlightedElements).toEqual({})
  })
})

describe("ApollonEditor host-driven highlight API", () => {
  let container: HTMLElement
  let editor: ApollonEditor

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    editor = new ApollonEditor(container)
  })

  afterEach(() => {
    editor.destroy()
    container.remove()
  })

  it("normalizes a Map input to a Record", () => {
    const map = new Map([
      ["node-1", "#ff0000"],
      ["edge-2", "#00ff00"],
    ])
    editor.setElementHighlights(map)
    expect(editor.getElementHighlights()).toEqual({
      "node-1": "#ff0000",
      "edge-2": "#00ff00",
    })
  })

  it("isolates stored highlights from the caller's input and returned snapshot", () => {
    // Map and Record inputs share one normalization path, so a single input
    // type exercises the defensive copy on the way in...
    const input = new Map([["node-1", "#ff0000"]])
    editor.setElementHighlights(input)
    input.set("node-1", "tampered")
    expect(editor.getElementHighlights()).toEqual({ "node-1": "#ff0000" })

    // ...and the getter must hand back an independent copy on the way out.
    const snapshot = editor.getElementHighlights()
    snapshot["node-1"] = "tampered"
    expect(editor.getElementHighlights()).toEqual({ "node-1": "#ff0000" })
  })

  it("clears on null but treats undefined as a no-op", () => {
    editor.setElementHighlights({ "node-1": "#ff0000" })
    editor.setElementHighlights(null)
    expect(editor.getElementHighlights()).toEqual({})

    editor.setElementHighlights({ "node-1": "#ff0000" })
    editor.setElementHighlights(undefined)
    expect(editor.getElementHighlights()).toEqual({ "node-1": "#ff0000" })
  })
})
