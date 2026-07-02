import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools } from "zustand/middleware"
import {
  type Insets,
  type OverlayControl,
  type OverlayRegion,
  type OverlaySide,
  ZERO_INSETS,
} from "./types"

/**
 * Two-tier chrome. A BAND owns a full edge and displaces the diagram; a SLOT (a
 * React-Flow panel corner) floats over the canvas and displaces nothing. Only
 * bands reserve room by default — this is what keeps a bottom-corner cluster from
 * shortening the left-rail palette it never touches. The primary edge is also the
 * one an explicit `inset: "auto"` opt-in measures against.
 */
const BANDS = new Set<OverlayRegion>([
  "header",
  "footer",
  "left-rail",
  "right-rail",
])

const REGION_EDGE: Partial<Record<OverlayRegion, OverlaySide>> = {
  header: "top",
  footer: "bottom",
  "top-left": "top",
  "top-center": "top",
  "top-right": "top",
  "bottom-left": "bottom",
  "bottom-center": "bottom",
  "bottom-right": "bottom",
  "left-rail": "left",
  "right-rail": "right",
}

/**
 * Per-control reserved px per side. By default a band reserves its measured
 * cross-size on its one edge and a slot reserves nothing; an explicit `inset`
 * overrides — `"auto"` measures the region's edge, an object sets per-side px
 * (with per-side `"auto"` measured). This drives fitView padding AND band
 * positioning, so slots must contribute 0 or they couple unrelated chrome.
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
 * Content-inset rect: per side, the largest reservation among visible controls
 * touching that side. `max` (not sum) avoids double-counting nested/stacked
 * chrome. Controls hidden with `visible: false` reserve nothing. Recomputed on
 * every mutation so the rect is reliable without a render.
 */
export function computeInsets(
  controls: OverlayControl[],
  measured: Record<string, Partial<Record<OverlaySide, number>>>
): Insets {
  const result: Insets = { ...ZERO_INSETS }
  for (const control of controls) {
    if (control.visible === false) continue
    const contribution = controlContribution(control, measured[control.id])
    for (const side of Object.keys(contribution) as OverlaySide[]) {
      result[side] = Math.max(result[side], contribution[side] ?? 0)
    }
  }
  return result
}

const insetsEqual = (a: Insets, b: Insets): boolean =>
  a.top === b.top &&
  a.right === b.right &&
  a.bottom === b.bottom &&
  a.left === b.left

/**
 * Recompute the inset rect, reusing the previous object when the values are
 * unchanged. Identity stability lets `insets` subscribers (App's CSS vars,
 * fitView) skip re-rendering when a registration only replaces a control's
 * renderer or restacks same-size chrome — so re-applying a config literal never
 * thrashes layout, without a parallel reconciliation layer.
 */
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
  /** Derived content-inset rect — recomputed on every registry mutation. */
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
