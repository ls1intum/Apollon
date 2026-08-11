// This module is the one sanctioned importer of React Flow's resizer; every
// other call site is pointed here by `no-restricted-imports`. The shadowed name
// is deliberate: nodes should not have to know an axis-aware variant exists, and
// the lint rule makes reaching past it a build error rather than a convention.
import {
  // eslint-disable-next-line no-restricted-imports
  NodeResizer as ReactFlowNodeResizer,
  NodeResizeControl,
  ResizeControlVariant,
  useNodeId,
  useStore,
  type NodeResizerProps,
} from "@xyflow/react"

// React Flow's corner handles default to 5x5, which is a very small thing to hit
// with a mouse. 10x10 stays in the range diagram editors actually draw (Figma and
// Excalidraw sit around 8, draw.io a little under) while being noticeably easier
// to aim at; the grab area is widened separately below, since drawing a handle
// large enough to satisfy a pointer target would dominate the node it belongs to.
const HANDLE_STYLE = { width: 10, height: 10 }

// Marks every edge line so app.css can lift it over node content and widen its
// 1px grab area.
const LINE_CLASS = "apollon-resize-line"

// Marks every corner handle so app.css can widen its grab area to the 24x24 CSS
// pixels WCAG 2.2 asks of a pointer target (SC 2.5.8, AA) without inflating the
// 10x10 square that is actually drawn.
const HANDLE_CLASS = "apollon-resize-handle"

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
 *
 * Controls are additionally shown only while their node is selected. Call sites
 * pass `isVisible={isDiagramModifiable}`, which answers "may this diagram be
 * edited at all" — on its own that painted four corner handles and four edge
 * lines around every node on the canvas at once, permanently. Selection is the
 * conventional gate (React Flow documents a "NodeResizer when selected" example,
 * and every comparable editor behaves that way), and putting it here rather than
 * at the call sites keeps all forty of them unchanged.
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

  // `nodeId` is explicit at a couple of call sites and comes from context at the
  // rest. Undefined when the resizer is rendered outside a node, where there is
  // no selection to consult and so nothing to gate on.
  const contextNodeId = useNodeId()
  const nodeId = props.nodeId ?? contextNodeId
  const isNodeSelected = useStore((state) =>
    nodeId ? !!state.nodeLookup.get(nodeId)?.selected : undefined
  )

  // `isVisible` exists only on NodeResizerProps — NodeResizeControl has no such
  // prop, so these early returns are the only thing enforcing it on the locked path.
  if (!isVisible) return null
  if (isNodeSelected === false) return null

  const widthLocked = isAxisLocked(minWidth, maxWidth)
  const heightLocked = isAxisLocked(minHeight, maxHeight)

  if (!widthLocked && !heightLocked) {
    return (
      <ReactFlowNodeResizer
        {...props}
        handleStyle={handleStyle ?? HANDLE_STYLE}
        handleClassName={[HANDLE_CLASS, handleClassName]
          .filter(Boolean)
          .join(" ")}
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
          className={[HANDLE_CLASS, cornerClass, handleClassName]
            .filter(Boolean)
            .join(" ")}
          style={{ ...HANDLE_STYLE, ...handleStyle }}
          {...shared}
        />
      ))}
    </>
  )
}
