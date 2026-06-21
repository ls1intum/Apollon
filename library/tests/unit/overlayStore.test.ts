import { describe, expect, it } from "vitest"
import { computeInsets, createOverlayStore } from "@/overlay/overlayStore"
import { type OverlayControl } from "@/overlay/types"

const control = (over: Partial<OverlayControl>): OverlayControl => ({
  id: "c",
  region: "header",
  render: () => null,
  ...over,
})

describe("computeInsets", () => {
  it("reserves nothing without controls", () => {
    expect(computeInsets([], {})).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })
  })

  it("applies explicit per-side insets", () => {
    const c = control({ region: "header", inset: { top: 40 } })
    expect(computeInsets([c], {}).top).toBe(40)
  })

  it("resolves auto insets from the measured rect on the region's side", () => {
    const c = control({ id: "rail", region: "left-rail", inset: "auto" })
    const insets = computeInsets([c], { rail: { left: 64 } })
    expect(insets.left).toBe(64)
    expect(insets.right).toBe(0)
  })

  it("takes the max within a side, never the sum", () => {
    const a = control({ id: "a", region: "header", inset: { top: 40 } })
    const b = control({ id: "b", region: "top-left", inset: { top: 60 } })
    expect(computeInsets([a, b], {}).top).toBe(60)
  })

  it("excludes statically-hidden controls and non-reserving regions", () => {
    const hidden = control({ id: "h", inset: { top: 40 }, visible: false })
    const onCanvas = control({ id: "g", region: "on-canvas", inset: "auto" })
    expect(computeInsets([hidden, onCanvas], { g: { top: 999 } }).top).toBe(0)
  })
})

describe("overlayStore", () => {
  it("registers and replaces by id (idempotent)", () => {
    const store = createOverlayStore()
    store.getState().register(control({ id: "x", order: 1 }))
    store.getState().register(control({ id: "x", order: 2 }))
    expect(Object.keys(store.getState().controls)).toEqual(["x"])
    expect(store.getState().controls.x.order).toBe(2)
  })

  it("recomputes insets synchronously on register and unregister", () => {
    const store = createOverlayStore()
    store
      .getState()
      .register(control({ id: "h", region: "header", inset: { top: 40 } }))
    expect(store.getState().insets.top).toBe(40)
    store.getState().unregister("h")
    expect(store.getState().insets.top).toBe(0)
    expect(store.getState().measured.h).toBeUndefined()
  })

  it("toggling visible re-releases and restores the reserved inset", () => {
    const store = createOverlayStore()
    const base = { id: "h", region: "header", inset: { top: 40 } } as const
    store.getState().register(control(base))
    expect(store.getState().insets.top).toBe(40)
    store.getState().register(control({ ...base, visible: false }))
    expect(store.getState().insets.top).toBe(0)
    store.getState().register(control({ ...base, visible: true }))
    expect(store.getState().insets.top).toBe(40)
  })
})
