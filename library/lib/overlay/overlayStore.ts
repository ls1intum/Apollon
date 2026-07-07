import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools } from "zustand/middleware"
import {
  type Insets,
  type OverlayControl,
  type OverlayRegion,
  type OverlaySide,
  REGION_EDGE,
  ZERO_INSETS,
} from "./types"

/**
 * Reservation is two-tier: a BAND owns a full edge and displaces the diagram; a
 * corner SLOT floats over the canvas and reserves nothing by default (which keeps
 * a bottom-corner cluster from shortening the palette it never touches). A slot
 * can opt in with an explicit `inset`, whose `"auto"` measures the region's edge.
 */
const BANDS = new Set<OverlayRegion>([
  "header",
  "footer",
  "left-rail",
  "right-rail",
])

/**
 * Per-control reserved px per side. By default a band reserves its measured
 * cross-size on its one edge and a slot reserves nothing; an explicit `inset`
 * overrides — `"auto"` measures the region's edge, an object sets per-side px
 * (with per-side `"auto"` measured). This feeds the fitView camera padding, so a
 * slot must contribute 0 or it couples unrelated chrome into the fit.
 */
function controlContribution(
  control: OverlayControl,
  measured: Partial<Record<OverlaySide, number>> | undefined
): Partial<Record<OverlaySide, number>> {
  const { inset, region } = control
  const edge = REGION_EDGE[region]

  if (inset === undefined) {
    return BANDS.has(region) && edge ? { [edge]: measured?.[edge] ?? 0 } : {}
  }
  if (inset === "auto") {
    return edge ? { [edge]: measured?.[edge] ?? 0 } : {}
  }
  const out: Partial<Record<OverlaySide, number>> = {}
  for (const side of Object.keys(inset) as OverlaySide[]) {
    const v = inset[side]
    out[side] = v === "auto" ? (measured?.[side] ?? 0) : (v ?? 0)
  }
  return out
}

/**
 * Content-inset rect. Every band control participates in its edge's lane
 * stacking (so reservation always matches what paints, since band controls always
 * render inside the lane flow): the lane's reservation is the MAX across its
 * controls (side-by-side chrome doesn't double count), and the band's total is
 * the SUM across lanes (stacked bars each get room). An explicit `inset` on a band
 * control just sets that control's lane contribution instead of measuring it —
 * it never leaves the stack. Slots combine by `max` per side, so unrelated
 * floating chrome never couples. Controls hidden with `visible: false` reserve
 * nothing. Recomputed on every mutation so the rect is reliable without a render.
 */
export function computeInsets(
  controls: OverlayControl[],
  measured: Record<string, Partial<Record<OverlaySide, number>>>
): Insets {
  const result: Insets = { ...ZERO_INSETS }
  // Per band edge, the max reservation seen in each lane; summed in at the end.
  const laneMax: Partial<Record<OverlaySide, Map<number, number>>> = {}
  for (const control of controls) {
    if (control.visible === false) continue
    const contribution = controlContribution(control, measured[control.id])
    if (BANDS.has(control.region)) {
      const edge = REGION_EDGE[control.region]
      if (!edge) continue
      const lane = control.lane ?? 0
      const perLane = (laneMax[edge] ??= new Map())
      perLane.set(
        lane,
        Math.max(perLane.get(lane) ?? 0, contribution[edge] ?? 0)
      )
      continue
    }
    for (const side of Object.keys(contribution) as OverlaySide[]) {
      result[side] = Math.max(result[side], contribution[side] ?? 0)
    }
  }
  for (const side of Object.keys(laneMax) as OverlaySide[]) {
    let summed = 0
    for (const v of laneMax[side]!.values()) summed += v
    result[side] = Math.max(result[side], summed)
  }
  return result
}

const insetsEqual = (a: Insets, b: Insets): boolean =>
  a.top === b.top &&
  a.right === b.right &&
  a.bottom === b.bottom &&
  a.left === b.left

const measuredEqual = (
  a: Partial<Record<OverlaySide, number>> | undefined,
  b: Partial<Record<OverlaySide, number>>
): boolean =>
  (a?.top ?? 0) === (b.top ?? 0) &&
  (a?.right ?? 0) === (b.right ?? 0) &&
  (a?.bottom ?? 0) === (b.bottom ?? 0) &&
  (a?.left ?? 0) === (b.left ?? 0)

/** Recompute the inset rect, reusing the previous object when values are
 *  unchanged so `insets` subscribers (CSS vars, fitView) don't re-render when a
 *  registration only swaps a renderer or restacks same-size chrome. */
const recompute = (
  prev: Insets,
  controls: Record<string, OverlayControl>,
  measured: Record<string, Partial<Record<OverlaySide, number>>>
): Insets => {
  const next = computeInsets(Object.values(controls), measured)
  return insetsEqual(prev, next) ? prev : next
}

export type OverlayStore = {
  controls: Record<string, OverlayControl>
  /** Measured rects per control id (written by the shared ResizeObserver). */
  measured: Record<string, Partial<Record<OverlaySide, number>>>
  /** Reserved room per edge — the camera reservation `fitView` pads against. */
  insets: Insets

  register: (control: OverlayControl) => void
  unregister: (id: string) => void
  setMeasured: (id: string, rect: Partial<Record<OverlaySide, number>>) => void
}

const initialState = {
  controls: {} as Record<string, OverlayControl>,
  measured: {} as Record<string, Partial<Record<OverlaySide, number>>>,
  insets: ZERO_INSETS,
}

export const createOverlayStore = (): UseBoundStore<StoreApi<OverlayStore>> =>
  create<OverlayStore>()(
    devtools(
      (set) => ({
        ...initialState,

        register: (control) =>
          set(
            (s) => {
              const controls = { ...s.controls, [control.id]: control }
              return {
                controls,
                insets: recompute(s.insets, controls, s.measured),
              }
            },
            undefined,
            "register"
          ),

        unregister: (id) =>
          set(
            (s) => {
              if (!(id in s.controls)) return s
              const controls = { ...s.controls }
              const measured = { ...s.measured }
              delete controls[id]
              delete measured[id]
              return {
                controls,
                measured,
                insets: recompute(s.insets, controls, measured),
              }
            },
            undefined,
            "unregister"
          ),

        setMeasured: (id, rect) =>
          set(
            (s) => {
              // Ignore measurements for an unregistered id so an orphan rect
              // can never leak into the computed insets.
              if (!(id in s.controls)) return s
              if (measuredEqual(s.measured[id], rect)) return s
              const measured = { ...s.measured, [id]: rect }
              return {
                measured,
                insets: recompute(s.insets, s.controls, measured),
              }
            },
            undefined,
            "setMeasured"
          ),
      }),
      { name: "OverlayStore", enabled: import.meta.env?.DEV ?? false }
    )
  )
