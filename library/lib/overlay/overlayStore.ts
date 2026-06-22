import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools } from "zustand/middleware"
import {
  type Insets,
  type OverlayControl,
  type OverlayRegion,
  type OverlaySide,
  ZERO_INSETS,
} from "./types"

/** Which edges a region can push the diagram away from. */
const REGION_SIDES: Record<OverlayRegion, OverlaySide[]> = {
  header: ["top"],
  "top-left": ["top"],
  "top-center": ["top"],
  "top-right": ["top"],
  "bottom-left": ["bottom"],
  "bottom-center": ["bottom"],
  "bottom-right": ["bottom"],
  "left-rail": ["left"],
  "right-rail": ["right"],
  "on-canvas": [],
}

/**
 * Per-control reserved px per side, combining its declared `inset` config with
 * the measured rect (written by the shared ResizeObserver). `"auto"` resolves to
 * the measured value for the side; explicit numbers win.
 */
function controlContribution(
  control: OverlayControl,
  measured: Partial<Record<OverlaySide, number>> | undefined
): Partial<Record<OverlaySide, number>> {
  const { inset, region } = control
  if (inset === undefined) return {}
  const out: Partial<Record<OverlaySide, number>> = {}

  if (inset === "auto") {
    for (const side of REGION_SIDES[region]) out[side] = measured?.[side] ?? 0
    return out
  }
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

const recompute = (
  controls: Record<string, OverlayControl>,
  measured: Record<string, Partial<Record<OverlaySide, number>>>
): Insets => computeInsets(Object.values(controls), measured)

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
              return { controls, insets: recompute(controls, s.measured) }
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
                insets: recompute(controls, measured),
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
              return { measured, insets: recompute(s.controls, measured) }
            },
            undefined,
            "setMeasured"
          ),
      }),
      { name: "OverlayStore", enabled: import.meta.env?.DEV ?? false }
    )
  )
