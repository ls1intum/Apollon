import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, cleanup } from "@testing-library/react"
import { ApollonEditor } from "@/apollon-editor"
import { ApollonProvider } from "@/components/react/context"
import { ApollonControl } from "@/components/react/ApollonControl"
import { createOverlayStore } from "@/overlay/overlayStore"

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
    cleanup()
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

  it("getRegionElement caches per acquire; release drops it and re-acquire mints a fresh, re-registered node", () => {
    const a = editor.getRegionElement("header")
    expect(a).toBe(editor.getRegionElement("header"))
    expect(editor.hasControl("apollon:host:header")).toBe(true)

    editor.releaseRegionElement("header")
    expect(editor.hasControl("apollon:host:header")).toBe(false)

    const b = editor.getRegionElement("header")
    expect(b).not.toBe(a)
    expect(editor.hasControl("apollon:host:header")).toBe(true)
  })

  it("throws on an empty id or an unknown region (loud at the edge)", () => {
    expect(() =>
      editor.addControl({ id: "", region: "top-left", render: () => null })
    ).toThrow(/non-empty/)
    expect(() =>
      editor.addControl({
        id: "x",
        region: "nope" as never,
        render: () => null,
      })
    ).toThrow(/unknown region/)
    expect(() => editor.getRegionElement("nope" as never)).toThrow(
      /unknown region/
    )
  })
})

// The imperative built-in-controls config surface — parity with
// `<Apollon controls={…}>`. Store-level (jsdom has no layout), so this asserts
// the config round-trips; placement/rendering is covered by e2e.
describe("built-in controls config (imperative)", () => {
  let el: HTMLElement

  afterEach(() => {
    cleanup()
    el?.remove()
  })

  it("initializes from options.controls and round-trips via get / set", () => {
    el = document.createElement("div")
    document.body.appendChild(el)
    const ed = new ApollonEditor(el, {
      controls: { minimap: false, zoom: { region: "bottom-center" } },
    })

    expect(ed.getControlConfig("minimap")).toBe(false)
    expect(ed.getControlConfig("zoom")).toEqual({ region: "bottom-center" })
    expect(ed.getControlConfig("palette")).toBeUndefined()

    // setControl patches one key, leaves siblings intact.
    ed.setControl("palette", { visible: false })
    expect(ed.getControlConfig("palette")).toEqual({ visible: false })
    expect(ed.getControlConfig("minimap")).toBe(false)

    // setControls replaces the whole config.
    ed.setControls({ zoom: true })
    expect(ed.getControlConfig("zoom")).toBe(true)
    expect(ed.getControlConfig("minimap")).toBeUndefined()
    expect(ed.getControlConfig("palette")).toBeUndefined()

    ed.destroy()
  })
})

// The built-ins swap their *content* through the store's `renders` map (read by
// the `BuiltInRender` slot), never by re-registering — so a host changing a
// control's `render`/`props` refreshes just that slot without recomputing insets
// or thrashing the ResizeObserver. jsdom can't lay the editor out, so we assert
// this contract at the store level (see the note on <ApollonControl> below).
describe("overlay store: live render swap without re-registration", () => {
  it("setRender swaps the render thunk but leaves registration and insets identical", () => {
    const store = createOverlayStore()
    const slot = () => null
    store.getState().register({
      id: "x",
      region: "left-rail",
      inset: "auto",
      order: 0,
      render: slot,
    })
    store.getState().setMeasured("x", { left: 120 })

    const controlBefore = store.getState().controls.x
    const insetsBefore = store.getState().insets
    expect(insetsBefore.left).toBe(120)

    const v1 = () => "v1"
    store.getState().setRender("x", v1)
    expect(store.getState().renders.x).toBe(v1)
    // The registered control and the derived inset rect are the SAME objects:
    // swapping content neither re-registers nor recomputes layout.
    expect(store.getState().controls.x).toBe(controlBefore)
    expect(store.getState().insets).toBe(insetsBefore)

    const v2 = () => "v2"
    store.getState().setRender("x", v2)
    expect(store.getState().renders.x).toBe(v2)
    expect(store.getState().controls.x).toBe(controlBefore)
    expect(store.getState().insets).toBe(insetsBefore)
  })

  it("unregister clears the live render", () => {
    const store = createOverlayStore()
    store
      .getState()
      .register({ id: "x", region: "top-left", render: () => null })
    store.getState().setRender("x", () => null)
    expect(store.getState().renders.x).toBeDefined()

    store.getState().unregister("x")
    expect(store.getState().renders.x).toBeUndefined()
  })
})

// The <ApollonControl> facade in isolation (a fake editor, so we exercise the
// component's register/update/dispose effects without mounting the real editor's
// heavy tree — which jsdom can't render, see Apollon.test.tsx).
describe("<ApollonControl> facade", () => {
  function makeFakeEditor() {
    const controls = new Set<string>()
    const editor = {
      addControl: vi.fn((c: { id: string }) => {
        controls.add(c.id)
        return () => controls.delete(c.id)
      }),
      updateControl: vi.fn(),
      hasControl: (id: string) => controls.has(id),
    }
    return editor as typeof editor & ApollonEditor
  }

  afterEach(cleanup)

  it("registers once on mount and disposes on unmount", () => {
    const editor = makeFakeEditor()
    const { unmount } = render(
      <ApollonProvider editor={editor}>
        <ApollonControl id="react-ctrl" region="top-right">
          <button type="button">Export</button>
        </ApollonControl>
      </ApollonProvider>
    )

    expect(editor.hasControl("react-ctrl")).toBe(true)
    expect(editor.addControl).toHaveBeenCalledTimes(1)
    // Mounting must NOT also fire an update: the register effect already set the
    // initial options, so an update here would double-write the store.
    expect(editor.updateControl).not.toHaveBeenCalled()

    unmount()
    expect(editor.hasControl("react-ctrl")).toBe(false)
  })

  it("re-renders children without re-registering; only option changes update", () => {
    const editor = makeFakeEditor()
    const { rerender } = render(
      <ApollonProvider editor={editor}>
        <ApollonControl id="c" region="top-right">
          <span>one</span>
        </ApollonControl>
      </ApollonProvider>
    )
    expect(editor.addControl).toHaveBeenCalledTimes(1)

    // Children-only change: no store write.
    rerender(
      <ApollonProvider editor={editor}>
        <ApollonControl id="c" region="top-right">
          <span>two</span>
        </ApollonControl>
      </ApollonProvider>
    )
    expect(editor.updateControl).not.toHaveBeenCalled()

    // Real option change: exactly one update.
    rerender(
      <ApollonProvider editor={editor}>
        <ApollonControl id="c" region="bottom-right">
          <span>two</span>
        </ApollonControl>
      </ApollonProvider>
    )
    expect(editor.updateControl).toHaveBeenCalledTimes(1)
    expect(editor.addControl).toHaveBeenCalledTimes(1)
  })
})
