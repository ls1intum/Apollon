import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, cleanup } from "@testing-library/react"
import { ApollonEditor } from "@/apollon-editor"
import { ApollonProvider } from "@/components/react/context"
import { ApollonControl } from "@/components/react/ApollonControl"
import {
  ApollonPalette,
  ApollonZoom,
  ApollonMiniMap,
} from "@/components/react/builtins"
import { computeInsets, createOverlayStore } from "@/overlay/overlayStore"
import type { OverlayControl, OverlayRegion } from "@/overlay/types"
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

    // The minimap self-positions from its LIVE registry region (BuiltInMiniMap reads
    // it), so patching region must actually land on the record — not a no-op behind
    // a captured closure. Read the field back (the blind spot that hid the bug).
    ed.updateControl(MINIMAP_ID, { region: "top-left" })
    expect(ed.getControl(MINIMAP_ID)?.region).toBe("top-left")

    ed.destroy()
  })
})

// Two-tier chrome: BANDS (header/left-rail/right-rail) reserve their cross-size on
// their one edge; SLOTS (the panel corners) float and reserve nothing. This is the
// model that keeps a bottom-corner control from shortening the left-rail palette —
// the user-reported "it does not adapt" bug. Unit the reservation math directly.
describe("computeInsets: band vs slot reservation", () => {
  const ctrl = (
    id: string,
    region: OverlayRegion,
    extra: Partial<OverlayControl> = {}
  ): OverlayControl => ({ id, region, render: () => null, ...extra })

  it("a band reserves its measured cross-size on its own edge; a slot reserves nothing", () => {
    expect(
      computeInsets([ctrl("p", "left-rail")], { p: { left: 150 } })
    ).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 150,
    })
    expect(
      computeInsets([ctrl("z", "bottom-center")], { z: { bottom: 40 } })
    ).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  it("a bottom slot never couples to the left-rail — moving it changes no inset", () => {
    const measured = { p: { left: 150 }, z: { bottom: 40 } }
    const left = computeInsets(
      [ctrl("p", "left-rail"), ctrl("z", "bottom-left")],
      measured
    )
    const center = computeInsets(
      [ctrl("p", "left-rail"), ctrl("z", "bottom-center")],
      measured
    )
    expect(left).toEqual(center)
    expect(left).toEqual({ top: 0, right: 0, bottom: 0, left: 150 })
  })

  it("disjoint bands stay independent; a hidden band reserves nothing", () => {
    expect(
      computeInsets(
        [ctrl("h", "header"), ctrl("l", "left-rail"), ctrl("r", "right-rail")],
        { h: { top: 48 }, l: { left: 150 }, r: { right: 120 } }
      )
    ).toEqual({ top: 48, right: 120, bottom: 0, left: 150 })
    expect(
      computeInsets([ctrl("l", "left-rail", { visible: false })], {
        l: { left: 150 },
      })
    ).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  it("an explicit inset opts a slot into make-way reservation", () => {
    expect(
      computeInsets([ctrl("z", "bottom-left", { inset: "auto" })], {
        z: { bottom: 40 },
      }).bottom
    ).toBe(40)
  })
})

// A compound built-in (`<Apollon.Zoom history={…}>`) refreshes its content by
// RE-REGISTERING the descriptor with a new `render` — there is no separate render
// map. That is only cheap because `recompute` returns the SAME `insets` object
// when the values are unchanged, so an `insets` subscriber (App's CSS vars,
// fitView) never re-renders just because a control swapped its renderer. Assert
// that identity contract at the store level.
describe("overlay store: re-registration keeps insets identity-stable", () => {
  it("re-registering the same id with a new render reuses the insets object", () => {
    const store = createOverlayStore()
    store.getState().register({
      id: "apollon:zoom",
      region: "bottom-left",
      render: () => "v1",
    })
    store.getState().setMeasured("apollon:zoom", { bottom: 48 })

    const insetsBefore = store.getState().insets
    // A slot reserves nothing, so the zoom cluster never couples the bottom edge.
    expect(insetsBefore.bottom).toBe(0)

    store.getState().register({
      id: "apollon:zoom",
      region: "bottom-left",
      render: () => "v2",
    })
    // New renderer took effect, but the derived inset rect is the SAME object —
    // re-registration didn't thrash layout.
    expect(store.getState().controls["apollon:zoom"].render()).toBe("v2")
    expect(store.getState().insets).toBe(insetsBefore)
  })

  it("re-registering a band with an unchanged measured size reuses insets", () => {
    const store = createOverlayStore()
    store.getState().register({
      id: "apollon:palette",
      region: "left-rail",
      render: () => null,
    })
    store.getState().setMeasured("apollon:palette", { left: 160 })

    const insetsBefore = store.getState().insets
    expect(insetsBefore.left).toBe(160)

    // Re-register (e.g. the palette component re-rendered) — same size, so identity holds.
    store.getState().register({
      id: "apollon:palette",
      region: "left-rail",
      render: () => null,
    })
    expect(store.getState().insets).toBe(insetsBefore)
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
