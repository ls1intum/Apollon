import {
  astarOnOVG,
  fallbackPath,
  simplifyCollinear,
} from "../utils/geometry/AStarRouter"
import {
  buildOVG,
  type BBox,
  type OVG,
  type Point,
} from "../utils/geometry/OrthogonalVisibilityGraph"

export type RouteRequest = {
  msgId: string
  edgeId: string
  obstacles: BBox[]
  source: Point
  target: Point
  waypoints?: Point[]
  /** Optional per-obstacle padding overrides, parallel to `obstacles`. */
  paddings?: Array<number | undefined>
}

export type RouteResponse = {
  msgId: string
  edgeId: string
  path: Point[]
  error?: string
}

/**
 * Layout-keyed OVG cache.
 *
 * Building the OVG is the dominant per-request cost. While the user drags a
 * single segment the obstacle layout is fixed, but source/target/waypoints
 * change every frame. We key the cached OVG on (obstacles, source, target):
 * if the next request keeps the same shape we reuse the cached graph and
 * only re-run A*. The cache holds one entry — large enough for a single
 * active drag, small enough that stale entries can't accumulate.
 */
let cachedKey: string | null = null
let cachedOVG: OVG | null = null

function bboxKey(b: BBox): string {
  return `${b.x},${b.y},${b.width},${b.height}`
}

function obstaclesKey(
  obstacles: BBox[],
  source: Point,
  target: Point,
  paddings?: Array<number | undefined>
): string {
  // Obstacles are taken in order — the main thread feeds them from the node
  // list, which is stable across frames during a drag.
  let key = `${source.x},${source.y}|${target.x},${target.y}|`
  for (let i = 0; i < obstacles.length; i++) {
    key += bboxKey(obstacles[i])
    if (paddings?.[i] !== undefined) key += `@${paddings[i]}`
    key += ";"
  }
  return key
}

function getOrBuildOVG(
  obstacles: BBox[],
  source: Point,
  target: Point,
  paddings?: Array<number | undefined>
): OVG {
  const key = obstaclesKey(obstacles, source, target, paddings)
  if (cachedKey === key && cachedOVG) return cachedOVG
  const ovg = buildOVG(obstacles, source, target, { paddings })
  cachedKey = key
  cachedOVG = ovg
  return ovg
}

function routeSegment(
  obstacles: BBox[],
  source: Point,
  target: Point,
  paddings?: Array<number | undefined>
): Point[] {
  if (source.x === target.x && source.y === target.y) return [source]

  const ovg = getOrBuildOVG(obstacles, source, target, paddings)
  const sourceIdx = ovg.vertices.findIndex(
    (v) => v.x === source.x && v.y === source.y
  )
  const targetIdx = ovg.vertices.findIndex(
    (v) => v.x === target.x && v.y === target.y
  )
  if (sourceIdx === -1 || targetIdx === -1) return fallbackPath(source, target)

  const path = astarOnOVG(ovg, sourceIdx, targetIdx)
  if (!path || path.length === 0) return fallbackPath(source, target)
  return simplifyCollinear(path)
}

self.onmessage = (e: MessageEvent<RouteRequest>) => {
  const { msgId, edgeId, obstacles, source, target, waypoints, paddings } =
    e.data

  try {
    const pointsToVisit = [source, ...(waypoints || []), target]
    const finalPath: Point[] = []

    for (let i = 0; i < pointsToVisit.length - 1; i++) {
      const from = pointsToVisit[i]
      const to = pointsToVisit[i + 1]
      const segmentPath = routeSegment(obstacles, from, to, paddings)

      if (i === 0) {
        finalPath.push(...segmentPath)
      } else {
        // Avoid duplicating the point where segments meet
        finalPath.push(...segmentPath.slice(1))
      }
    }

    self.postMessage({
      msgId,
      edgeId,
      path: finalPath,
    } as RouteResponse)
  } catch (err: unknown) {
    self.postMessage({
      msgId,
      edgeId,
      path: [],
      error: err instanceof Error ? err.message : String(err),
    } as RouteResponse)
  }
}
