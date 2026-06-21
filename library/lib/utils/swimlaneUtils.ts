import type { SwimlaneLane } from "@/types"

/** Smallest a lane may be shrunk to (flow px) when dragging a separator. */
export const MIN_LANE_EXTENT = 40

/**
 * Each lane's share of the primary axis as a fraction summing to 1. Lanes
 * without an explicit `size` divide the remaining space equally, so a freshly
 * dropped (size-less) swimlane renders as equal lanes and a back-filled one
 * keeps its weights.
 */
export const laneFractions = (lanes: { size?: number }[]): number[] => {
  const n = lanes.length || 1
  const raw = lanes.map((l) => (l.size && l.size > 0 ? l.size : 1 / n))
  const total = raw.reduce((a, b) => a + b, 0) || 1
  return raw.map((r) => r / total)
}

/** Pixel `start`/`extent` of every lane along the primary axis. */
export const getLaneOffsets = (
  lanes: { size?: number }[],
  primaryExtent: number
): { start: number; extent: number }[] => {
  let acc = 0
  return laneFractions(lanes).map((f) => {
    const extent = f * primaryExtent
    const start = acc
    acc += extent
    return { start, extent }
  })
}

/**
 * Balanced resize of the divider between lane `index` and `index + 1`: grow one
 * by `deltaFraction` and shrink the other by the same amount, conserving the
 * total so the swimlane's outer size never changes. Neither lane drops below
 * `minFraction`. Returns lanes with an explicit `size` on every entry.
 */
export const resizeLaneDivider = (
  lanes: SwimlaneLane[],
  index: number,
  deltaFraction: number,
  minFraction: number
): SwimlaneLane[] => {
  const fractions = laneFractions(lanes)
  if (index < 0 || index >= fractions.length - 1) return lanes
  let delta = deltaFraction
  delta = Math.max(delta, minFraction - fractions[index])
  delta = Math.min(delta, fractions[index + 1] - minFraction)
  fractions[index] += delta
  fractions[index + 1] -= delta
  return lanes.map((lane, i) => ({ ...lane, size: fractions[i] }))
}

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
