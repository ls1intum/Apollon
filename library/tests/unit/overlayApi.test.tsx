import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { ApollonEditor } from "@/apollon-editor"

// Exercises the canvas overlay/control API against the REAL editor (no mock),
// mirroring assessmentSelectionStore.test.ts. Assertions are at the store level
// (registration, insets) so they're robust under jsdom; the actual in-canvas
// rendering is covered by the webapp e2e + browser probe.

describe("ApollonEditor overlay/control API (imperative)", () => {
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

  it("addControl registers and returns a disposer; re-add by id replaces", () => {
    const dispose = editor.addControl({
      id: "ctrl",
      region: "top-left",
      order: 1,
      render: () => null,
    })
    expect(editor.hasControl("ctrl")).toBe(true)

    editor.addControl({ id: "ctrl", region: "top-right", render: () => null })
    expect(editor.hasControl("ctrl")).toBe(true) // still one control

    dispose()
    expect(editor.hasControl("ctrl")).toBe(false)
  })

  it("updateControl patches a registered control", () => {
    editor.addControl({ id: "c", region: "header", render: () => null })
    editor.updateControl("c", { region: "bottom-center" })
    expect(editor.hasControl("c")).toBe(true)
    editor.updateControl("missing", { region: "header" }) // no-op, no throw
    expect(editor.hasControl("missing")).toBe(false)
  })

  it("getRegionElement returns a stable node and registers a host control", () => {
    const a = editor.getRegionElement("header")
    const b = editor.getRegionElement("header")
    expect(a).toBeInstanceOf(HTMLElement)
    expect(a).toBe(b) // stable across calls
    expect(editor.hasControl("apollon:host:header")).toBe(true)
  })

  it("setInset / clearInset / getInsets manage the manual floor", () => {
    expect(editor.getInsets()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    editor.setInset("right", 50)
    expect(editor.getInsets().right).toBe(50)
    editor.clearInset("right")
    expect(editor.getInsets().right).toBe(0)
  })

  it("onInsetsChange fires when the published inset rect changes", () => {
    const seen: number[] = []
    const off = editor.onInsetsChange((i) => seen.push(i.left))
    editor.setInset("left", 24)
    expect(seen).toContain(24)
    off()
    editor.setInset("left", 99)
    expect(seen).not.toContain(99)
  })

  it("display options + breakpoint are readable/writable", () => {
    expect(["mobile", "tablet", "desktop"]).toContain(editor.getBreakpoint())
    editor.setDisplayOptions({ minimap: false })
    expect(editor.getDisplayOptions().minimap).toBe(false)
  })
})
