import { Quadrant } from "@/enums"
import { XYPosition } from "@xyflow/react"

// Tiebreak on axis equality: `>=` on both axes means a target sitting
// exactly on the reference line falls into the bottom-right quadrant.
export const getQuadrant = (
  target: XYPosition,
  reference: XYPosition
): Quadrant => {
  const right = target.x >= reference.x
  const bottom = target.y >= reference.y
  if (right && bottom) return Quadrant.BottomRight
  if (!right && bottom) return Quadrant.BottomLeft
  if (right && !bottom) return Quadrant.TopRight
  return Quadrant.TopLeft
}
