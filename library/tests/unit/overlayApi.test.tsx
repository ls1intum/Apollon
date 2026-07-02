import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, cleanup, act } from "@testing-library/react"
import { ApollonEditor } from "@/apollon-editor"
import { ApollonProvider } from "@/components/react/context"
import { ApollonControl } from "@/components/react/ApollonControl"
import { ApollonSelectionToolbar } from "@/components/react/ApollonSelectionToolbar"
import {
  ApollonPalette,
  ApollonZoom,
  ApollonMiniMap,
} from "@/components/react/builtins"
import { createOverlayStore } from "@/overlay/overlayStore"
import { OverlayLayer } from "@/overlay/OverlayLayer"
import { OverlayStoreContext } from "@/store/context"
import type { OverlayControlInput } from "@/overlay/types"
import {
  MINIMAP_ID,
  PALETTE_ID,
  ZOOM_ID,
  miniMapControl,
  paletteControl,
  zoomControl,
} from "@/chrome/builtins/controls"

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
    expect(editor.getControl("ctrl")?.region).toBe("top-left")
    editor.addControl({ id: "ctrl", region: "top-right", render: () => null })
    expect(editor.getControl("ctrl")?.region).toBe("top-right")
    dispose()
    expect(editor.hasControl("ctrl")).toBe(false)
  })

  it("updateControl patches a registered control; missing id is a no-op", () => {
    editor.addControl({ id: "c", region: "header", render: () => null })
    editor.updateControl("c", { region: "bottom-center" })
    expect(editor.getControl("c")?.region).toBe("bottom-center")
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

// The imperative built-in surface: `options.controls` is a descriptor array built
// from the same factories the React compound components wrap. Supplying it opts
// out of the defaults; each descriptor registers under its reserved id. Store-
// level (jsdom has no layout); placement/rendering is covered by e2e.
describe("built-in controls (imperative descriptors)", () => {
  let el: HTMLElement

  afterEach(() => {
    cleanup()
    el?.remove()
  })

  it("registers exactly the supplied descriptors; omitted built-ins stay hidden", () => {
    el = document.createElement("div")
    document.body.appendChild(el)
    const ed = new ApollonEditor(el, {
      controls: [zoomControl({ region: "bottom-center" })],
    })

    // Supplied → registered; the palette + minimap were omitted → not registered.
    expect(ed.hasControl(ZOOM_ID)).toBe(true)
    expect(ed.hasControl(PALETTE_ID)).toBe(false)
    expect(ed.hasControl(MINIMAP_ID)).toBe(false)

    // addControl / removeControl are the imperative show / hide for a built-in.
    ed.addControl(miniMapControl())
    expect(ed.hasControl(MINIMAP_ID)).toBe(true)
    ed.removeControl(ZOOM_ID)
    expect(ed.hasControl(ZOOM_ID)).toBe(false)

    ed.destroy()
  })

  it("an empty array opts out of the default chrome entirely", () => {
    el = document.createElement("div")
    document.body.appendChild(el)
    const ed = new ApollonEditor(el, { controls: [] })

    expect(ed.hasControl(ZOOM_ID)).toBe(false)
    expect(ed.hasControl(PALETTE_ID)).toBe(false)
    expect(ed.hasControl(MINIMAP_ID)).toBe(false)

    // A factory descriptor added later still lands under its reserved id.
    ed.addControl(paletteControl())
    expect(ed.hasControl(PALETTE_ID)).toBe(true)

    ed.destroy()
  })

  it("omitting controls registers all three defaults", () => {
    el = document.createElement("div")
    document.body.appendChild(el)
    const ed = new ApollonEditor(el)

    expect(ed.hasControl(PALETTE_ID)).toBe(true)
    expect(ed.hasControl(ZOOM_ID)).toBe(true)
    expect(ed.hasControl(MINIMAP_ID)).toBe(true)

    ed.destroy()
  })

  it("updateControl(MINIMAP_ID, { region }) moves it — the region is not frozen in the render", () => {
    el = document.createElement("div")
    document.body.appendChild(el)
    const ed = new ApollonEditor(el)

    // The minimap self-positions from its LIVE registry region (BuiltInMiniMap
    // reads it), so patching region must land on the record, not behind a captured
    // closure — read the field back rather than trusting hasControl.
    ed.updateControl(MINIMAP_ID, { region: "top-left" })
    expect(ed.getControl(MINIMAP_ID)?.region).toBe("top-left")

    ed.destroy()
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

// The compound built-ins (`<Apollon.Palette|Zoom|MiniMap>`) are thin `useControl`
// wrappers: mounting registers the reserved id, a prop change re-registers, and
// unmount disposes — the composition contract behind "presence renders, omission
// hides". Same fake-editor harness (jsdom can't lay the real editor out).
describe("compound built-in components", () => {
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

  it("register their reserved ids on mount and dispose on unmount", () => {
    const editor = makeFakeEditor()
    const { unmount } = render(
      <ApollonProvider editor={editor}>
        <ApollonPalette />
        <ApollonZoom history={false} />
        <ApollonMiniMap region="top-right" />
      </ApollonProvider>
    )

    expect(editor.hasControl(PALETTE_ID)).toBe(true)
    expect(editor.hasControl(ZOOM_ID)).toBe(true)
    expect(editor.hasControl(MINIMAP_ID)).toBe(true)

    unmount()
    expect(editor.hasControl(PALETTE_ID)).toBe(false)
    expect(editor.hasControl(ZOOM_ID)).toBe(false)
    expect(editor.hasControl(MINIMAP_ID)).toBe(false)
  })

  it("re-register (dispose + add) when a prop changes, but not on an unrelated render", () => {
    const editor = makeFakeEditor()
    const tree = (history: boolean, extra: string) => (
      <ApollonProvider editor={editor}>
        <ApollonZoom history={history} />
        <span>{extra}</span>
      </ApollonProvider>
    )
    const { rerender } = render(tree(true, "a"))
    expect(editor.addControl).toHaveBeenCalledTimes(1)

    // Sibling-only change: the zoom deps are unchanged, so no re-register.
    rerender(tree(true, "b"))
    expect(editor.addControl).toHaveBeenCalledTimes(1)

    // A real prop change re-registers (the descriptor's `render` closes over it).
    rerender(tree(false, "b"))
    expect(editor.addControl).toHaveBeenCalledTimes(2)
    expect(editor.hasControl(ZOOM_ID)).toBe(true)
  })
})

// Lane DIRECTION is what pins lane 0 to the anchor edge: `header` stacks downward
// (`column`) so lane 0 is the top row; `footer` stacks upward (`column-reverse`)
// so lane 0 is the bottom row though it renders first. The store's summed
// reservation is direction-agnostic, so only a rendered assertion catches a
// flipped stack.
describe("OverlayLayer band rendering (rendered lane stacking)", () => {
  afterEach(cleanup)

  function renderBands(controls: OverlayControlInput[]) {
    const store = createOverlayStore()
    for (const c of controls) store.getState().register(c)
    return render(
      <OverlayStoreContext.Provider value={store}>
        <OverlayLayer />
      </OverlayStoreContext.Provider>
    )
  }

  it("stacks header lanes downward and footer lanes upward, lane 0 flush to each anchor edge", () => {
    const { container } = renderBands([
      { id: "h0", region: "header", lane: 0, render: () => <span>h0</span> },
      { id: "h1", region: "header", lane: 1, render: () => <span>h1</span> },
      { id: "f0", region: "footer", lane: 0, render: () => <span>f0</span> },
      { id: "f1", region: "footer", lane: 1, render: () => <span>f1</span> },
    ])

    const header = container.querySelector<HTMLElement>(
      '[data-apollon-region="header"]'
    )
    const footer = container.querySelector<HTMLElement>(
      '[data-apollon-region="footer"]'
    )
    expect(header).not.toBeNull()
    expect(footer).not.toBeNull()

    // The cross-axis stacking direction — the load-bearing fact. `column` puts the
    // first-rendered lane (0) at the top; `column-reverse` puts it at the bottom.
    expect(header!.style.flexDirection).toBe("column")
    expect(footer!.style.flexDirection).toBe("column-reverse")

    // Both bands render their lanes in ascending DOM order (lane 0 first).
    const lanes = (band: HTMLElement) =>
      [...band.querySelectorAll("[data-apollon-lane]")].map((el) =>
        el.getAttribute("data-apollon-lane")
      )
    expect(lanes(header!)).toEqual(["0", "1"])
    expect(lanes(footer!)).toEqual(["0", "1"])
  })
})

// `useKeyboardInset` (inside OverlayLayer) mirrors the visual viewport's bottom
// overlap (a mobile soft keyboard) into `--apollon-keyboard-inset` on the document
// root. The var is SHARED by every editor on the page, so it is ref-counted: one
// editor unmounting must not wipe it out from under the others. Exercised through
// OverlayLayer since the hook is internal.
describe("useKeyboardInset (OverlayLayer)", () => {
  afterEach(cleanup)

  function renderLayer() {
    const store = createOverlayStore()
    return render(
      <OverlayStoreContext.Provider value={store}>
        <OverlayLayer />
      </OverlayStoreContext.Provider>
    )
  }

  it("publishes the viewport overlap and removes the var only when the last writer unmounts", () => {
    const root = document.documentElement
    const listeners: Record<string, Set<() => void>> = {}
    const vv = {
      height: 668,
      offsetTop: 0,
      addEventListener: (type: string, cb: () => void) => {
        ;(listeners[type] ??= new Set()).add(cb)
      },
      removeEventListener: (type: string, cb: () => void) => {
        listeners[type]?.delete(cb)
      },
    }
    const origInner = Object.getOwnPropertyDescriptor(window, "innerHeight")
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 768,
    })
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: vv,
    })

    try {
      // First editor mounts → overlap = innerHeight − vv.height − offsetTop.
      const first = renderLayer()
      expect(root.style.getPropertyValue("--apollon-keyboard-inset")).toBe(
        "100px"
      )

      // A soft keyboard opens: the visual viewport shrinks, a resize re-measures.
      act(() => {
        vv.height = 468
        listeners.resize?.forEach((cb) => cb())
      })
      expect(root.style.getPropertyValue("--apollon-keyboard-inset")).toBe(
        "300px"
      )

      // A second editor mounts (shares the one document-root var).
      const second = renderLayer()
      expect(root.style.getPropertyValue("--apollon-keyboard-inset")).toBe(
        "300px"
      )

      // Unmounting ONE editor must not clear the shared var while another writes it.
      first.unmount()
      expect(root.style.getPropertyValue("--apollon-keyboard-inset")).toBe(
        "300px"
      )

      // Only the LAST writer unmounting removes the var.
      second.unmount()
      expect(root.style.getPropertyValue("--apollon-keyboard-inset")).toBe("")
    } finally {
      if (origInner) Object.defineProperty(window, "innerHeight", origInner)
      // @ts-expect-error clear the stubbed property (jsdom has none by default)
      delete window.visualViewport
    }
  })
})

// `<Apollon.SelectionToolbar>` composes a selection-anchored toolbar. Like the
// compound built-ins it is a thin register/dispose wrapper — mounting registers
// the reserved `apollon:selection-toolbar` id as a self-positioned `on-canvas`
// control (NodeToolbar does the positioning), and unmount disposes it. Same
// fake-editor harness (the descriptor's `render` — a NodeToolbar reading RF store
// state — is never invoked here, so no ReactFlowProvider is needed).
describe("<Apollon.SelectionToolbar>", () => {
  function makeFakeEditor() {
    const controls = new Map<string, OverlayControlInput>()
    const editor = {
      addControl: vi.fn((c: OverlayControlInput) => {
        controls.set(c.id, c)
        return () => controls.delete(c.id)
      }),
      updateControl: vi.fn(),
      hasControl: (id: string) => controls.has(id),
      getControl: (id: string) => controls.get(id),
    }
    return editor as typeof editor & ApollonEditor
  }

  afterEach(cleanup)

  it("registers a self-positioned on-canvas control on mount and disposes on unmount", () => {
    const editor = makeFakeEditor()
    const { unmount } = render(
      <ApollonProvider editor={editor}>
        <ApollonSelectionToolbar position="top">
          <button type="button">Delete</button>
        </ApollonSelectionToolbar>
      </ApollonProvider>
    )

    expect(editor.hasControl("apollon:selection-toolbar")).toBe(true)
    expect(editor.addControl).toHaveBeenCalledTimes(1)
    const descriptor = editor.addControl.mock.calls[0][0]
    expect(descriptor.id).toBe("apollon:selection-toolbar")
    expect(descriptor.region).toBe("on-canvas")
    expect(descriptor.selfPositioned).toBe(true)

    unmount()
    expect(editor.hasControl("apollon:selection-toolbar")).toBe(false)
  })
})
