/**
 * Memoization Utilities for Edge Components
 *
 * Provides a custom `React.memo` comparison function that prevents unnecessary
 * re-renders of edge components. An edge should only re-render when:
 *   - Its `source`, `target`, `sourceHandleId`, or `targetHandleId` changes
 *   - Its connected node coordinates (`sourceX`, `sourceY`, `targetX`, `targetY`) move
 *   - Its `data.userWaypoints`, `data.points`, or label/color data mutate
 *   - Its `selected` state toggles
 *   - Its `style` or `markerEnd`/`markerStart` change
 *
 * All other props (e.g. store-wide node array mutations on unrelated nodes)
 * are ignored, preventing the O(n) cascade where moving one node triggers
 * a re-render of every single edge on the canvas.
 */

import type { EdgeProps } from "@xyflow/react"

/**
 * Shallow array comparison for point arrays.
 * Returns true if both arrays have the same length and all {x, y} pairs match.
 */
function pointArraysEqual(
  a: Array<{ x: number; y: number }> | undefined,
  b: Array<{ x: number; y: number }> | undefined
): boolean {
  if (a === b) return true
  if (!a || !b) return a === b
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false
  }
  return true
}

/**
 * Custom comparison for `React.memo` wrapping orthogonal edge components.
 *
 * Returns `true` if the component should NOT re-render (props are equal).
 */
export function orthogonalEdgePropsAreEqual(
  prev: EdgeProps,
  next: EdgeProps
): boolean {
  // Structural identity shortcuts
  if (prev.id !== next.id) return false
  if (prev.source !== next.source) return false
  if (prev.target !== next.target) return false
  if (prev.selected !== next.selected) return false

  // Connected node coordinate changes
  if (prev.sourceX !== next.sourceX) return false
  if (prev.sourceY !== next.sourceY) return false
  if (prev.targetX !== next.targetX) return false
  if (prev.targetY !== next.targetY) return false

  // Handle changes
  if (prev.sourceHandleId !== next.sourceHandleId) return false
  if (prev.targetHandleId !== next.targetHandleId) return false

  // Source/target positions
  if (prev.sourcePosition !== next.sourcePosition) return false
  if (prev.targetPosition !== next.targetPosition) return false

  // Marker changes
  if (prev.markerEnd !== next.markerEnd) return false
  if (prev.markerStart !== next.markerStart) return false

  // Data deep comparison (only the fields we care about)
  const prevData = prev.data as Record<string, any> | undefined
  const nextData = next.data as Record<string, any> | undefined

  if (prevData !== nextData) {
    if (!prevData || !nextData) return false

    // Check routing mode
    if (prevData.routingMode !== nextData.routingMode) return false

    // Check waypoints
    if (!pointArraysEqual(prevData.userWaypoints, nextData.userWaypoints))
      return false

    // Check legacy points
    if (!pointArraysEqual(prevData.points, nextData.points)) return false

    // Label / multiplicity / role / color fields rendered directly by the
    // edge or its label children. If any of these change, the edge needs to
    // re-render so its visible text/colors update.
    const dataFields = [
      "label",
      "sourceRole",
      "targetRole",
      "sourceMultiplicity",
      "targetMultiplicity",
      "strokeColor",
      "textColor",
    ]
    for (const key of dataFields) {
      if (prevData[key] !== nextData[key]) return false
    }
  }

  // Style comparison (shallow object check)
  if (prev.style !== next.style) {
    if (!prev.style || !next.style) return false
    const prevStyleKeys = Object.keys(prev.style)
    const nextStyleKeys = Object.keys(next.style)
    if (prevStyleKeys.length !== nextStyleKeys.length) return false
    for (const key of prevStyleKeys) {
      if (
        (prev.style as Record<string, any>)[key] !==
        (next.style as Record<string, any>)[key]
      )
        return false
    }
  }

  return true
}
