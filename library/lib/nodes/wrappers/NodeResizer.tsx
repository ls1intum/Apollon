// This module is the one sanctioned importer of React Flow's resizer; every
// other call site is pointed here by `no-restricted-imports`. The shadowed name
// is deliberate: nodes should not have to know an axis-aware variant exists, and
// the lint rule makes reaching past it a build error rather than a convention.
import {
  // eslint-disable-next-line no-restricted-imports
  NodeResizer as ReactFlowNodeResizer,
  NodeResizeControl,
  ResizeControlVariant,
  type NodeResizerProps,
} from "@xyflow/react"

// React Flow's corner handles default to 5x5; every Apollon node wants 8x8.
const HANDLE_STYLE = { width: 8, height: 8 }

// Marks every edge line so app.css can lift it over node content and widen its
// 1px grab area.
const LINE_CLASS = "apollon-resize-line"

const CORNERS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const

// A node pins a content-sized dimension by bounding it from both sides — a
// Class's height is driven by its attribute/method rows. Bounds that cross leave
// no range to drag either, so they count as pinned; a side left unbounded never
// does.
const isAxisLocked = (min?: number, max?: number): boolean =>
  min !== undefined && max !== undefined && min >= max

/**
 * React Flow's `<NodeResizer>` always renders four edge lines and four corner
 * handles, and its stylesheet paints each with a resize cursor. On a node with a
 * pinned axis, the two edge lines of that axis promise a resize that can't
 * happen (issue #629), and every corner shows a diagonal cursor even though only
 * one axis can move.
 *
 * So on a pinned axis this drops that axis's two edge lines and keeps the
 * corners — the familiar, chunky grab target — but constrains each corner to the
 * free axis with `resizeDirection` and relabels its cursor (`apollon-resize-
 * corner--*` in app.css) to that axis. The result: a content-sized node still
 * looks and works resizable on the axis it can change, and no cursor anywhere
 * points a direction the drag won't go.
 */
export function NodeResizer(props: NodeResizerProps) {
  const {
    isVisible = true,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    handleStyle,
    handleClassName,
    lineStyle,
    lineClassName,
    ...resizeParams
  } = props

  // `isVisible` exists only on NodeResizerProps — NodeResizeControl has no such
  // prop, so this early return is the only thing enforcing it on the locked path.
  if (!isVisible) return null

  const widthLocked = isAxisLocked(minWidth, maxWidth)
  const heightLocked = isAxisLocked(minHeight, maxHeight)

  if (!widthLocked && !heightLocked) {
    return (
      <ReactFlowNodeResizer
        {...props}
        handleStyle={handleStyle ?? HANDLE_STYLE}
        lineClassName={[LINE_CLASS, lineClassName].filter(Boolean).join(" ")}
      />
    )
  }

  // Both axes pinned: nothing to resize.
  if (widthLocked && heightLocked) return null

  const shared = { minWidth, minHeight, maxWidth, maxHeight, ...resizeParams }
  const lines = heightLocked
    ? (["left", "right"] as const)
    : (["top", "bottom"] as const)
  // The axis that can still move, for both React Flow's constraint and the cursor.
  const freeAxis = heightLocked ? "horizontal" : "vertical"
  const cornerClass = heightLocked
    ? "apollon-resize-corner--x"
    : "apollon-resize-corner--y"

  return (
    <>
      {lines.map((position) => (
        <NodeResizeControl
          key={position}
          position={position}
          variant={ResizeControlVariant.Line}
          style={lineStyle}
          className={[LINE_CLASS, lineClassName].filter(Boolean).join(" ")}
          {...shared}
        />
      ))}
      {CORNERS.map((position) => (
        <NodeResizeControl
          key={position}
          position={position}
          variant={ResizeControlVariant.Handle}
          resizeDirection={freeAxis}
          className={[cornerClass, handleClassName].filter(Boolean).join(" ")}
          style={{ ...HANDLE_STYLE, ...handleStyle }}
          {...shared}
        />
      ))}
    </>
  )
}
