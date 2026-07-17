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

// A node pins a content-sized dimension by bounding it from both sides — a
// Class's height is driven by its attribute/method rows. Bounds that cross leave
// no range to drag either, so they count as pinned; a side left unbounded never
// does.
const isAxisLocked = (min?: number, max?: number): boolean =>
  min !== undefined && max !== undefined && min >= max

/**
 * React Flow's `<NodeResizer>` always renders four edge lines and four corner
 * handles, so a pinned axis still shows a resize cursor and accepts a drag that
 * does nothing. Rendering only the controls that can move is the fix; the cursor
 * is a signifier, and repainting it would leave the dead control behind.
 *
 * `resizeDirection` is not an alternative: it sits on `NodeResizeControl`, and
 * `ResizeControlLineProps` omits it outright. It constrains a corner's drag
 * while leaving the diagonal cursor that lies about it, so corners go rather
 * than get constrained.
 */
export function NodeResizer(props: NodeResizerProps) {
  const {
    isVisible = true,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    nodeId,
    color,
    keepAspectRatio,
    autoScale,
    shouldResize,
    onResizeStart,
    onResize,
    onResizeEnd,
    lineStyle,
    lineClassName,
  } = props

  // `isVisible` exists only on NodeResizerProps — NodeResizeControl has no such
  // prop, so this early return is the only thing enforcing it on the locked path.
  if (!isVisible) return null

  const widthLocked = isAxisLocked(minWidth, maxWidth)
  const heightLocked = isAxisLocked(minHeight, maxHeight)

  if (!widthLocked && !heightLocked) {
    return <ReactFlowNodeResizer handleStyle={HANDLE_STYLE} {...props} />
  }

  // Without this, a fully pinned node reads as height-locked below and gets the
  // side controls it equally can't honour.
  if (widthLocked && heightLocked) return null

  const positions = heightLocked
    ? (["left", "right"] as const)
    : (["top", "bottom"] as const)

  // `keepAspectRatio` is the one prop that cannot mean anything here — it would
  // ask the pinned axis to follow the free one. No node passes it.
  return (
    <>
      {positions.map((position) => (
        <NodeResizeControl
          key={position}
          position={position}
          variant={ResizeControlVariant.Line}
          nodeId={nodeId}
          color={color}
          minWidth={minWidth}
          minHeight={minHeight}
          maxWidth={maxWidth}
          maxHeight={maxHeight}
          keepAspectRatio={keepAspectRatio}
          autoScale={autoScale}
          shouldResize={shouldResize}
          onResizeStart={onResizeStart}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
          style={lineStyle}
          className={["apollon-resize-line", lineClassName]
            .filter(Boolean)
            .join(" ")}
        />
      ))}
    </>
  )
}
