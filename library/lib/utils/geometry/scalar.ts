import { CANVAS } from "./routingConstants"

/** Constrain `v` to `[lo, hi]`. */
export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v))

/**
 * Whether tuple `a` sorts before `b` lexicographically. Both are ranking keys — a
 * winner is the one with the smallest such tuple — so this is `<`, not `<=`: equal
 * tuples are not "less", and the caller keeps the first-seen winner on a tie.
 *
 * Reads only `a.length` slots, so comparing tuples of different lengths is a bug the
 * caller must avoid; every ranking key in a given comparison is built the same width.
 */
export const lexLess = (
  a: readonly number[],
  b: readonly number[]
): boolean => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i]
  }
  return false
}

/**
 * On-screen scale for canvas affordances that must stay grabbable when zoomed out
 * without looking undersized when zoomed in:
 *
 *   zoom <= 1 → 1/zoom → counter-scales, so the affordance holds a constant
 *               on-screen size (zoom floored to the canvas minimum)
 *   zoom  > 1 → 1      → natural flow size, so it grows with the node it sits on
 *
 * Reduce with this inside a Zustand selector rather than selecting the raw zoom:
 * the result is exactly 1 for every zoom >= 1, so zooming in re-renders nothing.
 */
export const getHandleScreenScale = (zoom: number): number => {
  const safeZoom = Math.max(
    Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
    CANVAS.MIN_SCALE_TO_ZOOM_OUT
  )
  return 1 / Math.min(safeZoom, 1)
}
