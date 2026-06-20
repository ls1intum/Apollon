import { describe, expect, it } from "vitest"
import { computeInsets, createOverlayStore } from "@/overlay/overlayStore"
import { type OverlayControl } from "@/overlay/types"

const control = (over: Partial<OverlayControl>): OverlayControl => ({
  id: "c",
  region: "header",
  source: "imperative",
  render: () => null,
  ...over,
})

describe("computeInsets", () => {
  it("reserves nothing without controls", () => {
    expect(computeInsets([], {}, {})).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })
  })

  it("applies explicit per-side insets", () => {
    const c = control({ id: "h", region: "header", inset: { top: 40 } })
    expect(computeInsets([c], {}, {})).toMatchObject({ top: 40 })
  })

  it("resolves auto insets from the measured rect on the region's side", () => {
    const c = control({ id: "rail", region: "left-rail", inset: "auto" })
    const insets = computeInsets([c], { rail: { left: 64 } }, {})
    expect(insets.left).toBe(64)
    expect(insets.right).toBe(0)
  })

  it("takes the max within a side, never the sum", () => {
    const a = control({ id: "a", region: "header", inset: { top: 40 } })
    const b = control({ id: "b", region: "top-left", inset: { top: 60 } })
    expect(computeInsets([a, b], {}, {}).top).toBe(60)
  })

  it("adds the manual floor on top of the largest reservation", () => {
    const c = control({ id: "h", region: "header", inset: { top: 40 } })
    expect(computeInsets([c], {}, { top: 10 }).top).toBe(50)
  })

  it("ignores non-reserving regions", () => {
    const c = control({ id: "g", region: "in-front", inset: "auto" })
    expect(computeInsets([c], { g: { top: 999 } }, {})).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })
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

  it("unregister removes the control and its measured rect", () => {
    const store = createOverlayStore()
    store.getState().register(control({ id: "x" }))
    store.getState().setMeasured("x", { top: 10 })
    store.getState().unregister("x")
    expect(store.getState().controls.x).toBeUndefined()
    expect(store.getState().measured.x).toBeUndefined()
  })

  it("setManualInset sets and clears a side", () => {
    const store = createOverlayStore()
    store.getState().setManualInset("right", 24)
    expect(store.getState().manualInsets.right).toBe(24)
    store.getState().setManualInset("right", null)
    expect(store.getState().manualInsets.right).toBeUndefined()
  })

  it("recomputes insets synchronously on every mutation (single authority)", () => {
    const store = createOverlayStore()
    expect(store.getState().insets).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })
    store
      .getState()
      .register(control({ id: "h", region: "header", inset: { top: 40 } }))
    expect(store.getState().insets.top).toBe(40)
    store.getState().setManualInset("right", 24)
    expect(store.getState().insets.right).toBe(24)
    store.getState().unregister("h")
    expect(store.getState().insets.top).toBe(0)
    expect(store.getState().insets.right).toBe(24) // manual floor survives
  })

  it("excludes statically-hidden controls (visible:false) from insets", () => {
    const store = createOverlayStore()
    store
      .getState()
      .register(
        control({
          id: "h",
          region: "header",
          inset: { top: 40 },
          visible: false,
        })
      )
    expect(store.getState().insets.top).toBe(0)
  })
})
