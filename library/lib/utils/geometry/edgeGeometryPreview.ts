import type { Edge, InternalNode, Rect } from "@xyflow/react"
import type { IPoint } from "@/edges/Connection"
import { CANVAS } from "@/utils/geometry/routingConstants"
import { isRoutingParentNodeType } from "@/utils/geometry/nodeGeometry"

export type EdgeGeometryNodeRect = Rect & { type?: string; parentId?: string }
export type EdgeGeometryNodeSnapshot = ReadonlyMap<string, EdgeGeometryNodeRect>

export type ActiveEdgeGeometryGesture = {
  edgeId: string
  /** Edge object at gesture start. A successful customization replaces this
   * object in the controlled diagram store; cancellation leaves it untouched. */
  originalEdge: Edge | undefined
  latestPoints: IPoint[]
}

export type ReleasedEdgeGeometryPreview = {
  edgeId: string
  points: IPoint[]
}

export const EDGE_GEOMETRY_SETTLEMENT_DURATION_MS = 120

export type EdgeGeometrySettlementTransition = Readonly<
  Record<
    string,
    Readonly<{
      from: IPoint[]
      to: IPoint[]
      normalizedFrom: IPoint[]
      normalizedTo: IPoint[]
    }>
  >
>

export type ProvisionalRouteDecisionState = Map<string, string>
const NO_EDGE_TYPES: ReadonlySet<string> = new Set()

/**
 * Keep the just-authored display route across pointer-up until the release solve
 * commits. Object identity is the gesture outcome signal: edge customization
 * replaces the controlled edge, while pointer-cancel/no-op leaves it untouched.
 */
export const resolveReleasedEdgeGeometryPreview = (
  gesture: ActiveEdgeGeometryGesture,
  edges: readonly Edge[],
  previewById: Readonly<Record<string, IPoint[]>>,
  geometryById: Readonly<Record<string, IPoint[]>>
): ReleasedEdgeGeometryPreview | null => {
  const committedEdge = edges.find((edge) => edge.id === gesture.edgeId)
  if (!committedEdge || committedEdge === gesture.originalEdge) return null
  return {
    edgeId: gesture.edgeId,
    points:
      previewById[gesture.edgeId] ??
      geometryById[gesture.edgeId] ??
      gesture.latestPoints,
  }
}

/** The small immutable node snapshot needed to keep settled routes attached while
 * a large exact solve is in flight in the Worker. */
export const snapshotEdgeGeometryNodes = (
  nodeLookup: ReadonlyMap<string, InternalNode>
): EdgeGeometryNodeSnapshot =>
  new Map(
    [...nodeLookup].map(([id, node]) => [
      id,
      {
        x: node.internals.positionAbsolute.x,
        y: node.internals.positionAbsolute.y,
        width: node.measured.width ?? node.width ?? 0,
        height: node.measured.height ?? node.height ?? 0,
        type: node.type,
        parentId: node.parentId,
      },
    ])
  )

const projectPoint = (point: IPoint, from: Rect, to: Rect): IPoint => ({
  x: to.x + (from.width > 0 ? ((point.x - from.x) / from.width) * to.width : 0),
  y:
    to.y +
    (from.height > 0 ? ((point.y - from.y) / from.height) * to.height : 0),
})

const samePoint = (a: IPoint, b: IPoint): boolean => a.x === b.x && a.y === b.y

const sameRect = (a: Rect | undefined, b: Rect | undefined): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height)

const simplify = (points: readonly IPoint[]): IPoint[] => {
  const result: IPoint[] = []
  for (const point of points) {
    const previous = result[result.length - 1]
    if (previous && samePoint(previous, point)) continue
    const before = result[result.length - 2]
    if (
      before &&
      previous &&
      ((before.x === previous.x && previous.x === point.x) ||
        (before.y === previous.y && previous.y === point.y))
    ) {
      result[result.length - 1] = point
    } else {
      result.push(point)
    }
  }
  return result
}

type SegmentOrientation = "horizontal" | "vertical"

const routeOrientations = (
  points: readonly IPoint[]
): SegmentOrientation[] | null => {
  const orientations: SegmentOrientation[] = []
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]
    const point = points[index]
    if (previous.x === point.x && previous.y === point.y) continue
    if (previous.y === point.y) orientations.push("horizontal")
    else if (previous.x === point.x) orientations.push("vertical")
    else return null
  }
  return orientations
}

const routeDirectionKey = (points: readonly IPoint[]): string | null => {
  const directions: string[] = []
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]
    const point = points[index]
    if (previous.x === point.x && previous.y === point.y) continue
    if (previous.y === point.y)
      directions.push(point.x > previous.x ? "R" : "L")
    else if (previous.x === point.x)
      directions.push(point.y > previous.y ? "D" : "U")
    else
      directions.push(
        `${point.y > previous.y ? "D" : "U"}${point.x > previous.x ? "R" : "L"}`
      )
  }
  return directions.length > 0 ? directions.join(",") : null
}

const relativeEndpointKey = (
  point: IPoint,
  rect: EdgeGeometryNodeRect | undefined
): string => {
  if (!rect) return "?"
  const grid = CANVAS.SNAP_TO_GRID_PX
  return `${Math.round((point.x - rect.x) / grid)},${Math.round(
    (point.y - rect.y) / grid
  )}`
}

const provisionalRouteDecisionKey = (
  route: readonly IPoint[],
  edge: Edge,
  nodes: EdgeGeometryNodeSnapshot
): string | null => {
  const simplified = simplify(route)
  if (simplified.length < 2) return null
  const directions = routeDirectionKey(simplified)
  if (directions === null) return null
  return `${directions}|${relativeEndpointKey(
    simplified[0],
    nodes.get(edge.source)
  )}|${relativeEndpointKey(
    simplified[simplified.length - 1],
    nodes.get(edge.target)
  )}`
}

const segmentIntersectsRect = (
  a: IPoint,
  b: IPoint,
  rect: EdgeGeometryNodeRect
): boolean => {
  // Slab intersection works for orthogonal and diagonal segments alike. The
  // preview safety check is inclusive: a held route touching a node border should
  // yield immediately to the new exact route rather than flicker beneath the node.
  let entry = 0
  let exit = 1
  for (const [start, delta, min, max] of [
    [a.x, b.x - a.x, rect.x, rect.x + rect.width],
    [a.y, b.y - a.y, rect.y, rect.y + rect.height],
  ] as const) {
    if (delta === 0) {
      if (start < min || start > max) return false
      continue
    }
    const first = (min - start) / delta
    const second = (max - start) / delta
    entry = Math.max(entry, Math.min(first, second))
    exit = Math.min(exit, Math.max(first, second))
    if (entry > exit) return false
  }
  return true
}

const routeIntersectsUnrelatedNode = (
  route: readonly IPoint[],
  edge: Edge,
  nodes: EdgeGeometryNodeSnapshot
): boolean => {
  const ancestors = new Set<string>()
  for (const endpointId of [edge.source, edge.target]) {
    let parentId = nodes.get(endpointId)?.parentId
    while (parentId && !ancestors.has(parentId)) {
      ancestors.add(parentId)
      parentId = nodes.get(parentId)?.parentId
    }
  }
  const isEndpointDescendant = (nodeId: string): boolean => {
    const visited = new Set<string>()
    let parentId = nodes.get(nodeId)?.parentId
    while (parentId && !visited.has(parentId)) {
      if (parentId === edge.source || parentId === edge.target) return true
      visited.add(parentId)
      parentId = nodes.get(parentId)?.parentId
    }
    return false
  }
  for (const [nodeId, rect] of nodes) {
    if (
      nodeId === edge.source ||
      nodeId === edge.target ||
      ancestors.has(nodeId) ||
      isEndpointDescendant(nodeId) ||
      isRoutingParentNodeType(rect.type)
    )
      continue
    for (let index = 1; index < route.length; index++)
      if (segmentIntersectsRect(route[index - 1], route[index], rect))
        return true
  }
  return false
}

/**
 * Dense-scene Worker results describe sampled drag positions and can arrive
 * after the pointer has moved on. Keep coordinate projection live, but require
 * a changed side/port/route decision to appear in two consecutive exact
 * generations before displaying it. This preview-only hysteresis removes A/B/A
 * topology flicker without making the exact solver history-dependent.
 *
 * A displayed route that now crosses an unrelated node is replaced immediately;
 * visual stability must never preserve an obviously invalid obstacle detour.
 */
export const stabilizeProvisionalRoutes = ({
  displayedById,
  candidateById,
  edges,
  nodes,
  pendingDecisionById,
  holdDecisionEdgeTypes,
}: {
  displayedById: Readonly<Record<string, IPoint[]>>
  candidateById: Readonly<Record<string, IPoint[]>>
  edges: readonly Edge[]
  nodes: EdgeGeometryNodeSnapshot
  pendingDecisionById: ProvisionalRouteDecisionState
  /** During direct node manipulation, keep a valid displayed topology for these
   * edge types until release. Coordinate refinements still flow immediately and
   * an old route that enters another node is still replaced without delay. */
  holdDecisionEdgeTypes?: ReadonlySet<string>
}): {
  routeById: Record<string, IPoint[]>
  heldDecisionCount: number
  confirmedDecisionCount: number
  invalidatedDecisionCount: number
} => {
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]))
  const stabilized: Record<string, IPoint[]> = {}
  const candidateIds = new Set(Object.keys(candidateById))
  let heldDecisionCount = 0
  let confirmedDecisionCount = 0
  let invalidatedDecisionCount = 0

  for (const [edgeId, candidate] of Object.entries(candidateById)) {
    const displayed = displayedById[edgeId]
    const edge = edgeById.get(edgeId)
    if (!displayed || !edge) {
      stabilized[edgeId] = candidate
      pendingDecisionById.delete(edgeId)
      continue
    }
    const displayedDecision = provisionalRouteDecisionKey(
      displayed,
      edge,
      nodes
    )
    const candidateDecision = provisionalRouteDecisionKey(
      candidate,
      edge,
      nodes
    )
    const decisionsDiffer =
      displayedDecision !== null &&
      candidateDecision !== null &&
      displayedDecision !== candidateDecision
    const displayedInvalid =
      decisionsDiffer && routeIntersectsUnrelatedNode(displayed, edge, nodes)
    if (
      displayedDecision === null ||
      candidateDecision === null ||
      displayedDecision === candidateDecision ||
      displayedInvalid
    ) {
      stabilized[edgeId] = candidate
      pendingDecisionById.delete(edgeId)
      if (displayedInvalid) invalidatedDecisionCount++
      continue
    }
    const holdForGesture = holdDecisionEdgeTypes?.has(edge.type ?? "") ?? false
    if (
      !holdForGesture &&
      pendingDecisionById.get(edgeId) === candidateDecision
    ) {
      stabilized[edgeId] = candidate
      pendingDecisionById.delete(edgeId)
      confirmedDecisionCount++
    } else {
      stabilized[edgeId] = displayed
      pendingDecisionById.set(edgeId, candidateDecision)
      heldDecisionCount++
    }
  }

  for (const edgeId of pendingDecisionById.keys())
    if (!candidateIds.has(edgeId)) pendingDecisionById.delete(edgeId)
  return {
    routeById: stabilized,
    heldDecisionCount,
    confirmedDecisionCount,
    invalidatedDecisionCount,
  }
}

const normalizeSettlementRoute = (
  points: readonly IPoint[],
  leadingSegments: number,
  totalSegments: number
): IPoint[] => {
  const first = points[0]
  const last = points[points.length - 1]
  const normalized = [
    ...Array.from({ length: leadingSegments }, () => ({ ...first })),
    ...points.map((point) => ({ ...point })),
  ]
  while (normalized.length < totalSegments + 1) normalized.push({ ...last })
  return normalized
}

const interpolate = (from: number, to: number, progress: number): number =>
  from + (to - from) * progress

/**
 * Sample a polyline at equal arc-length intervals. This is used only for the
 * display handoff of arbitrary-angle routes; exact routing stays integer and
 * history-independent.
 */
const sampleSettlementRoute = (
  route: readonly IPoint[],
  pointCount: number
): IPoint[] => {
  const points = simplify(route)
  const lengths: number[] = []
  let total = 0
  for (let index = 1; index < points.length; index++) {
    total += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y
    )
    lengths.push(total)
  }
  if (total === 0)
    return Array.from({ length: pointCount }, () => ({ ...points[0] }))

  return Array.from({ length: pointCount }, (_, index) => {
    const distance = (total * index) / (pointCount - 1)
    let segment = lengths.findIndex((end) => end >= distance)
    if (segment < 0) segment = lengths.length - 1
    const startDistance = segment === 0 ? 0 : lengths[segment - 1]
    const endDistance = lengths[segment]
    const progress =
      endDistance === startDistance
        ? 0
        : (distance - startDistance) / (endDistance - startDistance)
    return {
      x: interpolate(points[segment].x, points[segment + 1].x, progress),
      y: interpolate(points[segment].y, points[segment + 1].y, progress),
    }
  })
}

/**
 * Pair two routes for point-wise display interpolation. Orthogonal pairs keep the
 * orientation-preserving zero-segment normalization. If either route is diagonal,
 * equal arc-length samples let bends appear, disappear, or change side smoothly.
 */
const normalizeSettlementPair = (
  fromRoute: readonly IPoint[],
  toRoute: readonly IPoint[]
): { from: IPoint[]; to: IPoint[] } | null => {
  const from = simplify(fromRoute)
  const to = simplify(toRoute)
  if (from.length < 2 || to.length < 2) return null
  const fromOrientations = routeOrientations(from)
  const toOrientations = routeOrientations(to)
  if (
    !fromOrientations?.length ||
    !toOrientations?.length ||
    fromOrientations.some(
      (orientation, index) =>
        index > 0 && orientation === fromOrientations[index - 1]
    ) ||
    toOrientations.some(
      (orientation, index) =>
        index > 0 && orientation === toOrientations[index - 1]
    )
  ) {
    const pointCount = Math.max(from.length, to.length, 3)
    return {
      from: sampleSettlementRoute(from, pointCount),
      to: sampleSettlementRoute(to, pointCount),
    }
  }

  const canonicalStart = fromOrientations[0]
  const fromLeading = 0
  const toLeading = toOrientations[0] === canonicalStart ? 0 : 1
  const totalSegments = Math.max(
    fromLeading + fromOrientations.length,
    toLeading + toOrientations.length
  )
  return {
    from: normalizeSettlementRoute(from, fromLeading, totalSegments),
    to: normalizeSettlementRoute(to, toLeading, totalSegments),
  }
}

/**
 * Capture routes whose accepted result differs from the current display.
 * Orthogonal routes remain orthogonal throughout the handoff; arbitrary-angle
 * routes use arc-length sampling so topology changes do not snap into place.
 */
export const prepareEdgeGeometrySettlement = (
  displayedById: Readonly<Record<string, IPoint[]>>,
  settledById: Readonly<Record<string, IPoint[]>>
): EdgeGeometrySettlementTransition => {
  const transitions: Record<string, EdgeGeometrySettlementTransition[string]> =
    {}
  for (const [edgeId, from] of Object.entries(displayedById)) {
    const to = settledById[edgeId]
    if (
      !to ||
      (from.length === to.length && from.every((p, i) => samePoint(p, to[i])))
    )
      continue
    const normalized = normalizeSettlementPair(from, to)
    if (!normalized) continue
    transitions[edgeId] = {
      from,
      to,
      normalizedFrom: normalized.from,
      normalizedTo: normalized.to,
    }
  }
  return transitions
}

/**
 * Return the transient display routes for one settlement frame. The cubic ease
 * moves decisively away from the stale preview and arrives gently at the exact
 * route. Orthogonal transitions stay orthogonal; straight-edge polylines can
 * interpolate at arbitrary angles.
 */
export const interpolateEdgeGeometrySettlement = (
  transitions: EdgeGeometrySettlementTransition,
  progress: number
): Record<string, IPoint[]> => {
  if (progress <= 0)
    return Object.fromEntries(
      Object.entries(transitions).map(([id, transition]) => [
        id,
        transition.from,
      ])
    )
  if (progress >= 1)
    return Object.fromEntries(
      Object.entries(transitions).map(([id, transition]) => [id, transition.to])
    )
  const eased = 1 - Math.pow(1 - progress, 3)
  return Object.fromEntries(
    Object.entries(transitions).map(([id, transition]) => [
      id,
      simplify(
        transition.normalizedFrom.map((point, index) => ({
          x: interpolate(point.x, transition.normalizedTo[index].x, eased),
          y: interpolate(point.y, transition.normalizedTo[index].y, eased),
        }))
      ),
    ])
  )
}

/**
 * Re-project only terminal geometry onto the current node rectangles. This is a
 * display-only bridge: authored internal bends remain fixed, every segment stays
 * orthogonal, and the exact versioned Worker result atomically replaces it.
 *
 * Normalised projection rather than a plain translation also handles node resize
 * and non-centred freeform ports without knowing the node's rendered shape.
 */
export const projectRoutesWhileSolving = (
  routeById: Readonly<Record<string, IPoint[]>>,
  edges: readonly Edge[],
  settledNodes: EdgeGeometryNodeSnapshot,
  currentNodes: EdgeGeometryNodeSnapshot,
  straightEdgeTypes: ReadonlySet<string> = NO_EDGE_TYPES
): Record<string, IPoint[]> => {
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]))
  const projected: Record<string, IPoint[]> = {}

  for (const [edgeId, route] of Object.entries(routeById)) {
    const edge = edgeById.get(edgeId)
    if (!edge) continue
    const fromSource = settledNodes.get(edge.source)
    const toSource = currentNodes.get(edge.source)
    const fromTarget = settledNodes.get(edge.target)
    const toTarget = currentNodes.get(edge.target)
    // Most routes are unrelated to one-node interaction. Preserve their exact
    // arrays so `preview[id] ?? exact[id]` stays reference-equal and those edge
    // components do not render merely because another route is projected.
    if (sameRect(fromSource, toSource) && sameRect(fromTarget, toTarget)) {
      projected[edgeId] = route
      continue
    }
    if (route.length === 0) {
      projected[edgeId] = route
      continue
    }
    if (!fromSource || !toSource || !fromTarget || !toTarget) {
      projected[edgeId] = route
      continue
    }

    const desired = route.map((point) => ({ ...point }))
    desired[0] = projectPoint(route[0], fromSource, toSource)
    if (route.length > 1)
      desired[desired.length - 1] = projectPoint(
        route[route.length - 1],
        fromTarget,
        toTarget
      )

    // Straight-hook routes deliberately contain arbitrary-angle segments. Keep
    // their settled bends fixed and attach only the terminals to the moving node.
    // Running them through the orthogonal projection below turns a two-point
    // diagonal into a four-segment step route until the Worker responds.
    if (straightEdgeTypes.has(edge.type ?? "")) {
      projected[edgeId] = simplify(desired)
      continue
    }

    if (desired.length === 2) {
      const source = desired[0]
      const target = desired[1]
      if (source.x === target.x || source.y === target.y) {
        projected[edgeId] = desired
        continue
      }
      const wasHorizontal = route[0].y === route[1].y
      const middle = wasHorizontal
        ? (source.x + target.x) / 2
        : (source.y + target.y) / 2
      projected[edgeId] = wasHorizontal
        ? [
            source,
            { x: middle, y: source.y },
            { x: middle, y: target.y },
            target,
          ]
        : [
            source,
            { x: source.x, y: middle },
            { x: target.x, y: middle },
            target,
          ]
      continue
    }

    // Retain the original terminal direction by moving the adjacent bend on the
    // perpendicular axis. The remaining authored/settled bends do not move.
    if (route[0].x === route[1].x) desired[1].x = desired[0].x
    else desired[1].y = desired[0].y
    const last = route.length - 1
    if (route[last - 1].x === route[last].x)
      desired[last - 1].x = desired[last].x
    else desired[last - 1].y = desired[last].y

    // A very short route can make the two terminal adjustments meet. Insert the
    // deterministic original-orientation elbow wherever that creates a diagonal.
    const orthogonal: IPoint[] = [desired[0]]
    for (let index = 1; index < desired.length; index++) {
      const previous = orthogonal[orthogonal.length - 1]
      const next = desired[index]
      if (previous.x !== next.x && previous.y !== next.y) {
        const originalPrevious = route[Math.max(0, index - 1)]
        const originalNext = route[Math.min(route.length - 1, index)]
        orthogonal.push(
          originalPrevious.y === originalNext.y
            ? { x: next.x, y: previous.y }
            : { x: previous.x, y: next.y }
        )
      }
      orthogonal.push(next)
    }
    projected[edgeId] = simplify(orthogonal)
  }
  return projected
}
