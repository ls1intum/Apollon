/**
 * Reposition a swimlane child when the swimlane's orientation flips and its
 * width and height swap.
 *
 * Transposing the child's top-left corner (x,y)->(y,x) makes it track the axis
 * flip, but the corner alone isn't enough: a child whose long side ran along
 * the old primary axis can land past the new (shorter) cross-axis edge, because
 * there is no React Flow `extent` clamping children to the parent. So clamp the
 * transposed corner into the swapped frame using the child's own size — the
 * child stays inside the frame instead of being stranded outside it.
 *
 * `newWidth`/`newHeight` are the swimlane's dimensions *after* the swap
 * (i.e. the old height and old width respectively).
 */
export const flipSwimlaneChildPosition = (
  child: {
    position: { x: number; y: number }
    width?: number
    height?: number
  },
  newWidth: number,
  newHeight: number
): { x: number; y: number } => {
  const childWidth = child.width ?? 0
  const childHeight = child.height ?? 0
  return {
    x: Math.min(
      Math.max(child.position.y, 0),
      Math.max(newWidth - childWidth, 0)
    ),
    y: Math.min(
      Math.max(child.position.x, 0),
      Math.max(newHeight - childHeight, 0)
    ),
  }
}
