import { Position } from "@xyflow/react"
import {
  anchorPoint,
  ellipseAnchorPoint,
  formatAnchor,
  keyHandlesForSide,
  parseAnchor,
  quantizeRatio,
  SIDE_TO_POSITION,
  sideOwnsCorners,
  type Side,
} from "./anchorModel"
import { getNodeHandleConfig } from "./nodeHandleConfig"

/**
 * A React Flow node-handle descriptor for server-side rendering. React Flow v12
 * reads `node.handles` to seed handle bounds when there is no DOM to measure
 * (headless SVG/PNG export), so an edge only resolves if its anchor id appears
 * here.
 */
export interface ServerRenderHandle {
  id: string
  type: "source" | "target"
  position: Position
  x: number
  y: number
  width: number
  height: number
}

interface BuildServerRenderHandlesParams {
  nodeType?: string
  width: number
  height: number
  /** Anchor ids referenced by edges touching this node (source/target handles). */
  anchorIds?: readonly string[]
}

/**
 * Build the `handles` array a node needs for headless React Flow rendering, from
 * the SAME anchor model the interactive canvas uses (see ConnectHandles). This
 * keeps server export and the editor in lock-step: it emits the node's key
 * handles plus a handle for every referenced anchor id, so no edge is dropped
 * for a missing handle during export.
 */
export function buildServerRenderHandles({
  nodeType,
  width,
  height,
  anchorIds = [],
}: BuildServerRenderHandlesParams): ServerRenderHandle[] {
  const config = getNodeHandleConfig(nodeType)
  if (config.variant === "none" || width <= 0 || height <= 0) return []

  const rect = { x: 0, y: 0, width, height }
  const pointFor = (side: Side, ratio: number) => {
    if (config.shape === "ellipse") return ellipseAnchorPoint(rect, side, ratio)
    const axis = side === "t" || side === "b" ? width : height
    return anchorPoint(rect, side, quantizeRatio(ratio, axis))
  }

  const seen = new Set<string>()
  const handles: ServerRenderHandle[] = []
  const add = (side: Side, ratio: number) => {
    const id = formatAnchor(side, ratio)
    if (seen.has(id)) return
    seen.add(id)
    const p = pointFor(side, ratio)
    const position = SIDE_TO_POSITION[side]
    handles.push(
      { id, type: "source", position, x: p.x, y: p.y, width: 1, height: 1 },
      { id, type: "target", position, x: p.x, y: p.y, width: 1, height: 1 }
    )
  }

  for (const side of config.sides) {
    const axis = side === "t" || side === "b" ? width : height
    const dropCorners = config.excludeCorners || !sideOwnsCorners(side)
    const ratios =
      config.variant === "center"
        ? [0.5]
        : keyHandlesForSide(axis)
            .filter((h) => !(dropCorners && h.kind === "corner"))
            .map((h) => h.ratio)
    for (const ratio of ratios) add(side, ratio)
  }

  // Referenced addressable anchors (e.g. a saved fine-grid point) — must be
  // backed too, exactly like the hidden anchors ConnectHandles renders.
  for (const anchorId of anchorIds) {
    const anchor = parseAnchor(anchorId)
    if (!anchor) continue
    if (!config.sides.includes(anchor.side)) continue
    add(anchor.side, anchor.ratio)
  }

  return handles
}
