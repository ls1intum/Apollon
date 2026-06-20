import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { ApollonEditor } from "@/apollon-editor"

// Drives the public overlay/control API against the real editor (no mock);
// asserts at the store level (jsdom has no layout).
describe("ApollonEditor overlay/control API", () => {
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

  it("addControl registers, returns a disposer, and re-adds by id replaces", () => {
    const dispose = editor.addControl({
      id: "ctrl",
      region: "top-left",
      render: () => null,
    })
    expect(editor.hasControl("ctrl")).toBe(true)
    editor.addControl({ id: "ctrl", region: "top-right", render: () => null })
    expect(editor.hasControl("ctrl")).toBe(true)
    dispose()
    expect(editor.hasControl("ctrl")).toBe(false)
  })

  it("updateControl patches a registered control; missing id is a no-op", () => {
    editor.addControl({ id: "c", region: "header", render: () => null })
    editor.updateControl("c", { region: "bottom-center" })
    expect(editor.hasControl("c")).toBe(true)
    editor.updateControl("missing", { region: "header" })
    expect(editor.hasControl("missing")).toBe(false)
  })

  it("getRegionElement returns a stable node; releaseRegionElement unregisters it", () => {
    const a = editor.getRegionElement("header")
    expect(a).toBe(editor.getRegionElement("header"))
    expect(editor.hasControl("apollon:host:header")).toBe(true)
    editor.releaseRegionElement("header")
    expect(editor.hasControl("apollon:host:header")).toBe(false)
  })
})
