import type { IPoint } from "@/edges/Connection"

export type GeometryRect = {
  x: number
  y: number
  width: number
  height: number
}

/** Alternating edge id / route reference. Primitive ids and stable route arrays
 * make the result suitable for Zustand's shallow selector equality. */
export type SelectedRouteEntries = Array<string | IPoint[]>

export const polylineBounds = (points: readonly IPoint[]): GeometryRect => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  return points.length === 0
    ? { x: 0, y: 0, width: 0, height: 0 }
    : { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

const mayIntersect = (a: GeometryRect, b: GeometryRect): boolean =>
  a.x <= b.x + b.width &&
  a.x + a.width >= b.x &&
  a.y <= b.y + b.height &&
  a.y + a.height >= b.y

// `setAllGeometry` preserves the array identity of every unchanged route. Cache
// only registry candidates (not a hook's potentially mutable basePoints) so the
// selectors perform O(route count) rectangle checks rather than re-walking all
// segments once for every rendered edge.
const registryBoundsCache = new WeakMap<IPoint[], GeometryRect>()

const registryRouteBounds = (route: IPoint[]): GeometryRect => {
  const cached = registryBoundsCache.get(route)
  if (cached) return cached
  const result = polylineBounds(route)
  registryBoundsCache.set(route, result)
  return result
}

/**
 * Broad-phase route selection. It deliberately permits boundary-touching false
 * positives; downstream jump/label geometry retains its exact intersection
 * rules, while the broad phase can never hide a real crossing.
 */
export const selectRouteEntriesIntersectingRect = (
  geometryById: Readonly<Record<string, IPoint[]>>,
  query: GeometryRect,
  excludeId?: string
): SelectedRouteEntries => {
  const selected: SelectedRouteEntries = []
  for (const [id, route] of Object.entries(geometryById)) {
    if (
      id === excludeId ||
      route.length < 2 ||
      !mayIntersect(query, registryRouteBounds(route))
    )
      continue
    selected.push(id, route)
  }
  return selected
}

/**
 * Creates a selector scoped to one edge/query and memoized by the settled map's
 * identity. Preview-only store writes leave `geometryById` untouched, so every
 * unaffected edge returns its previous selection in O(1).
 */
export const createRouteEntriesSelector = (
  query: GeometryRect,
  excludeId?: string
): ((
  geometryById: Readonly<Record<string, IPoint[]>>
) => SelectedRouteEntries) => {
  let previousGeometry: Readonly<Record<string, IPoint[]>> | undefined
  let previousSelection: SelectedRouteEntries = []
  return (geometryById) => {
    if (geometryById === previousGeometry) return previousSelection
    previousGeometry = geometryById
    previousSelection = selectRouteEntriesIntersectingRect(
      geometryById,
      query,
      excludeId
    )
    return previousSelection
  }
}

export const selectedRoutesToRecord = (
  selected: readonly (string | IPoint[])[]
): Record<string, IPoint[]> => {
  const result: Record<string, IPoint[]> = {}
  for (let index = 0; index < selected.length; index += 2)
    result[selected[index] as string] = selected[index + 1] as IPoint[]
  return result
}
