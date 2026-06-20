import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools } from "zustand/middleware"
import {
  type ApollonDisplayOptions,
  type Insets,
  type OverlayBreakpoint,
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
  "center-left": ["left"],
  "right-rail": ["right"],
  "center-right": ["right"],
  "in-front": [],
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
  const regionSides = REGION_SIDES[region]
  const out: Partial<Record<OverlaySide, number>> = {}

  if (inset === "auto") {
    for (const side of regionSides) out[side] = measured?.[side] ?? 0
    return out
  }
  if (Array.isArray(inset)) {
    for (const side of inset) out[side] = measured?.[side] ?? 0
    return out
  }
  for (const side of Object.keys(inset) as OverlaySide[]) {
    const v = inset[side]
    out[side] = v === "auto" ? (measured?.[side] ?? 0) : (v ?? 0)
  }
  return out
}

/**
 * The single content-inset authority: per side, the manual floor PLUS the
 * largest reservation among visible controls touching that side. `max` (not
 * sum) within a side avoids double-counting nested/stacked chrome; a host that
 * truly needs two summed bands raises the manual floor via `setInset`.
 */
export function computeInsets(
  controls: OverlayControl[],
  measured: Record<string, Partial<Record<OverlaySide, number>>>,
  manualInsets: Partial<Record<OverlaySide, number>>
): Insets {
  const result: Insets = {
    top: manualInsets.top ?? 0,
    right: manualInsets.right ?? 0,
    bottom: manualInsets.bottom ?? 0,
    left: manualInsets.left ?? 0,
  }
  for (const control of controls) {
    const contribution = controlContribution(control, measured[control.id])
    for (const side of Object.keys(contribution) as OverlaySide[]) {
      const base = manualInsets[side] ?? 0
      result[side] = Math.max(result[side], base + (contribution[side] ?? 0))
    }
  }
  return result
}

/**
 * Inset rect from the current registry state. Controls explicitly hidden
 * (`visible: false`) reserve nothing; function-based visibility is treated as
 * visible here (resolved accurately by OverlayLayer, which republishes the
 * visibility-filtered rect when mounted). Keeping this in the store means
 * `setInset`/`addControl` reflect in `getInsets()` synchronously — without
 * waiting for a render — so the imperative API is reliable headless.
 */
function recomputeInsets(
  controls: Record<string, OverlayControl>,
  measured: Record<string, Partial<Record<OverlaySide, number>>>,
  manualInsets: Partial<Record<OverlaySide, number>>
): Insets {
  return computeInsets(
    Object.values(controls).filter((c) => c.visible !== false),
    measured,
    manualInsets
  )
}

export type OverlayStore = {
  controls: Record<string, OverlayControl>
  /** Measured rects per control id (written by the shared ResizeObserver). */
  measured: Record<string, Partial<Record<OverlaySide, number>>>
  /** Explicit per-side floor set via `editor.setInset`. */
  manualInsets: Partial<Record<OverlaySide, number>>
  /** Published content-inset rect (recomputed by OverlayLayer). */
  insets: Insets
  breakpoint: OverlayBreakpoint
  display: ApollonDisplayOptions

  register: (control: OverlayControl) => void
  unregister: (id: string) => void
  setMeasured: (id: string, rect: Partial<Record<OverlaySide, number>>) => void
  setManualInset: (side: OverlaySide, px: number | null) => void
  setInsets: (insets: Insets) => void
  setBreakpoint: (bp: OverlayBreakpoint) => void
  setDisplay: (display: Partial<ApollonDisplayOptions>) => void
  reset: () => void
}

const initialState = {
  controls: {} as Record<string, OverlayControl>,
  measured: {} as Record<string, Partial<Record<OverlaySide, number>>>,
  manualInsets: {} as Partial<Record<OverlaySide, number>>,
  insets: ZERO_INSETS,
  breakpoint: "desktop" as OverlayBreakpoint,
  display: {} as ApollonDisplayOptions,
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
                insets: recomputeInsets(controls, s.measured, s.manualInsets),
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
                insets: recomputeInsets(controls, measured, s.manualInsets),
              }
            },
            undefined,
            "unregister"
          ),

        setMeasured: (id, rect) =>
          set(
            (s) => {
              const measured = { ...s.measured, [id]: rect }
              return {
                measured,
                insets: recomputeInsets(s.controls, measured, s.manualInsets),
              }
            },
            undefined,
            "setMeasured"
          ),

        setManualInset: (side, px) =>
          set(
            (s) => {
              const manualInsets = { ...s.manualInsets }
              if (px === null) delete manualInsets[side]
              else manualInsets[side] = px
              return {
                manualInsets,
                insets: recomputeInsets(s.controls, s.measured, manualInsets),
              }
            },
            undefined,
            "setManualInset"
          ),

        setInsets: (insets) =>
          set(
            (s) =>
              s.insets.top === insets.top &&
              s.insets.right === insets.right &&
              s.insets.bottom === insets.bottom &&
              s.insets.left === insets.left
                ? s
                : { insets },
            undefined,
            "setInsets"
          ),

        setBreakpoint: (breakpoint) =>
          set(
            (s) => (s.breakpoint === breakpoint ? s : { breakpoint }),
            undefined,
            "setBreakpoint"
          ),

        setDisplay: (display) =>
          set(
            (s) => ({ display: { ...s.display, ...display } }),
            undefined,
            "setDisplay"
          ),

        reset: () => set(initialState, undefined, "reset"),
      }),
      { name: "OverlayStore", enabled: true }
    )
  )
