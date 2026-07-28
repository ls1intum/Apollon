import type { ReactFlowInstance } from "@xyflow/react"
import { insetAwareFitView } from "@/overlay/fitView"
import {
  ZERO_INSETS,
  type ApollonFitViewOptions,
  type Insets,
} from "@/overlay/types"

export const ARRANGE_FIT_VIEW_DURATION_MS = 200

/**
 * Locally frame a successfully arranged diagram. Model layout stays independent
 * from this camera policy; callers invoke it only when node positions changed.
 */
export const fitArrangedDiagram = (
  reactFlow: Pick<ReactFlowInstance, "fitView">,
  insets: Insets,
  safeArea: Insets,
  option: boolean | ApollonFitViewOptions | undefined = true
): void => {
  if (option === false) return
  const options = typeof option === "object" ? option : undefined
  insetAwareFitView(
    reactFlow,
    options?.respectInsets === false ? ZERO_INSETS : insets,
    safeArea,
    {
      padding: options?.padding,
      duration: options?.duration ?? ARRANGE_FIT_VIEW_DURATION_MS,
    }
  )
}
