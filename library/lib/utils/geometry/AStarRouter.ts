/**
 * A* Manhattan Router
 *
 * Pathfinding on the Orthogonal Visibility Graph (OVG). Uses A* search with
 * Manhattan distance heuristic and a heavy bend penalty to minimise the number
 * of 90-degree turns.
 *
 * Priority queue is implemented as a binary min-heap for O(log n) push/pop.
 */

import {
  type BBox,
  type Point,
  type OVG,
  type BuildOVGOptions,
  buildOVG,
} from "./OrthogonalVisibilityGraph"

// ---------------------------------------------------------------------------
// Binary Heap  (min-heap ordered by `f`)
// ---------------------------------------------------------------------------

interface HeapNode {
  /** Vertex index in the OVG. */
  vertex: number
  /** g(n) + h(n) */
  f: number
}

class MinHeap {
  private data: HeapNode[] = []

  get size(): number {
    return this.data.length
  }

  push(node: HeapNode): void {
    this.data.push(node)
    this.bubbleUp(this.data.length - 1)
  }

  pop(): HeapNode | undefined {
    if (this.data.length === 0) return undefined
    const top = this.data[0]
    const last = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = last
      this.sinkDown(0)
    }
    return top
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.data[i].f < this.data[parent].f) {
        ;[this.data[i], this.data[parent]] = [this.data[parent], this.data[i]]
        i = parent
      } else {
        break
      }
    }
  }

  private sinkDown(i: number): void {
    const n = this.data.length
    while (true) {
      let smallest = i
      const left = 2 * i + 1
      const right = 2 * i + 2
      if (left < n && this.data[left].f < this.data[smallest].f) smallest = left
      if (right < n && this.data[right].f < this.data[smallest].f)
        smallest = right
      if (smallest !== i) {
        ;[this.data[i], this.data[smallest]] = [
          this.data[smallest],
          this.data[i],
        ]
        i = smallest
      } else {
        break
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Direction helpers
// ---------------------------------------------------------------------------

type Direction = "H" | "V" | "NONE"

function getDirection(from: Point, to: Point): Direction {
  if (from.x === to.x && from.y === to.y) return "NONE"
  if (from.y === to.y) return "H"
  return "V"
}

// ---------------------------------------------------------------------------
// Heuristic
// ---------------------------------------------------------------------------

/** Manhattan distance heuristic. */
function heuristic(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

// ---------------------------------------------------------------------------
// A* Search
// ---------------------------------------------------------------------------

/**
 * Weight applied per directional change (bend). A high value forces the
 * algorithm to strongly prefer straight lines over staircase patterns.
 */
export const BEND_PENALTY = 500

/** Number of distinct direction states (H, V, NONE). */
const DIR_COUNT = 3

/** Maps Direction to a numeric index for the compound state array. */
function dirIndex(d: Direction): number {
  if (d === "H") return 0
  if (d === "V") return 1
  return 2 // NONE
}

/**
 * Runs A* on the prebuilt OVG and returns the shortest obstacle-avoiding
 * orthogonal path from `sourceIdx` to `targetIdx`.
 *
 * The search uses a compound state (vertex, arriving-direction) to correctly
 * account for bend penalties. Arriving at the same vertex from horizontal vs
 * vertical are treated as different states since future bend costs differ.
 *
 * @returns An ordered array of Points from source to target, or `null` if no
 *          path exists.
 */
export function astarOnOVG(
  ovg: OVG,
  sourceIdx: number,
  targetIdx: number
): Point[] | null {
  const { vertices, adj } = ovg
  const n = vertices.length
  const stateCount = n * DIR_COUNT

  // Compound state arrays indexed by (vertex * DIR_COUNT + dirIdx)
  const g = new Float64Array(stateCount).fill(Infinity)
  const prev = new Int32Array(stateCount).fill(-1) // stores compound state idx
  const closed = new Uint8Array(stateCount)

  // Source starts with direction NONE
  const sourceState = sourceIdx * DIR_COUNT + dirIndex("NONE")
  g[sourceState] = 0

  const heap = new MinHeap()
  heap.push({
    vertex: sourceState,
    f: heuristic(vertices[sourceIdx], vertices[targetIdx]),
  })

  // Best known state index for the target vertex (across all directions)
  let bestTargetState = -1
  let bestTargetG = Infinity

  while (heap.size > 0) {
    const { vertex: uState } = heap.pop()!

    // Early exit if we've found the optimal path to target
    if (g[uState] >= bestTargetG) continue

    if (closed[uState]) continue
    closed[uState] = 1

    const uVertex = Math.floor(uState / DIR_COUNT)
    const uDirIdx = uState % DIR_COUNT
    const uDir: Direction = uDirIdx === 0 ? "H" : uDirIdx === 1 ? "V" : "NONE"

    // Check if we reached the target
    if (uVertex === targetIdx) {
      if (g[uState] < bestTargetG) {
        bestTargetG = g[uState]
        bestTargetState = uState
      }
      continue
    }

    for (const edge of adj[uVertex]) {
      const v = edge.to
      const edgeDir = getDirection(vertices[uVertex], vertices[v])
      const bendCost = uDir !== "NONE" && uDir !== edgeDir ? BEND_PENALTY : 0
      const tentativeG = g[uState] + edge.cost + bendCost
      const vState = v * DIR_COUNT + dirIndex(edgeDir)

      if (closed[vState]) continue

      if (tentativeG < g[vState]) {
        g[vState] = tentativeG
        prev[vState] = uState
        const f = tentativeG + heuristic(vertices[v], vertices[targetIdx])
        heap.push({ vertex: vState, f })
      }
    }
  }

  // Reconstruct path from the best target state
  if (bestTargetState === -1) {
    return null
  }

  const path: Point[] = []
  let cur = bestTargetState
  while (cur !== -1) {
    const vertexIdx = Math.floor(cur / DIR_COUNT)
    path.push(vertices[vertexIdx])
    cur = prev[cur]
  }
  path.reverse()
  return path
}

// ---------------------------------------------------------------------------
// Public API – Convenience function
// ---------------------------------------------------------------------------

/**
 * The primary entry point.  Given an array of obstacle bounding boxes, a
 * source point and a target point, builds the OVG and runs A* to find the
 * optimal obstacle-avoiding orthogonal path.
 *
 * @returns An ordered array of Points from source to target.  Every
 *          consecutive pair of points forms an axis-aligned segment (either
 *          `x1 === x2` or `y1 === y2`).  Returns a direct fallback path if
 *          no obstacle-free route exists.
 */
export function findOrthogonalPath(
  obstacles: BBox[],
  source: Point,
  target: Point,
  options: BuildOVGOptions = {}
): Point[] {
  // Degenerate case: source === target
  if (source.x === target.x && source.y === target.y) {
    return [source]
  }

  const ovg = buildOVG(obstacles, source, target, options)

  // Locate source & target in the OVG vertex list
  const sourceIdx = ovg.vertices.findIndex(
    (v) => v.x === source.x && v.y === source.y
  )
  const targetIdx = ovg.vertices.findIndex(
    (v) => v.x === target.x && v.y === target.y
  )

  if (sourceIdx === -1 || targetIdx === -1) {
    // Should never happen since buildOVG always adds source and target
    return fallbackPath(source, target)
  }

  const path = astarOnOVG(ovg, sourceIdx, targetIdx)

  if (!path || path.length === 0) {
    return fallbackPath(source, target)
  }

  return simplifyCollinear(path)
}

// ---------------------------------------------------------------------------
// Path simplification
// ---------------------------------------------------------------------------

/**
 * Removes redundant collinear intermediate points from a path.
 * If three consecutive points share the same x or the same y coordinate,
 * the middle point is removed because it lies on the same axis-aligned
 * segment as its neighbours.
 */
export function simplifyCollinear(path: Point[]): Point[] {
  if (path.length < 3) return path
  const result: Point[] = [path[0]]

  for (let i = 1; i < path.length - 1; i++) {
    const prev = result[result.length - 1]
    const curr = path[i]
    const next = path[i + 1]
    // Skip curr if it's collinear (same x or same y as both neighbours)
    if (prev.x === curr.x && curr.x === next.x) continue
    if (prev.y === curr.y && curr.y === next.y) continue
    result.push(curr)
  }

  result.push(path[path.length - 1])
  return result
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

/**
 * Returns a simple 1-bend or 0-bend orthogonal path when the full router
 * cannot find a valid path (e.g. target is completely enclosed).
 */
export function fallbackPath(source: Point, target: Point): Point[] {
  if (source.x === target.x || source.y === target.y) {
    // Already aligned on one axis
    return [source, target]
  }
  // Single bend via intermediate point
  return [source, { x: target.x, y: source.y }, target]
}

// ---------------------------------------------------------------------------
// Validation utilities
// ---------------------------------------------------------------------------

/**
 * Returns `true` if every segment in the path is strictly orthogonal
 * (i.e. for every consecutive pair, either x1 === x2 or y1 === y2).
 */
export function isPathOrthogonal(path: Point[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]
    const b = path[i + 1]
    if (a.x !== b.x && a.y !== b.y) return false
  }
  return true
}

/**
 * Returns `true` if the path does not pass through any of the provided
 * (non-expanded) obstacle bounding boxes.  A segment is considered
 * intersecting if it strictly crosses an obstacle interior.
 */
export function isPathObstacleFree(path: Point[], obstacles: BBox[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]
    const b = path[i + 1]
    if (segmentStrictlyIntersectsObstacle(a, b, obstacles)) return false
  }
  return true
}

/**
 * Checks whether an axis-aligned segment strictly intersects any obstacle.
 * This uses the *original* (non-padded) obstacles so that segments that
 * merely graze the padding zone are not flagged.
 */
function segmentStrictlyIntersectsObstacle(
  a: Point,
  b: Point,
  obstacles: BBox[]
): boolean {
  const isHorizontal = a.y === b.y
  if (isHorizontal) {
    const y = a.y
    const minX = Math.min(a.x, b.x)
    const maxX = Math.max(a.x, b.x)
    for (const ob of obstacles) {
      const obLeft = ob.x
      const obRight = ob.x + ob.width
      const obTop = ob.y
      const obBottom = ob.y + ob.height
      if (y > obTop && y < obBottom && maxX > obLeft && minX < obRight) {
        return true
      }
    }
  } else {
    const x = a.x
    const minY = Math.min(a.y, b.y)
    const maxY = Math.max(a.y, b.y)
    for (const ob of obstacles) {
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
