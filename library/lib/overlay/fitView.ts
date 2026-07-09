import type { ReactFlowInstance } from "@xyflow/react"
import { ZERO_INSETS, type Insets, type OverlaySide } from "./types"

/** Base breathing room added to every side on top of the reserved inset. */
const GUTTER = 16

const anySide = (i: Insets): boolean =>
  !!(i.top || i.right || i.bottom || i.left)

/**
 * Frame the diagram MapLibre-style. Two reservations stack on each side and are
 * measured independently, so they never double-count:
 *
 * - `insets` — chrome the editor draws (header, rails, palette, an opted-in
 *   corner slot). Measured from the control's own box.
 * - `safeArea` — room the *device* takes (notch, Dynamic Island, home indicator)
 *   plus the soft keyboard. It is the overlay grid's padding, which is where
 *   chrome starts, so a control's measured box never contains it.
 *
 * `padding` as a per-side object overrides the gutter on that side — never the
 * safe area, which is a hard device constraint rather than breathing room. As a
 * number it sets the fraction used when nothing at all is reserved. With no
 * chrome, no safe area and no per-side override this falls back to a plain
 * fraction fit — byte-identical to an editor that registers no overlays. Shared
 * by `ApollonEditor.fitView` and the zoom cluster's fit button so both make way
 * identically.
 */
export function insetAwareFitView(
  rf: Pick<ReactFlowInstance, "fitView">,
  insets: Insets = ZERO_INSETS,
  safeArea: Insets = ZERO_INSETS,
  options?: {
    padding?: number | Partial<Record<OverlaySide, number>>
    duration?: number
    maxZoom?: number
  }
): void {
  const maxZoom = options?.maxZoom ?? 1.0
  const duration = options?.duration
  const padding = options?.padding
  const override = typeof padding === "object" ? padding : undefined
  const fraction = typeof padding === "number" ? padding : 0.15

  if (!anySide(insets) && !anySide(safeArea) && !override) {
    rf.fitView({ padding: fraction, duration, maxZoom })
    return
  }

  const pad = (side: OverlaySide): `${number}px` =>
    `${safeArea[side] + insets[side] + (override?.[side] ?? GUTTER)}px`

  rf.fitView({
    padding: {
      top: pad("top"),
      right: pad("right"),
      bottom: pad("bottom"),
      left: pad("left"),
    },
    duration,
    maxZoom,
  })
}

/**
 * The device safe area, read off the overlay grid's resolved padding — which is
 * exactly where the grid seats its chrome (see `.apollon-overlay-grid` in
 * app.css). Reading the used geometry rather than the `--safe-area-inset-*`
 * custom properties keeps this correct whether the insets come from `env()`, a
 * native shell's injected variables, or the soft keyboard, and always yields px.
 */
export function readSafeArea(grid: HTMLElement | null): Insets {
  if (!grid) return ZERO_INSETS
  const s = getComputedStyle(grid)
  return {
    top: parseFloat(s.paddingTop) || 0,
    right: parseFloat(s.paddingRight) || 0,
    bottom: parseFloat(s.paddingBottom) || 0,
    left: parseFloat(s.paddingLeft) || 0,
  }
}
