import type { ReactFlowInstance } from "@xyflow/react"
import { ZERO_INSETS, type Insets, type OverlaySide } from "./types"

/** Base breathing room added to every side on top of the reserved inset. */
const GUTTER = 16

/**
 * Frame the diagram MapLibre-style: reserve the overlay insets (header, rails,
 * palette, minimap, …) as per-side padding so no node is fitted underneath the
 * chrome. `padding` as a per-side object overrides the base gutter on that side;
 * as a number it sets the fraction used when nothing is reserved. With no reserved
 * chrome and no per-side override it falls back to a plain fraction fit —
 * byte-identical to an editor that registers no overlays. The single fit routine
 * behind `ApollonEditor.fitView` (and thus the on-init fit) and the zoom cluster's
 * fit button, so both make way identically.
 */
export function insetAwareFitView(
  rf: Pick<ReactFlowInstance, "fitView">,
  insets: Insets = ZERO_INSETS,
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
  const hasInsets = insets.top || insets.right || insets.bottom || insets.left

  if (!hasInsets && !override) {
    rf.fitView({ padding: fraction, duration, maxZoom })
    return
  }

  rf.fitView({
    padding: {
      top: `${insets.top + (override?.top ?? GUTTER)}px`,
      right: `${insets.right + (override?.right ?? GUTTER)}px`,
      bottom: `${insets.bottom + (override?.bottom ?? GUTTER)}px`,
      left: `${insets.left + (override?.left ?? GUTTER)}px`,
    },
    duration,
    maxZoom,
  })
}
