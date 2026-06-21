import type { SwimlaneLane } from "@/types"

/** Smallest a lane may be shrunk to (flow px) when dragging a separator. */
export const MIN_LANE_EXTENT = 40

/**
 * Pixel `start`/`extent` of every lane along the primary axis.
 *
 * Lane sizes are stored as absolute flow px. The **last** lane is elastic: it
 * always fills the remaining space. That way resizing the whole swimlane only
 * grows/shrinks the last lane — the interior separators stay put — instead of
 * rescaling every lane (which would move every separator). Lanes with no size
 * at all (a freshly dropped swimlane) divide the axis equally.
 */
export const getLaneOffsets = (
  lanes: { size?: number }[],
  primaryExtent: number
): { start: number; extent: number }[] => {
  const n = lanes.length
  if (n === 0) return []

  let extents: number[]
  if (!lanes.some((l) => l.size != null && l.size > 0)) {
    extents = lanes.map(() => primaryExtent / n)
  } else {
    const inner = lanes.slice(0, n - 1).map((l) => l.size ?? primaryExtent / n)
    let innerSum = inner.reduce((a, b) => a + b, 0)
    // If the interior lanes no longer fit (the swimlane was shrunk hard), scale
    // them down so the last lane keeps at least its minimum.
    const maxInner = primaryExtent - MIN_LANE_EXTENT
    if (innerSum > maxInner && innerSum > 0) {
      const scale = maxInner / innerSum
      for (let i = 0; i < inner.length; i++) inner[i] *= scale
      innerSum = maxInner
    }
    extents = [...inner, Math.max(primaryExtent - innerSum, MIN_LANE_EXTENT)]
  }

  let acc = 0
  return extents.map((extent) => {
    const start = acc
    acc += extent
    return { start, extent }
  })
}

/**
 * Pin every lane's current rendered extent as its `size`, so the elastic last
 * lane gets a concrete value before an operation (reorder/add/remove) that
 * changes which lane is last.
 */
export const materializeLaneSizes = (
  lanes: SwimlaneLane[],
  primaryExtent: number
): SwimlaneLane[] => {
  const offsets = getLaneOffsets(lanes, primaryExtent)
  return lanes.map((lane, i) => ({ ...lane, size: offsets[i].extent }))
}

/** Index of the lane whose range contains the primary-axis coordinate `pos`. */
export const laneIndexAtOffset = (
  offsets: { start: number; extent: number }[],
  pos: number
): number => {
  for (let i = 0; i < offsets.length; i++) {
    if (pos < offsets[i].start + offsets[i].extent) return i
  }
  return Math.max(offsets.length - 1, 0)
}

/**
 * Balanced resize of the divider between lane `index` and `index + 1`: move the
 * shared boundary by `deltaPx`, growing one lane and shrinking the other by the
 * same amount so the swimlane's outer size never changes. Neither lane drops
 * below `MIN_LANE_EXTENT`. Returns lanes with an explicit `size` on every entry.
 */
export const resizeLaneDivider = (
  lanes: SwimlaneLane[],
  index: number,
  deltaPx: number,
  primaryExtent: number
): SwimlaneLane[] => {
  if (index < 0 || index >= lanes.length - 1) return lanes
  const extents = getLaneOffsets(lanes, primaryExtent).map((o) => o.extent)
  let delta = deltaPx
  delta = Math.max(delta, MIN_LANE_EXTENT - extents[index])
  delta = Math.min(delta, extents[index + 1] - MIN_LANE_EXTENT)
  extents[index] += delta
  extents[index + 1] -= delta
  return lanes.map((lane, i) => ({ ...lane, size: extents[i] }))
}

/**
 * Reposition a swimlane child when orientation flips and the swimlane's
 * width/height swap: transpose the child's corner (x,y)->(y,x), then clamp it
 * into the swapped frame by its own size so it can't be stranded off the new
 * (shorter) cross-axis. `newWidth`/`newHeight` are the post-swap dimensions.
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
