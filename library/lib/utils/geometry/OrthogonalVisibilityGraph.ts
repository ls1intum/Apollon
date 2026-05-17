/**
 * Orthogonal Visibility Graph (OVG)
 *
 * Constructs a sparse graph of vertices and edges suitable for A* Manhattan
 * pathfinding.  Vertices are generated at the intersections of horizontal and
 * vertical "lead lines" projected from the padded bounding boxes of every
 * obstacle.  Edges connect vertices that share an axis-aligned segment which
 * does NOT intersect any expanded obstacle bounding box.
 *
 * Segment-vs-obstacle and point-vs-obstacle checks are accelerated by an
 * R-Tree (SpatialIndex), reducing the per-query cost from O(n) to O(log n + k).
 */

import { SpatialIndex } from "./SpatialIndex"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Axis-aligned bounding box in absolute canvas coordinates. */
export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

/** A 2-D coordinate. */
export interface Point {
  x: number
  y: number
}

/** An adjacency-list entry connecting two OVG vertices. */
export interface OVGEdge {
  /** Index of the target vertex in the OVG vertices array. */
  to: number
  /** Euclidean distance between the two vertices (always axis-aligned). */
  cost: number
}

/** The complete Orthogonal Visibility Graph. */
export interface OVG {
  /** All unique vertices discovered during construction. */
  vertices: Point[]
  /** Adjacency list: `adj[i]` contains the edges departing vertex `i`. */
  adj: OVGEdge[][]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Padding applied around each obstacle to create an exclusion zone. */
export const OVG_PADDING = 15

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the padded (expanded) bounding box for an obstacle.
 */
export function expandBBox(bbox: BBox, padding: number = OVG_PADDING): BBox {
  return {
    x: bbox.x - padding,
    y: bbox.y - padding,
    width: bbox.width + 2 * padding,
    height: bbox.height + 2 * padding,
  }
}

/**
 * Determines whether a given point lies strictly inside any expanded obstacle.
 *
 * When `index` is provided, uses the R-Tree for O(log n + k) lookup; otherwise
 * falls back to a linear scan of `expandedObstacles`.
 */
export function pointInsideAnyObstacle(
  p: Point,
  expandedObstacles: BBox[],
  index?: SpatialIndex
): boolean {
  const candidates = index
    ? index.search({ x: p.x, y: p.y, width: 0, height: 0 })
    : expandedObstacles
  for (const ob of candidates) {
    if (
      p.x > ob.x &&
      p.x < ob.x + ob.width &&
      p.y > ob.y &&
      p.y < ob.y + ob.height
    ) {
      return true
    }
  }
  return false
}

/**
 * Determines whether an axis-aligned segment between two points intersects
 * any expanded obstacle bounding box.  The two points MUST share an x or y
 * coordinate (the segment is axis-aligned).
 *
 * We test intersection using an inclusive overlap check: a horizontal segment
 * at y=Y from x=minX to x=maxX intersects an obstacle if the obstacle's
 * y-range contains Y AND the obstacle's x-range overlaps [minX, maxX].
 * The strict inequality means we allow the segment to touch but not cross.
 */
export function segmentIntersectsObstacle(
  a: Point,
  b: Point,
  expandedObstacles: BBox[],
  index?: SpatialIndex
): boolean {
  const candidates = index ? index.searchSegment(a, b) : expandedObstacles
  const isHorizontal = a.y === b.y
  if (isHorizontal) {
    const y = a.y
    const minX = Math.min(a.x, b.x)
    const maxX = Math.max(a.x, b.x)
    for (const ob of candidates) {
      const obLeft = ob.x
      const obRight = ob.x + ob.width
      const obTop = ob.y
      const obBottom = ob.y + ob.height
      // Strict containment on y-axis, overlap on x-axis
      if (y > obTop && y < obBottom && maxX > obLeft && minX < obRight) {
        return true
      }
    }
  } else {
    // Vertical segment
    const x = a.x
    const minY = Math.min(a.y, b.y)
    const maxY = Math.max(a.y, b.y)
    for (const ob of candidates) {
      const obLeft = ob.x
      const obRight = ob.x + ob.width
      const obTop = ob.y
      const obBottom = ob.y + ob.height
      if (x > obLeft && x < obRight && maxY > obTop && minY < obBottom) {
        return true
      }
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// OVG Construction
// ---------------------------------------------------------------------------

/**
 * Builds the Orthogonal Visibility Graph from a set of obstacle bounding
 * boxes, a source point, and a target point.
 *
 * The algorithm:
 * 1. Expand each obstacle by `OVG_PADDING`.
 * 2. Generate horizontal and vertical lead lines from each expanded obstacle's
 *    boundary edges and center.
 * 3. Include the source and target coordinates as lead lines.
 * 4. Compute all intersection points of horizontal × vertical lead lines.
 * 5. Discard vertices that fall strictly inside an expanded obstacle.
 * 6. Deduplicate vertices.
 * 7. For every pair of vertices sharing an x or y coordinate, create an edge
 *    if the connecting segment does not intersect any expanded obstacle.
 */
/**
 * Optional per-obstacle padding overrides for buildOVG.
 *
 * Endpoint-adjacent nodes (the source and target of an edge) must use zero
 * padding so the route start/end points are not trapped inside the obstacle's
 * exclusion zone. The caller passes an array parallel to `obstacles`; entries
 * left `undefined` fall back to the default `OVG_PADDING`.
 */
export interface BuildOVGOptions {
  /** Parallel array to `obstacles`. `paddings[i]` is the padding for `obstacles[i]`. */
  paddings?: Array<number | undefined>
}

export function buildOVG(
  obstacles: BBox[],
  source: Point,
  target: Point,
  options: BuildOVGOptions = {}
): OVG {
  const { paddings } = options
  const expanded = obstacles.map((ob, i) =>
    expandBBox(ob, paddings?.[i] ?? OVG_PADDING)
  )

  // R-Tree for O(log n) point-in-obstacle and segment-intersection queries.
  // Avoids the O(n) scan that would otherwise dominate OVG construction for
  // large diagrams. For very small obstacle counts the constant factor of the
  // tree is not worth it, so fall back to linear scans.
  const index =
    expanded.length >= 8
      ? (() => {
          const i = new SpatialIndex()
          i.load(expanded)
          return i
        })()
      : undefined

  // ----- Lead lines -------------------------------------------------------
  const hLines = new Set<number>() // y-coordinates
  const vLines = new Set<number>() // x-coordinates

  for (const ob of expanded) {
    const left = ob.x
    const right = ob.x + ob.width
    const top = ob.y
    const bottom = ob.y + ob.height
    const centerX = ob.x + ob.width / 2
    const centerY = ob.y + ob.height / 2

    vLines.add(left)
    vLines.add(right)
    vLines.add(centerX)

    hLines.add(top)
    hLines.add(bottom)
    hLines.add(centerY)
  }

  // Include source / target coordinates
  hLines.add(source.y)
  vLines.add(source.x)
  hLines.add(target.y)
  vLines.add(target.x)

  // ----- Vertex generation ------------------------------------------------
  const hArr = Array.from(hLines).sort((a, b) => a - b)
  const vArr = Array.from(vLines).sort((a, b) => a - b)

  // Map from "x,y" string to vertex index for deduplication
  const vertexMap = new Map<string, number>()
  const vertices: Point[] = []

  function addVertex(p: Point): number {
    const key = `${p.x},${p.y}`
    const existing = vertexMap.get(key)
    if (existing !== undefined) return existing
    const idx = vertices.length
    vertices.push(p)
    vertexMap.set(key, idx)
    return idx
  }

  // Intersect all h-lines with all v-lines
  for (const y of hArr) {
    for (const x of vArr) {
      const p: Point = { x, y }
      if (!pointInsideAnyObstacle(p, expanded, index)) {
        addVertex(p)
      }
    }
  }

  // Ensure source and target are always present, even if inside an obstacle
  // (the router must be able to route from/to these points)
  addVertex(source)
  addVertex(target)

  // ----- Edge generation ---------------------------------------------------
  const adj: OVGEdge[][] = Array.from({ length: vertices.length }, () => [])

  // Group vertices by shared x-coordinate and by shared y-coordinate
  const byX = new Map<number, number[]>()
  const byY = new Map<number, number[]>()

  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i]
    const xKey = v.x
    const yKey = v.y
    if (!byX.has(xKey)) byX.set(xKey, [])
    byX.get(xKey)!.push(i)
    if (!byY.has(yKey)) byY.set(yKey, [])
    byY.get(yKey)!.push(i)
  }

  // For each group sharing an x-coordinate, sort by y and connect consecutive
  // vertices if the segment is obstacle-free.
  for (const indices of byX.values()) {
    indices.sort((a, b) => vertices[a].y - vertices[b].y)
    for (let k = 0; k < indices.length - 1; k++) {
      const i = indices[k]
      const j = indices[k + 1]
      if (
        !segmentIntersectsObstacle(vertices[i], vertices[j], expanded, index)
      ) {
        const cost = Math.abs(vertices[j].y - vertices[i].y)
        adj[i].push({ to: j, cost })
        adj[j].push({ to: i, cost })
      }
    }
  }

  // Same for y-coordinate groups (horizontal edges)
  for (const indices of byY.values()) {
    indices.sort((a, b) => vertices[a].x - vertices[b].x)
    for (let k = 0; k < indices.length - 1; k++) {
      const i = indices[k]
      const j = indices[k + 1]
      if (
        !segmentIntersectsObstacle(vertices[i], vertices[j], expanded, index)
      ) {
        const cost = Math.abs(vertices[j].x - vertices[i].x)
        adj[i].push({ to: j, cost })
        adj[j].push({ to: i, cost })
      }
    }
  }

  return { vertices, adj }
}
