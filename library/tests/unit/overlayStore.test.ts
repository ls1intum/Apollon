import { describe, expect, it } from "vitest"
import {
  computeFarCorners,
  computeInsets,
  createOverlayStore,
} from "@/overlay/overlayStore"
import {
  type Insets,
  type OverlayControl,
  type OverlayRegion,
} from "@/overlay/types"

const control = (over: Partial<OverlayControl>): OverlayControl => ({
  id: "c",
  region: "header",
  render: () => null,
  ...over,
})

const ctrl = (
  id: string,
  region: OverlayRegion,
  extra: Partial<OverlayControl> = {}
): OverlayControl => ({ id, region, render: () => null, ...extra })

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

// Two-tier chrome: BANDS (header/footer/left-rail/right-rail) reserve their
// cross-size on their one edge; SLOTS (the panel corners) float and reserve
// nothing. This is the model that keeps a bottom-corner control from shortening
// the left-rail palette — the user-reported "it does not adapt" bug. Bands stack
// per lane (lane max within a lane, summed across lanes). Unit the math directly.
describe("computeInsets: band vs slot reservation", () => {
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

  it("a footer band reserves its height on the bottom edge, symmetric to the header", () => {
    expect(
      computeInsets([ctrl("h", "header"), ctrl("f", "footer")], {
        h: { top: 48 },
        f: { bottom: 56 },
      })
    ).toEqual({ top: 48, right: 0, bottom: 56, left: 0 })
  })

  it("a footer band and a bottom-corner slot don't double-count the bottom edge", () => {
    // The footer reserves; the slot floats over it (reserves nothing), so the
    // bottom inset is the footer's height alone — not footer + cluster.
    expect(
      computeInsets([ctrl("f", "footer"), ctrl("z", "bottom-right")], {
        f: { bottom: 56 },
        z: { bottom: 40 },
      }).bottom
    ).toBe(56)
  })

  it("two bars in different lanes STACK — their band insets sum", () => {
    // An exam bar (lane 0) + a 'problem statement changed' banner (lane 1) on the
    // header: independently registered, each gets room, so the top inset is 48+24.
    expect(
      computeInsets(
        [
          ctrl("bar", "header", { lane: 0 }),
          ctrl("banner", "header", { lane: 1 }),
        ],
        { bar: { top: 48 }, banner: { top: 24 } }
      ).top
    ).toBe(72)
  })

  it("two bars in the SAME lane sit side by side — the band reserves the taller", () => {
    expect(
      computeInsets(
        [ctrl("a", "header"), ctrl("b", "header")], // both default lane 0
        { a: { top: 48 }, b: { top: 32 } }
      ).top
    ).toBe(48)
  })

  it("lane summing is per band edge; opposite bands stay independent", () => {
    expect(
      computeInsets(
        [
          ctrl("h0", "header", { lane: 0 }),
          ctrl("h1", "header", { lane: 1 }),
          ctrl("f", "footer"),
        ],
        { h0: { top: 40 }, h1: { top: 20 }, f: { bottom: 50 } }
      )
    ).toEqual({ top: 60, right: 0, bottom: 50, left: 0 })
  })

  it("an explicit inset on a band control sets its lane reservation (still stacked)", () => {
    // A band control always renders in the lane flow, so its reservation always
    // stacks — an explicit inset just sets THIS control's contribution (a fixed
    // 30px) instead of measuring it. Reservation must match paint: 48 + 30 = 78.
    expect(
      computeInsets(
        [
          ctrl("auto", "header", { lane: 0 }),
          ctrl("fixed", "header", { lane: 1, inset: { top: 30 } }),
        ],
        { auto: { top: 48 } }
      ).top
    ).toBe(78)
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

// The core of the extent-aware corner fix. The camera `insets` reserve the rail's
// full width on the left edge (correct — content must clear it), but a BOTTOM
// corner should only clear the rail where it actually reaches DOWN to it. The
// decision uses the rail's real geometry: `railGaps[id]` = measured px from the
// rail's bottom to the container bottom. A small gap ⇒ the rail reaches the corner
// (clear it); a large gap ⇒ the rail ends high, so the corner sits flush. Measuring
// the gap (not reconstructing it from insets) keeps it stable when an unrelated
// band inset shifts the rail's position without changing where its bottom lands.
describe("computeFarCorners (extent-aware bottom-corner clearance)", () => {
  const insets = (over: Partial<Insets> = {}): Insets => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...over,
  })
  const rail = (id: string, side: "left" | "right"): OverlayControl =>
    ctrl(id, side === "left" ? "left-rail" : "right-rail")

  it("frees a bottom corner when the rail ends well above it (the wasted-space bug)", () => {
    // A ~300px gap below the palette — far more than a corner cluster needs — so
    // the bottom-left corner clears NOTHING and the zoom cluster sits flush.
    const far = computeFarCorners(
      insets({ left: 150 }),
      [rail("pal", "left")],
      {
        pal: 300,
      }
    )
    expect(far.left).toBe(0)
  })

  it("clears the rail when it reaches down to the far corner", () => {
    // A full-height left rail (e.g. a version-history panel) ends ~10px from the
    // bottom, so the bottom-left corner must clear its full width or they'd overlap.
    const far = computeFarCorners(
      insets({ left: 150 }),
      [rail("hist", "left")],
      {
        hist: 10,
      }
    )
    expect(far.left).toBe(150)
  })

  it("uses the corner-cluster threshold, not a bare touch test", () => {
    // A 40px gap is smaller than one cluster (~60px), so a flush cluster WOULD
    // overlap → clear. A 90px gap leaves room → flush.
    expect(
      computeFarCorners(insets({ left: 150 }), [rail("r", "left")], { r: 40 })
        .left
    ).toBe(150)
    expect(
      computeFarCorners(insets({ left: 150 }), [rail("r", "left")], { r: 90 })
        .left
    ).toBe(0)
  })

  it("resolves each side independently", () => {
    // Short left palette (frees bottom-left), full-height right rail (clears
    // bottom-right) — the two far corners are decided separately.
    const far = computeFarCorners(
      insets({ left: 150, right: 120 }),
      [rail("pal", "left"), rail("hist", "right")],
      { pal: 300, hist: 10 }
    )
    expect(far).toEqual({ left: 0, right: 120 })
  })

  it("is zero when the edge reserves nothing or the rail is unmeasured", () => {
    expect(
      computeFarCorners(insets(), [rail("p", "left")], { p: 10 }).left
    ).toBe(0)
    // No measured gap yet (pre-layout) → can't decide, so stay flush (0), never
    // guess a clearance that would jump the cluster on first paint.
    expect(
      computeFarCorners(insets({ left: 150 }), [rail("p", "left")], {}).left
    ).toBe(0)
  })

  it("ignores a hidden rail", () => {
    const far = computeFarCorners(
      insets({ left: 150 }),
      [ctrl("p", "left-rail", { visible: false })],
      { p: 10 }
    )
    // The hidden rail contributes no extent, so nothing reaches the corner.
    expect(far.left).toBe(0)
  })

  it("is wired into the store: setRailGap drives farCorners", () => {
    const store = createOverlayStore()
    store.getState().register(rail("pal", "left"))
    store.getState().setMeasured("pal", { left: 150 })
    // Short palette (big gap below) → bottom-left free, though the camera inset
    // still reserves 150 for content framing.
    store.getState().setRailGap("pal", 300)
    expect(store.getState().insets.left).toBe(150)
    expect(store.getState().farCorners.left).toBe(0)

    // The palette grows to reach the bottom (tiny gap) → the far corner must clear.
    store.getState().setRailGap("pal", 10)
    expect(store.getState().farCorners.left).toBe(150)
  })

  it("stays flush when an unrelated band inset shifts the rail but not its gap", () => {
    // The regression this design prevents: a host header's inset settling from 0
    // to 56 shifts the rail down, but the measured gap below the rail is what
    // matters — as long as the rail still ends clear of the bottom, the corner
    // stays flush (no jump).
    const store = createOverlayStore()
    store.getState().register(rail("pal", "left"))
    store.getState().setMeasured("pal", { left: 150 })
    store.getState().setRailGap("pal", 122) // header inset 0: gap large
    expect(store.getState().farCorners.left).toBe(0)
    store.getState().setRailGap("pal", 66) // header pushed rail down; still clear
    expect(store.getState().farCorners.left).toBe(0)
  })
})
