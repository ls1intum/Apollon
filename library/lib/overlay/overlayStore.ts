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

/**
 * The bottom corners clear a side rail only where the rail actually reaches down
 * to them. A rail is top-anchored, so the top corners always meet it (that stays
 * `insets.left/right`), but a rail that ends well above the bottom leaves the
 * bottom corners free — this is what stops a top-anchored palette from shoving the
 * bottom-left zoom cluster right across an empty column (the wasted-space bug).
 *
 * The decision is made from the rail's REAL geometry: `railGaps` is the measured
 * px between each rail's bottom edge and the container's bottom edge. We compare
 * that to `CORNER_CLUSTER_H` — the room a bottom corner cluster (a zoom/minimap
 * island plus its edge margin) needs. Measuring the gap directly, rather than
 * reconstructing it from the rail height minus the top/bottom band insets, keeps
 * the result stable when an unrelated band inset (e.g. a host header still
 * settling its measurement) shifts the rail's position without changing the gap.
 */
const CORNER_CLUSTER_H = 60

export type FarCorners = { left: number; right: number }
export const ZERO_FAR_CORNERS: FarCorners = { left: 0, right: 0 }

const farCornersEqual = (a: FarCorners, b: FarCorners): boolean =>
  a.left === b.left && a.right === b.right

/** Cross-size a bottom corner must clear on each rail side (0 = rail ends clear of
 *  the bottom, so the corner floats flush). `railGaps[id]` = measured px from that
 *  rail's bottom to the container bottom. */
export function computeFarCorners(
  insets: Insets,
  controls: OverlayControl[],
  railGaps: Record<string, number>
): FarCorners {
  const reaches = (side: "left" | "right"): boolean => {
    if (insets[side] <= 0) return false
    const region = side === "left" ? "left-rail" : "right-rail"
    let minGap = Number.POSITIVE_INFINITY
    for (const c of controls) {
      if (c.visible === false || c.region !== region) continue
      const gap = railGaps[c.id]
      if (gap !== undefined) minGap = Math.min(minGap, gap)
    }
    // No measured rail (or all unmeasured) → can't say it reaches → stay flush.
    return minGap < CORNER_CLUSTER_H
  }
  return {
    left: reaches("left") ? insets.left : 0,
    right: reaches("right") ? insets.right : 0,
  }
}

/**
 * Recompute the derived layout products (camera `insets` + extent-aware
 * `farCorners`), reusing the previous objects when values are unchanged so
 * subscribers (CSS vars, fitView) don't re-render when a registration only swaps a
 * renderer or restacks same-size chrome.
 */
const recompute = (
  prevInsets: Insets,
  prevFar: FarCorners,
  controls: Record<string, OverlayControl>,
  measured: Record<string, Partial<Record<OverlaySide, number>>>,
  railGaps: Record<string, number>
): { insets: Insets; farCorners: FarCorners } => {
  const list = Object.values(controls)
  const nextInsets = computeInsets(list, measured)
  const insets = insetsEqual(prevInsets, nextInsets) ? prevInsets : nextInsets
  const nextFar = computeFarCorners(insets, list, railGaps)
  const farCorners = farCornersEqual(prevFar, nextFar) ? prevFar : nextFar
  return { insets, farCorners }
}

export type OverlayStore = {
  controls: Record<string, OverlayControl>
  /** Measured rects per control id (written by the shared ResizeObserver). */
  measured: Record<string, Partial<Record<OverlaySide, number>>>
  /** Measured px from each rail's bottom edge to the container's bottom edge —
   *  how far a rail falls short of the bottom, used to free the bottom corners it
   *  doesn't reach. */
  railGaps: Record<string, number>
  /** Derived content-inset rect (per-edge union) — the CAMERA reservation that
   *  `fitView` pads against. Recomputed on every registry mutation. */
  insets: Insets
  /** Derived cross-size each BOTTOM corner must clear per rail side — extent-aware,
   *  so a short rail leaves its far corners flush to the edge. */
  farCorners: FarCorners

  register: (control: OverlayControl) => void
  unregister: (id: string) => void
  setMeasured: (id: string, rect: Partial<Record<OverlaySide, number>>) => void
  setRailGap: (id: string, gap: number) => void
}

const initialState = {
  controls: {} as Record<string, OverlayControl>,
  measured: {} as Record<string, Partial<Record<OverlaySide, number>>>,
  railGaps: {} as Record<string, number>,
  insets: ZERO_INSETS,
  farCorners: ZERO_FAR_CORNERS,
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
                ...recompute(
                  s.insets,
                  s.farCorners,
                  controls,
                  s.measured,
                  s.railGaps
                ),
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
              const railGaps = { ...s.railGaps }
              delete controls[id]
              delete measured[id]
              delete railGaps[id]
              return {
                controls,
                measured,
                railGaps,
                ...recompute(
                  s.insets,
                  s.farCorners,
                  controls,
                  measured,
                  railGaps
                ),
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
                ...recompute(
                  s.insets,
                  s.farCorners,
                  s.controls,
                  measured,
                  s.railGaps
                ),
              }
            },
            undefined,
            "setMeasured"
          ),

        setRailGap: (id, gap) =>
          set(
            (s) => {
              if (!(id in s.controls) || s.railGaps[id] === gap) return s
              const railGaps = { ...s.railGaps, [id]: gap }
              return {
                railGaps,
                ...recompute(
                  s.insets,
                  s.farCorners,
                  s.controls,
                  s.measured,
                  railGaps
                ),
              }
            },
            undefined,
            "setRailGap"
          ),
      }),
      { name: "OverlayStore", enabled: import.meta.env?.DEV ?? false }
    )
  )
