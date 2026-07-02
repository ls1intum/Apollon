import type { ReactFlowInstance } from "@xyflow/react"
import { ZERO_INSETS, type Insets, type OverlaySide } from "./types"

/** Base breathing room added to every side on top of the reserved inset. */
const GUTTER = 16

/**
 * Frame the diagram MapLibre-style: reserve the overlay insets (header, rails,
 * palette, minimap, …) as per-side padding so no node is fitted underneath the
 * chrome. With no reserved chrome and no explicit per-side override it falls back
 * to a plain fraction fit — byte-identical to an editor that registers no
 * overlays. Shared by the imperative `ApollonEditor.fitView`, the zoom cluster's
 * fit button, and the initial on-init fit, so all three make way identically.
 */
export function insetAwareFitView(
  rf: Pick<ReactFlowInstance, "fitView">,
  insets: Insets = ZERO_INSETS,
  options?: {
    padding?: Partial<Record<OverlaySide, number>>
    duration?: number
    maxZoom?: number
  }
): void {
  const maxZoom = options?.maxZoom ?? 1.0
  const duration = options?.duration
  const override = options?.padding
  const hasInsets = insets.top || insets.right || insets.bottom || insets.left

  if (!hasInsets && !override) {
    rf.fitView({ padding: 0.15, duration, maxZoom })
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
