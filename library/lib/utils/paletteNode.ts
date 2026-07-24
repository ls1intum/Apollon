import type { Node, XYPosition } from "@xyflow/react"
import { generateUUID, type DropElementConfig } from "@/constants"

// Pure palette-node helpers, shared by the drag and tap placement paths so both
// mint identical nodes and can be unit-tested without React Flow.

/** True for a nested child that owns an id which must be unique per node. */
function hasStringId(item: unknown): item is { id: string } {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as { id?: unknown }).id === "string"
  )
}

/**
 * Re-mint the id of every id-bearing nested child (attributes, methods,
 * actionRows, lanes, …) so a cloned or freshly placed node never shares a
 * child id with its source. Structural by design: any array whose entries are
 * `{ id: string, ... }` objects is remapped; string arrays like `tags` and
 * coordinate `{ x, y }` arrays carry no id and pass through untouched. This is
 * the single canonical enumeration shared by palette placement and copy/paste,
 * so the two paths can never drift on which children get new ids.
 */
export function remintNestedChildIds<T extends Record<string, unknown>>(
  data: T
): T {
  const result: Record<string, unknown> = { ...data }
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.some(hasStringId)) {
      result[key] = value.map((item) =>
        hasStringId(item) ? { ...item, id: generateUUID() } : item
      )
    }
  }
  return result as T
}

/** Deep-clone a config's `defaultData`, re-minting every nested child id. */
export function instantiatePaletteData(
  defaultData?: Record<string, unknown>
): Record<string, unknown> {
  return remintNestedChildIds(structuredClone(defaultData ?? {}))
}

/**
 * Build a new canvas node from a palette config at `position` (already in the
 * target parent's coordinate space). The drop size may exceed the sidebar
 * preview size (`dropWidth`/`dropHeight`).
 */
export function buildPaletteNode(
  config: DropElementConfig,
  position: XYPosition,
  options: { parentId?: string; selected?: boolean } = {}
): Node {
  const width = config.dropWidth ?? config.width
  const height = config.dropHeight ?? config.height
  return {
    id: generateUUID(),
    type: config.type,
    position: { ...position },
    width,
    height,
    measured: { width, height },
    data: instantiatePaletteData(config.defaultData),
    parentId: options.parentId,
    selected: options.selected ?? false,
  }
}

/** The visible canvas in flow coordinates. */
export interface VisibleFlowRect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Snap a point to the nearest grid intersection (no-op for `snapPx <= 0`). */
export function snapToGrid(point: XYPosition, snapPx: number): XYPosition {
  if (snapPx <= 0) return { ...point }
  return {
    x: Math.round(point.x / snapPx) * snapPx,
    y: Math.round(point.y / snapPx) * snapPx,
  }
}

function isRectVisible(
  topLeft: XYPosition,
  width: number,
  height: number,
  rect: VisibleFlowRect
): boolean {
  return (
    topLeft.x < rect.maxX &&
    topLeft.x + width > rect.minX &&
    topLeft.y < rect.maxY &&
    topLeft.y + height > rect.minY
  )
}

/**
 * Absolute top-left for a tap-placed node. A burst of taps cascades diagonally
 * off the previous one: each tap selects the node it created, so the next tap
 * offsets from that node's absolute position. The cascade is only taken when
 * the *resulting* node stays on screen — otherwise it falls back to the
 * viewport centre, so a tap never drops a node out of view. Parent nesting is
 * resolved by the caller from the returned position, identically for both
 * branches.
 */
export function resolveTapPosition(params: {
  centeredPosition: XYPosition
  anchorAbsolute: XYPosition | null
  nodeWidth: number
  nodeHeight: number
  visibleRect: VisibleFlowRect
  stepPx: number
  snapPx: number
}): XYPosition {
  const { centeredPosition, anchorAbsolute, nodeWidth, nodeHeight } = params
  if (anchorAbsolute) {
    const cascaded = snapToGrid(
      {
        x: anchorAbsolute.x + params.stepPx,
        y: anchorAbsolute.y + params.stepPx,
      },
      params.snapPx
    )
    if (isRectVisible(cascaded, nodeWidth, nodeHeight, params.visibleRect)) {
      return cascaded
    }
  }
  return centeredPosition
}
