/**
 * Spatial Index — R-Tree Wrapper for Obstacle Queries
 *
 * Wraps the `rbush` library to provide O(log n) bounding-box intersection
 * queries for the A* router. This replaces naive O(n) array scans in both
 * the OVG construction phase and the real-time drag loop.
 *
 * Design:
 *   - Each node on the canvas becomes an R-Tree entry.
 *   - The tree is rebuilt (bulk-loaded) once whenever the node set changes.
 *   - During pathfinding or segment dragging, `search(bbox)` returns only
 *     obstacles whose bounding boxes intersect the query rectangle.
 *
 * Thread Safety:
 *   This module is intentionally **pure** — it carries no side effects,
 *   no React hooks, and no global state. It can be used inside a Web Worker.
 */

import RBush from "rbush"
import type { BBox } from "./OrthogonalVisibilityGraph"

// ---------------------------------------------------------------------------
// R-Tree Item
// ---------------------------------------------------------------------------

/** An entry stored in the R-Tree. Extends `rbush`'s required interface. */
export interface SpatialItem {
  minX: number
  minY: number
  maxX: number
  maxY: number
  /** The original obstacle bounding box, retained for downstream use. */
  bbox: BBox
  /** Optional identifier for the obstacle (e.g. node ID). */
  id?: string
}

// ---------------------------------------------------------------------------
// SpatialIndex class
// ---------------------------------------------------------------------------

export class SpatialIndex {
  private tree: RBush<SpatialItem>

  constructor() {
    this.tree = new RBush<SpatialItem>()
  }

  /**
   * Bulk-loads a complete set of obstacles, replacing any prior tree content.
   * This is significantly faster than inserting items one-by-one.
   */
  load(obstacles: BBox[], ids?: string[]): void {
    this.tree.clear()
    const items: SpatialItem[] = obstacles.map((bbox, i) => ({
      minX: bbox.x,
      minY: bbox.y,
      maxX: bbox.x + bbox.width,
      maxY: bbox.y + bbox.height,
      bbox,
      id: ids?.[i],
    }))
    this.tree.load(items)
  }

  /**
   * Returns all obstacles whose bounding boxes intersect the given query rectangle.
   * Complexity: O(log n + k) where k is the number of results.
   */
  search(queryBBox: BBox): BBox[] {
    const results = this.tree.search({
      minX: queryBBox.x,
      minY: queryBBox.y,
      maxX: queryBBox.x + queryBBox.width,
      maxY: queryBBox.y + queryBBox.height,
    })
    return results.map((item) => item.bbox)
  }

  /**
   * Returns all obstacles whose bounding boxes intersect the axis-aligned
   * segment from point `a` to point `b`. The segment must be axis-aligned
   * (sharing either x or y coordinate).
   */
  searchSegment(
    a: { x: number; y: number },
    b: { x: number; y: number }
  ): BBox[] {
    const minX = Math.min(a.x, b.x)
    const maxX = Math.max(a.x, b.x)
    const minY = Math.min(a.y, b.y)
    const maxY = Math.max(a.y, b.y)
    // For zero-width or zero-height segments, expand by a tiny epsilon
    // so the R-Tree search box is never degenerate
    const eps = 0.01
    const results = this.tree.search({
      minX: minX - eps,
      minY: minY - eps,
      maxX: maxX + eps,
      maxY: maxY + eps,
    })
    return results.map((item) => item.bbox)
  }

  /** Returns the total number of items in the tree. */
  get size(): number {
    return this.tree.all().length
  }

  /** Removes all items from the tree. */
  clear(): void {
    this.tree.clear()
  }
}

// ---------------------------------------------------------------------------
// Singleton factory for the main thread
// ---------------------------------------------------------------------------

let _mainThreadIndex: SpatialIndex | null = null

/**
 * Returns a module-level singleton SpatialIndex instance for the main
 * thread. Call `rebuildSpatialIndex()` whenever the node layout changes.
 */
export function getMainSpatialIndex(): SpatialIndex {
  if (!_mainThreadIndex) {
    _mainThreadIndex = new SpatialIndex()
  }
  return _mainThreadIndex
}

/**
 * Convenience: rebuilds the main-thread spatial index from a fresh set
 * of node bounding boxes. Call this from the Zustand store subscription
 * that fires whenever nodes change position/size.
 */
export function rebuildSpatialIndex(obstacles: BBox[], ids?: string[]): void {
  getMainSpatialIndex().load(obstacles, ids)
}
