import {
  type Edge,
  type Node,
  type InternalNode,
  type Rect,
} from "@xyflow/react"
import { getEdgePosition, ConnectionMode, Position } from "@xyflow/system"
import { CANVAS, EDGES } from "@/utils/geometry/routingConstants"
import type { IPoint } from "@/edges/Connection"
import {
  getNodeConnectionRect,
  getRoutingPositionOnCanvas,
} from "@/utils/geometry/nodeGeometry"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getEdgeMarkerStyles,
  getTargetConnectionPointPadding,
  preserveOrthogonalEdgePoints,
  isFreeformEdgeAnchor,
  roundAnchorPointOutward,
  type FreeformEdgeAnchor,
} from "@/utils/edgeUtils"
import {
  getEdgeAnchorFromPoint,
  getEdgeAnchorPoint,
  getConnectionMode,
} from "@/utils/connectionModes"
import {
  createNodeIndex,
  getEdgeObstacles,
  getContainerBorderPolylines,
  type NodeIndex,
  type ObstacleRect,
} from "@/utils/geometry/obstacles"
import { routeStepEdge } from "@/utils/geometry/edgeRoute"
import {
  routeChosenAnchors,
  selectEdgeAnchors,
} from "@/utils/geometry/edgeAnchoring"
import {
  assignPorts,
  assignSides,
  endKey,
  type EndRef,
  type ReservedSideEnd,
  type SideEdge,
} from "@/utils/geometry/portAssignment"
import {
  canRunStraight,
  centerOf,
  sideAxisLength,
} from "@/utils/geometry/rectSides"
import {
  neighborsWithinReach,
  routeConflictScore,
  routeConflictsWithNeighborEdges,
} from "@/utils/geometry/orthogonalRouter"
import { lexLess } from "@/utils/geometry/scalar"
import { recordRouteScorePair, recordRouteScoreRun } from "@/sync/perfCounters"
import {
  polylineConflictCost,
  ROUTING_COST,
  sideGapBalance,
  weightedRoutingCost,
} from "@/utils/geometry/routingCost"

/**
 * One edge's endpoints, resolved from the React Flow store so all edges can be
 * solved in one pass. Uses `getPositionOnCanvas` (not
 * `internals.positionAbsolute`) so the freeform rect matches nested nodes.
 */
export type ResolvedEdgeEndpoints = {
  adjustedSource: IPoint
  adjustedTarget: IPoint
  sourcePosition: Position
  targetPosition: Position
  rounded: {
    sourceX: number
    sourceY: number
    targetX: number
    targetY: number
  }
  sourceAbsolutePosition: IPoint
  targetAbsolutePosition: IPoint
  sourceSize: { width: number; height: number }
  targetSize: { width: number; height: number }
  padding: number
}

const nodeWidth = (node: Node): number | undefined =>
  node.width ?? node.measured?.width
const nodeHeight = (node: Node): number | undefined =>
  node.height ?? node.measured?.height

/**
 * Resolve one edge's endpoints, or `null` when the base position is unknowable
 * (a node not yet measured) so the caller can hold the previous route.
 */
function resolveEdgeEndpoints(
  edge: Edge,
  nodes: readonly Node[],
  nodeById: Map<string, Node>,
  nodeLookup: Map<string, InternalNode>,
  connectionMode: ConnectionMode,
  /** Anchors to use INSTEAD of the edge's own — how the auto-anchor selector asks
   * "what would this edge look like anchored here". Absent ends fall back to the
   * edge's stored (custom) anchor, then to React Flow's default point. */
  overrideAnchors?: {
    sourceAnchor?: FreeformEdgeAnchor
    targetAnchor?: FreeformEdgeAnchor
  },
  /** Skip React Flow's `getEdgePosition` — pure waste when BOTH ends resolve to an
   * anchor, which every auto-selection candidate and every cache-hit re-resolve
   * does. Safe only once a plain resolve has confirmed the nodes are measured;
   * this is the single hottest call in the solve, run for every candidate. */
  skipBase?: boolean,
  /** Solve-scoped absolute node geometry. Candidate resolution calls this hot
   * path repeatedly; reuse the exact snapshot the obstacle solver already built
   * instead of re-walking parent chains for every candidate pair. */
  nodeIndex?: NodeIndex
): ResolvedEdgeEndpoints | null {
  const sourceInternal = nodeLookup.get(edge.source)
  const targetInternal = nodeLookup.get(edge.target)
  if (!sourceInternal || !targetInternal) return null

  const sourceNode = nodeById.get(edge.source)
  const targetNode = nodeById.get(edge.target)

  const sourceRect =
    nodeIndex?.entries.get(edge.source)?.body ??
    (sourceNode && (nodeWidth(sourceNode) ?? 0) > 0
      ? {
          ...getRoutingPositionOnCanvas(sourceNode, nodes),
          width: nodeWidth(sourceNode)!,
          height: nodeHeight(sourceNode) ?? 0,
        }
      : null)
  const targetRect =
    nodeIndex?.entries.get(edge.target)?.body ??
    (targetNode && (nodeWidth(targetNode) ?? 0) > 0
      ? {
          ...getRoutingPositionOnCanvas(targetNode, nodes),
          width: nodeWidth(targetNode)!,
          height: nodeHeight(targetNode) ?? 0,
        }
      : null)

  const sourceAnchor =
    overrideAnchors?.sourceAnchor ??
    (edge.data?.sourceAnchor as FreeformEdgeAnchor | undefined)
  const targetAnchor =
    overrideAnchors?.targetAnchor ??
    (edge.data?.targetAnchor as FreeformEdgeAnchor | undefined)
  const resolvedSourceAnchor =
    sourceRect && isFreeformEdgeAnchor(sourceAnchor)
      ? getEdgeAnchorPoint(sourceNode?.type, sourceRect, sourceAnchor)
      : null
  const resolvedTargetAnchor =
    targetRect && isFreeformEdgeAnchor(targetAnchor)
      ? getEdgeAnchorPoint(targetNode?.type, targetRect, targetAnchor)
      : null

  // The base point is needed only where an anchor did not resolve. When the
  // caller guarantees both ends are anchored, computing it is pure waste.
  const base =
    skipBase && resolvedSourceAnchor && resolvedTargetAnchor
      ? null
      : getEdgePosition({
          id: edge.id,
          sourceNode: sourceInternal,
          targetNode: targetInternal,
          sourceHandle: edge.sourceHandle ?? null,
          targetHandle: edge.targetHandle ?? null,
          connectionMode,
        })
  if (!base && !(resolvedSourceAnchor && resolvedTargetAnchor)) return null

  const sourceAbsolutePosition = sourceRect
    ? { x: sourceRect.x, y: sourceRect.y }
    : { x: base!.sourceX, y: base!.sourceY }
  const targetAbsolutePosition = targetRect
    ? { x: targetRect.x, y: targetRect.y }
    : { x: base!.targetX, y: base!.targetY }

  const { markerPadding } = getEdgeMarkerStyles(edge.type ?? "")
  const padding = markerPadding ?? EDGES.MARKER_PADDING

  const sourceX = resolvedSourceAnchor?.point.x ?? base!.sourceX
  const sourceY = resolvedSourceAnchor?.point.y ?? base!.sourceY
  const targetX = resolvedTargetAnchor?.point.x ?? base!.targetX
  const targetY = resolvedTargetAnchor?.point.y ?? base!.targetY
  const sourcePosition = resolvedSourceAnchor?.position ?? base!.sourcePosition
  const targetPosition = resolvedTargetAnchor?.position ?? base!.targetPosition
  const sourceConnectionPointPadding = resolvedSourceAnchor
    ? 0
    : EDGES.SOURCE_CONNECTION_POINT_PADDING
  const targetConnectionPointPadding = getTargetConnectionPointPadding(
    padding,
    resolvedTargetAnchor !== null
  )

  const roundedSource = resolvedSourceAnchor
    ? roundAnchorPointOutward(resolvedSourceAnchor.point, sourcePosition)
    : { x: Math.round(sourceX), y: Math.round(sourceY) }
  const roundedTarget = resolvedTargetAnchor
    ? roundAnchorPointOutward(resolvedTargetAnchor.point, targetPosition)
    : { x: Math.round(targetX), y: Math.round(targetY) }
  const roundedSourceX = roundedSource.x
  const roundedSourceY = roundedSource.y
  const roundedTargetX = roundedTarget.x
  const roundedTargetY = roundedTarget.y

  const adjustedTarget = adjustTargetCoordinates(
    roundedTargetX,
    roundedTargetY,
    targetPosition,
    targetConnectionPointPadding
  )
  const adjustedSource = adjustSourceCoordinates(
    roundedSourceX,
    roundedSourceY,
    sourcePosition,
    sourceConnectionPointPadding
  )

  return {
    adjustedSource: { x: adjustedSource.sourceX, y: adjustedSource.sourceY },
    adjustedTarget: { x: adjustedTarget.targetX, y: adjustedTarget.targetY },
    sourcePosition,
    targetPosition,
    rounded: {
      sourceX: roundedSourceX,
      sourceY: roundedSourceY,
      targetX: roundedTargetX,
      targetY: roundedTargetY,
    },
    sourceAbsolutePosition,
    targetAbsolutePosition,
    sourceSize: {
      width: sourceRect?.width ?? nodeWidth(sourceNode!) ?? 100,
      height: sourceRect?.height ?? nodeHeight(sourceNode!) ?? 160,
    },
    targetSize: {
      width: targetRect?.width ?? nodeWidth(targetNode!) ?? 100,
      height: targetRect?.height ?? nodeHeight(targetNode!) ?? 160,
    },
    padding,
  }
}

/** Merge a computed route with any stored manual bend points. */
function mergeManualPoints(
  edge: Edge,
  computedPoints: IPoint[],
  endpoints: ResolvedEdgeEndpoints
): IPoint[] {
  const storedPoints = edge.data?.points as IPoint[] | undefined
  const hasManualPoints = Boolean(storedPoints && storedPoints.length > 0)
  const shouldPreferComputedPath =
    computedPoints.length === 2 && !hasManualPoints
  if (shouldPreferComputedPath) return computedPoints

  const points =
    storedPoints && storedPoints.length > 0 ? storedPoints : computedPoints

  if (hasManualPoints && points.length >= 2) {
    return preserveOrthogonalEdgePoints(
      points,
      endpoints.adjustedSource,
      endpoints.adjustedTarget,
      endpoints.sourcePosition,
      endpoints.targetPosition
    )
  }
  return points
}

/**
 * A grid bucketing each already-routed edge's polyline by cell, so an edge finds
 * its nearby neighbours without scanning every routed edge (the walk is
 * ascending-id, so a full scan is O(edges) per edge → O(edges²) per frame). The
 * cell only has to be a spatial hint: the caller re-checks each candidate against
 * the exact box, so the result is identical to a full scan.
 *
 * Every cell a SEGMENT passes through is bucketed, not just its vertices — a long
 * run (say a 2000px edge) can cross a query box with both endpoints several cells
 * away, so vertex-only bucketing would hide it from an edge that must not draw over
 * it.
 */
type NeighborGrid = Map<string, string[]>
const NEIGHBOR_CELL_PX = 256
const cellKey = (cx: number, cy: number): string => `${cx},${cy}`

/** Bucket `edgeId` under every cell its polyline's segments pass through. */
function indexRoutePolyline(
  grid: NeighborGrid,
  edgeId: string,
  polyline: readonly IPoint[]
): void {
  const addToCell = (cx: number, cy: number): void => {
    const key = cellKey(cx, cy)
    const bucket = grid.get(key)
    if (bucket) {
      if (bucket[bucket.length - 1] !== edgeId) bucket.push(edgeId)
    } else {
      grid.set(key, [edgeId])
    }
  }
  const cellOf = (v: number): number => Math.floor(v / NEIGHBOR_CELL_PX)

  if (polyline.length === 1) {
    addToCell(cellOf(polyline[0].x), cellOf(polyline[0].y))
    return
  }
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i]
    const b = polyline[i + 1]
    // Routes are orthogonal, so one axis is constant and this fills a single row or
    // column of cells; a stray diagonal would fill its bounding block — over-inclusive
    // but safe, since the exact segment-vs-box test in the query drops the extras.
    const cxLo = Math.min(cellOf(a.x), cellOf(b.x))
    const cxHi = Math.max(cellOf(a.x), cellOf(b.x))
    const cyLo = Math.min(cellOf(a.y), cellOf(b.y))
    const cyHi = Math.max(cellOf(a.y), cellOf(b.y))
    for (let cx = cxLo; cx <= cxHi; cx++) {
      for (let cy = cyLo; cy <= cyHi; cy++) addToCell(cx, cy)
    }
  }
}

/** Whether any segment of an orthogonal polyline intersects the axis-aligned box.
 * A segment's bounding box equals the segment itself (it is axis-aligned), so an
 * AABB overlap is an exact crossing test here. Exported for the neighbour-detection
 * regression test (a long segment must be found even with both ends outside the box). */
export function polylineIntersectsBox(
  polyline: readonly IPoint[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): boolean {
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i]
    const b = polyline[i + 1]
    if (
      Math.min(a.x, b.x) <= maxX &&
      Math.max(a.x, b.x) >= minX &&
      Math.min(a.y, b.y) <= maxY &&
      Math.max(a.y, b.y) >= minY
    ) {
      return true
    }
  }
  return false
}

type EdgeEnd = "source" | "target"
type SharedPinnedJunction = {
  firstEnd: EdgeEnd
  secondEnd: EdgeEnd
}

const pinnedAnchor = (
  edge: Edge,
  end: EdgeEnd
): FreeformEdgeAnchor | undefined => {
  const value =
    end === "source" ? edge.data?.sourceAnchor : edge.data?.targetAnchor
  return isFreeformEdgeAnchor(value) ? value : undefined
}

const samePinnedAnchor = (
  first: FreeformEdgeAnchor | undefined,
  second: FreeformEdgeAnchor | undefined
): boolean =>
  first !== undefined &&
  second !== undefined &&
  first.side === second.side &&
  Math.abs(first.ratio - second.ratio) <= 1e-9

const NO_SHARED_PINNED_JUNCTIONS: readonly SharedPinnedJunction[] = []

/**
 * An exact co-pin on the same node is an authored junction, not an accidental
 * edge overlap. The edge types stay irrelevant: users explicitly create this
 * topology by pinning the endpoints together.
 */
const sharedPinnedJunctions = (
  first: Edge,
  second: Edge
): readonly SharedPinnedJunction[] => {
  const firstSource = pinnedAnchor(first, "source")
  const firstTarget = pinnedAnchor(first, "target")
  const secondSource = pinnedAnchor(second, "source")
  const secondTarget = pinnedAnchor(second, "target")
  if ((!firstSource && !firstTarget) || (!secondSource && !secondTarget))
    return NO_SHARED_PINNED_JUNCTIONS

  const result: SharedPinnedJunction[] = []
  if (
    first.source === second.source &&
    samePinnedAnchor(firstSource, secondSource)
  )
    result.push({ firstEnd: "source", secondEnd: "source" })
  if (
    first.source === second.target &&
    samePinnedAnchor(firstSource, secondTarget)
  )
    result.push({ firstEnd: "source", secondEnd: "target" })
  if (
    first.target === second.source &&
    samePinnedAnchor(firstTarget, secondSource)
  )
    result.push({ firstEnd: "target", secondEnd: "source" })
  if (
    first.target === second.target &&
    samePinnedAnchor(firstTarget, secondTarget)
  )
    result.push({ firstEnd: "target", secondEnd: "target" })
  return result
}

/** Gather nearby routed edges and synthetic container borders separately.
 * Borders prevent a route from lying along a package/pool frame, but crossing a
 * frame to leave its own container is not an edge crossing and must not inherit
 * the diagram-edge crossing price. */
function collectNeighbors(
  edge: Edge,
  endpoints: ResolvedEdgeEndpoints,
  nodes: readonly Node[],
  nodeIndex: NodeIndex,
  obstacles: readonly ObstacleRect[],
  routeById: Record<string, IPoint[]>,
  grid: NeighborGrid,
  edgeById: ReadonlyMap<string, Edge>
): { edgeRoutes: IPoint[][]; containerBorders: IPoint[][] } {
  const borders = getContainerBorderPolylines(
    nodes,
    edge.source,
    edge.target,
    nodeIndex
  )

  // Query the union of both endpoint NODE rectangles, not React Flow's initial
  // guessed connection points. Auto selection may leave from any of the four
  // sides, so a neighbour reachable from an alternate side is part of the joint
  // objective even when it lies outside the base-endpoint box.
  const sx0 = endpoints.sourceAbsolutePosition.x
  const sy0 = endpoints.sourceAbsolutePosition.y
  const sx1 = sx0 + endpoints.sourceSize.width
  const sy1 = sy0 + endpoints.sourceSize.height
  const tx0 = endpoints.targetAbsolutePosition.x
  const ty0 = endpoints.targetAbsolutePosition.y
  const tx1 = tx0 + endpoints.targetSize.width
  const ty1 = ty0 + endpoints.targetSize.height
  const pad = EDGES.STUB_LENGTH * 6
  let minX = Math.min(sx0, tx0)
  let maxX = Math.max(sx1, tx1)
  let minY = Math.min(sy0, ty0)
  let maxY = Math.max(sy1, ty1)
  for (const obstacle of obstacles) {
    if (obstacle.x < minX) minX = obstacle.x
    if (obstacle.x + obstacle.width > maxX) maxX = obstacle.x + obstacle.width
    if (obstacle.y < minY) minY = obstacle.y
    if (obstacle.y + obstacle.height > maxY) maxY = obstacle.y + obstacle.height
  }
  minX -= pad
  maxX += pad
  minY -= pad
  maxY += pad

  // Candidate committed edges: those with a segment in a cell overlapping the box.
  // indexRoutePolyline buckets every cell a segment crosses, so a long run spanning
  // the box is caught even with both endpoints far outside it. The exact
  // segment-vs-box test below drops the cell's out-of-box extras.
  const candidateIds = new Set<string>()
  const cx0 = Math.floor(minX / NEIGHBOR_CELL_PX)
  const cx1 = Math.floor(maxX / NEIGHBOR_CELL_PX)
  const cy0 = Math.floor(minY / NEIGHBOR_CELL_PX)
  const cy1 = Math.floor(maxY / NEIGHBOR_CELL_PX)
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cy = cy0; cy <= cy1; cy++) {
      const bucket = grid.get(cellKey(cx, cy))
      if (bucket) for (const id of bucket) candidateIds.add(id)
    }
  }

  const polylineKey = (polyline: readonly IPoint[]): string =>
    polyline.map((point) => `${point.x},${point.y}`).join(";")
  const keys = new Map(
    [...candidateIds].map((id) => [id, polylineKey(routeById[id] ?? [])])
  )
  // Canonical GEOMETRY order makes hashing and A* independent of both bucket
  // insertion and edge names. ID is used only when two polylines are identical.
  const ordered = [...candidateIds].sort((a, b) => {
    const ak = keys.get(a)!
    const bk = keys.get(b)!
    return ak < bk ? -1 : ak > bk ? 1 : a < b ? -1 : a > b ? 1 : 0
  })

  const neighbors: IPoint[][] = []
  for (const otherId of ordered) {
    const polyline = routeById[otherId]
    if (!polyline || polyline.length < 2) continue
    const other = edgeById.get(otherId)
    if (other && sharedPinnedJunctions(edge, other).length > 0) continue
    // Ordinary siblings are intentionally included. The node-local coordinator
    // proposes distinct ports, but capacity is soft; pricing committed stubs lets
    // the joint search reject accidental overlap. Exact co-pins were filtered
    // above because their common terminal trunk is authored topology.
    if (polylineIntersectsBox(polyline, minX, maxX, minY, maxY)) {
      neighbors.push(polyline)
    }
  }
  return { edgeRoutes: neighbors, containerBorders: borders }
}

export type LiveEdgeOverride = {
  edgeId: string
  points: IPoint[]
  edge?: Edge
  strategy?: "authoritative" | "predicted"
}

/**
 * Turn the interaction-layer live state into the exact edge set and override the
 * route solver should see. A bend is authored geometry and remains authoritative.
 * An endpoint reconnect instead substitutes the edge that pointer-up will commit,
 * then removes the override so that edge receives ordinary committed routing.
 */
export function prepareLiveEdgeSolve(
  edges: readonly Edge[],
  liveOverride: LiveEdgeOverride | null | undefined
): { edges: readonly Edge[]; liveOverride: LiveEdgeOverride | null } {
  if (liveOverride?.strategy !== "predicted" || liveOverride.edge === undefined)
    return { edges, liveOverride: liveOverride ?? null }
  const predictedEdge = liveOverride.edge

  return {
    edges: edges.map((edge) =>
      edge.id === liveOverride.edgeId ? predictedEdge : edge
    ),
    liveOverride: null,
  }
}

export type SolverInput = {
  nodes: readonly Node[]
  nodeLookup: Map<string, InternalNode>
  connectionMode: ConnectionMode
  edges: readonly Edge[]
  /** Step-edge types that attempt a straight shot first (enableStraightPath). */
  straightPathTypes: ReadonlySet<string>
  /** Types rendered as a plain two-point line (the straight-path hook). */
  straightHookTypes: ReadonlySet<string>
  /** Immutable edges omitted from a bounded refinement pass. Their routes are
   * already present in `fixedRoutes`, but their endpoint reservations still
   * participate in node-local side/port coordination. Internal-only. */
  fixedEdges?: readonly Edge[]
  /** An in-progress drag preview. Authored bend geometry is authoritative and
   * routed first. A predicted reconnect substitutes the edge pointer-up will
   * commit, then follows the ordinary automatic-routing path so preview and
   * commit expose the same constraints to every neighbouring edge. */
  liveOverride?: LiveEdgeOverride | null
  /** Previous routes, held for edges whose endpoints are momentarily unknown. */
  previous?: Record<string, IPoint[]>
  /**
   * Cross-frame memo of each edge's routed (pre-manual-merge) polyline, keyed on
   * a signature of EVERY input `routeStepEdge` consumes. `routeStepEdge` is pure,
   * so an unchanged signature means an unchanged route — the search is skipped and
   * the cached polyline reused. Owned by the caller (a ref) and mutated in place.
   * Dragging one node leaves every distant edge's signature untouched, so only the
   * edges the move can actually have shifted re-search.
   */
  solveCache?: Map<string, EdgeSolveCacheEntry>
  /** Solve-scoped immutable geometry shared by the canonical and bounded
   * refinement passes. Internal only: callers may omit it and receive a fresh
   * snapshot. */
  nodeIndex?: NodeIndex
}

/** One edge's cached solve. For auto edges `sig` is the complete JOINT signature:
 * candidates, obstacles and reachable neighbours all participate because any one
 * of them may change both the winning endpoints and route. `routeSig` remains for
 * fixed-edge compatibility; auto solves leave it empty. */
export type EdgeSolveCacheEntry = {
  sig: string
  routeSig: string
  computed: IPoint[]
  sourceAnchor?: FreeformEdgeAnchor
  targetAnchor?: FreeformEdgeAnchor
  /** A small exact-result history. Interactive edits commonly revisit the same
   * snapped geometry while a pointer crosses a grid boundary in either direction.
   * Keeping those prior signatures avoids throwing away a fully proven solve just
   * because one intermediate frame temporarily replaced the edge's active entry. */
  alternatives?: EdgeSolveCacheEntry[]
}

const MAX_EDGE_SOLVE_HISTORY = 4

const cachedSolve = (
  cache: Map<string, EdgeSolveCacheEntry> | undefined,
  edgeId: string,
  sig: string
): EdgeSolveCacheEntry | undefined => {
  const active = cache?.get(edgeId)
  if (!active) return undefined
  if (active.sig === sig) return active
  const matched = active.alternatives?.find((entry) => entry.sig === sig)
  if (!matched || !cache) return matched
  const history = [active, ...(active.alternatives ?? [])]
    .filter((entry) => entry.sig !== matched.sig)
    .slice(0, MAX_EDGE_SOLVE_HISTORY)
    .map(({ alternatives: _alternatives, ...entry }) => entry)
  const promoted = { ...matched, alternatives: history }
  cache.set(edgeId, promoted)
  return promoted
}

const rememberSolve = (
  cache: Map<string, EdgeSolveCacheEntry> | undefined,
  edgeId: string,
  entry: EdgeSolveCacheEntry
): void => {
  if (!cache) return
  const previous = cache.get(edgeId)
  if (!previous || previous.sig === entry.sig) {
    cache.set(edgeId, entry)
    return
  }
  const history = [previous, ...(previous.alternatives ?? [])]
    .filter((candidate) => candidate.sig !== entry.sig)
    .slice(0, MAX_EDGE_SOLVE_HISTORY)
    .map(({ alternatives: _alternatives, ...candidate }) => candidate)
  cache.set(edgeId, { ...entry, alternatives: history })
}

/** Lossless digest of every input `routeStepEdge` reads. Geometry only (obstacle
 * ids don't affect the route); NOT `edge.data.points`, which `mergeManualPoints`
 * layers on AFTER and is applied fresh every frame. */
function routeSignature(
  enableStraightPath: boolean,
  endpoints: ResolvedEdgeEndpoints,
  obstacles: readonly ObstacleRect[],
  neighborSignature: string
): string {
  const e = endpoints
  const r = e.rounded
  const parts: string[] = [
    enableStraightPath ? "1" : "0",
    `${e.adjustedSource.x},${e.adjustedSource.y},${e.adjustedTarget.x},${e.adjustedTarget.y}`,
    `${e.sourcePosition},${e.targetPosition},${e.padding}`,
    `${r.sourceX},${r.sourceY},${r.targetX},${r.targetY}`,
    `${e.sourceAbsolutePosition.x},${e.sourceAbsolutePosition.y},${e.targetAbsolutePosition.x},${e.targetAbsolutePosition.y}`,
    `${e.sourceSize.width},${e.sourceSize.height},${e.targetSize.width},${e.targetSize.height}`,
  ]
  parts.push(serializeObstacles(obstacles), neighborSignature)
  return parts.join("|")
}

const serializeObstacles = (obstacles: readonly ObstacleRect[]): string => {
  let key = "O"
  for (const b of obstacles)
    key += `;${b.x},${b.y},${b.width},${b.height},${b.soft ? 1 : 0}`
  return key
}

/** Cache exactly the part of neighbouring geometry that the router can observe.
 * Long polylines are clipped to the reachable corridor, including whether a
 * surviving endpoint is a real terminal. Moving a remote endpoint outside that
 * corridor therefore no longer invalidates an otherwise identical route. */
function reachableNeighborSignature(
  endpoints: ResolvedEdgeEndpoints,
  obstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][],
  allEndpointSides: boolean
): string {
  const sourceRect = rectFromEndpoint(
    endpoints.sourceAbsolutePosition,
    endpoints.sourceSize
  )
  const targetRect = rectFromEndpoint(
    endpoints.targetAbsolutePosition,
    endpoints.targetSize
  )
  const corners = (rect: Rect): IPoint[] => [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ]
  const points = allEndpointSides
    ? [...corners(sourceRect), ...corners(targetRect)]
    : [endpoints.adjustedSource, endpoints.adjustedTarget]
  const segments = neighborsWithinReach(
    points[0],
    points.slice(1),
    obstacles,
    neighborEdges
  )
  let key = "N"
  for (const segment of segments) {
    key += `;${segment.x1},${segment.y1},${segment.x2},${segment.y2},${segment.startTerminal ? 1 : 0},${segment.endTerminal ? 1 : 0}`
  }
  return key
}

/** The router's input for one resolved endpoint pair. Shared by the fixed-edge
 * path and the auto-anchor fallback so both route through the same primitive. */
function routeStepParams(
  endpoints: ResolvedEdgeEndpoints,
  obstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][],
  enableStraightPath: boolean
) {
  return {
    enableStraightPath,
    adjustedSource: endpoints.adjustedSource,
    adjustedTarget: endpoints.adjustedTarget,
    sourcePosition: endpoints.sourcePosition,
    targetPosition: endpoints.targetPosition,
    padding: endpoints.padding,
    rounded: endpoints.rounded,
    sourceAbsolutePosition: endpoints.sourceAbsolutePosition,
    targetAbsolutePosition: endpoints.targetAbsolutePosition,
    sourceSize: endpoints.sourceSize,
    targetSize: endpoints.targetSize,
    obstacles,
    neighborEdges,
  }
}

/**
 * Digest of everything the JOINT endpoint-and-route solve depends on: endpoint
 * rectangles and types, custom locks, node-local port suggestions, marker padding,
 * the complete obstacle field, and committed neighbours. There is intentionally no
 * anchor-only cache layer: an obstacle or neighbour can change the winning port.
 *
 * PLUS the marker padding. `selectEdgeAnchors` re-resolves each candidate through
 * `resolveEdgeEndpoints`, which sets an auto endpoint back by `endpoints.padding` (the
 * edge type's marker gap) before the route is scored. Two edge types with the same node
 * rects but different markers can therefore pick different anchors, so the padding is
 * part of the key as well.
 */
function autoAnchorSignature(
  endpoints: ResolvedEdgeEndpoints,
  sourceType: string | undefined,
  targetType: string | undefined,
  sourceCustom: FreeformEdgeAnchor | undefined,
  targetCustom: FreeformEdgeAnchor | undefined,
  sourcePreferred: FreeformEdgeAnchor | undefined,
  targetPreferred: FreeformEdgeAnchor | undefined,
  enableStraightPath: boolean,
  obstacles: readonly ObstacleRect[],
  neighborSignature: string
): string {
  const e = endpoints
  const anchor = (a: FreeformEdgeAnchor | undefined) =>
    a ? `${a.side},${a.ratio}` : "-"
  return [
    enableStraightPath ? "1" : "0",
    `${sourceType ?? ""},${targetType ?? ""}`,
    // Marker gap an auto endpoint is set back by before scoring (see doc comment).
    `${e.padding}`,
    `${e.sourceAbsolutePosition.x},${e.sourceAbsolutePosition.y},${e.sourceSize.width},${e.sourceSize.height}`,
    `${e.targetAbsolutePosition.x},${e.targetAbsolutePosition.y},${e.targetSize.width},${e.targetSize.height}`,
    // Includes any PINNED anchor — a user override OR a solver-assigned band port for
    // a crowded side. A crowded side re-bands when a different edge joins/leaves it, so
    // the band ratio here changes and the pick is re-gated with no extra fan key.
    `${anchor(sourceCustom)};${anchor(targetCustom)}`,
    `${anchor(sourcePreferred)};${anchor(targetPreferred)}`,
    // Full route geometry, including soft containers. Endpoint selection and A*
    // are one optimisation, so there is no valid anchor-only subset of this key.
    serializeObstacles(obstacles),
    neighborSignature,
  ].join("|")
}

const rectFromEndpoint = (
  absolutePosition: IPoint,
  size: { width: number; height: number }
): Rect => ({
  x: absolutePosition.x,
  y: absolutePosition.y,
  width: size.width,
  height: size.height,
})

const asFreeformAnchor = (value: unknown): FreeformEdgeAnchor | undefined =>
  isFreeformEdgeAnchor(value) ? value : undefined

/** A node's absolute rect from its measured size, or null when it is not yet
 * measured — the same rect the anchor selector scores against
 * (`getPositionOnCanvas` + measured size). */
function nodeRect(
  nodeId: string,
  nodes: readonly Node[],
  nodeById: Map<string, Node>
): Rect | null {
  const node = nodeById.get(nodeId)
  if (!node) return null
  const w = nodeWidth(node)
  if (!w || w <= 0) return null
  return {
    ...getRoutingPositionOnCanvas(node, nodes),
    width: w,
    height: nodeHeight(node) ?? 0,
  }
}

type FixedPortByEnd = Map<string, FreeformEdgeAnchor>

/**
 * Extract the endpoint seats that optimization may not move. Explicit pins are
 * fixed individually; manual/live/straight-hook routes fix both ends because their
 * topology is not an anchor-search variable. Re-resolving legacy manual endpoints
 * against the current nodes keeps their reservations attached after a node move.
 */
function collectFixedPorts(
  edges: readonly Edge[],
  nodes: readonly Node[],
  nodeById: Map<string, Node>,
  nodeLookup: Map<string, InternalNode>,
  connectionMode: ConnectionMode,
  straightHookTypes: ReadonlySet<string>,
  liveOverride: LiveEdgeOverride | null | undefined,
  fixedRoutes: Readonly<Record<string, IPoint[]>>,
  nodeIndex: NodeIndex
): FixedPortByEnd {
  const result: FixedPortByEnd = new Map()
  for (const edge of edges) {
    const sourcePinned = asFreeformAnchor(edge.data?.sourceAnchor)
    const targetPinned = asFreeformAnchor(edge.data?.targetAnchor)
    if (sourcePinned) result.set(endKey(edge.id, "source"), sourcePinned)
    if (targetPinned) result.set(endKey(edge.id, "target"), targetPinned)

    const topologyFixed =
      edge.id === liveOverride?.edgeId ||
      straightHookTypes.has(edge.type ?? "") ||
      edge.source === edge.target ||
      (Array.isArray(edge.data?.points) && edge.data.points.length > 0) ||
      fixedRoutes[edge.id] !== undefined
    if (!topologyFixed || (sourcePinned && targetPinned)) continue

    const endpoints = resolveEdgeEndpoints(
      edge,
      nodes,
      nodeById,
      nodeLookup,
      connectionMode,
      undefined,
      undefined,
      nodeIndex
    )
    if (!endpoints) continue
    const fixedRoute =
      edge.id === liveOverride?.edgeId
        ? liveOverride.points
        : fixedRoutes[edge.id]
    const sourcePoint = fixedRoute?.[0] ?? endpoints.adjustedSource
    const targetPoint =
      fixedRoute?.[fixedRoute.length - 1] ?? endpoints.adjustedTarget
    if (!sourcePinned) {
      const sourceRect = nodeRect(edge.source, nodes, nodeById)
      const anchor =
        sourceRect &&
        getEdgeAnchorFromPoint(
          nodeById.get(edge.source)?.type,
          sourcePoint,
          sourceRect
        )
      if (anchor) result.set(endKey(edge.id, "source"), anchor)
    }
    if (!targetPinned) {
      const targetRect = nodeRect(edge.target, nodes, nodeById)
      const anchor =
        targetRect &&
        getEdgeAnchorFromPoint(
          nodeById.get(edge.target)?.type,
          targetPoint,
          targetRect
        )
      if (anchor) result.set(endKey(edge.id, "target"), anchor)
    }
  }
  return result
}

/** Every endpoint on a MULTI-EDGE node, tagged with its geometric side/order.
 * Mutable ends receive soft side/seat proposals; customized ends enter the same
 * capacity model as immutable reservations. Ends of single-edge nodes are omitted:
 * there is no sibling capacity to coordinate there. */
function collectPortEnds(
  ordered: readonly Edge[],
  nodes: readonly Node[],
  nodeById: Map<string, Node>,
  fixedPorts: FixedPortByEnd,
  reservedRoutes: readonly IPoint[][],
  /** Optional feedback from a completed route set. It closes the side → port →
   * route loop: when the joint router legitimately changes a proposed side, the
   * next bounded pass balances the ports that actually remained on each side. */
  sideOverrideByEnd?: ReadonlyMap<string, Position>
): EndRef[] {
  // Every endpoint consumes node-side capacity, including customized endpoints.
  // A lone mutable edge next to a pin is therefore still coordinated rather than
  // collapsing to the node centre when the other edge becomes authoritative.
  const endsByNode = new Map<string, number>()
  for (const edge of ordered) {
    if (edge.source === edge.target) continue
    endsByNode.set(edge.source, (endsByNode.get(edge.source) ?? 0) + 1)
    endsByNode.set(edge.target, (endsByNode.get(edge.target) ?? 0) + 1)
  }
  // The band ends are the FREE ends on MULTI-EDGE nodes. Their sides are chosen JOINTLY
  // (per edge, min corners over the side PAIR) so a diagonal fork arm is a 1-corner L,
  // not a 2-corner Z, and a straight edge claims its opposing sides first.
  const isBand = (
    nodeId: string,
    edgeId: string,
    end: "source" | "target"
  ): boolean =>
    !fixedPorts.has(endKey(edgeId, end)) && (endsByNode.get(nodeId) ?? 0) > 1
  const sideEdges: SideEdge[] = []
  const bodyRectCache = new Map<string, Rect | null>()
  const bodyRectOf = (nodeId: string): Rect | null => {
    if (!bodyRectCache.has(nodeId))
      bodyRectCache.set(nodeId, nodeRect(nodeId, nodes, nodeById))
    return bodyRectCache.get(nodeId) ?? null
  }
  const rectCache = new Map<string, Rect | null>()
  const rectOf = (nodeId: string): Rect | null => {
    if (!rectCache.has(nodeId)) {
      const body = bodyRectOf(nodeId)
      rectCache.set(
        nodeId,
        body ? getNodeConnectionRect(nodeById.get(nodeId)?.type, body) : null
      )
    }
    return rectCache.get(nodeId) ?? null
  }
  for (const edge of ordered) {
    if (edge.source === edge.target) continue
    const sourceRect = rectOf(edge.source)
    const targetRect = rectOf(edge.target)
    if (!sourceRect || !targetRect) continue
    const sourceBand = isBand(edge.source, edge.id, "source")
    const targetBand = isBand(edge.target, edge.id, "target")
    if (!sourceBand && !targetBand) continue
    sideEdges.push({
      edgeId: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      sourceRect,
      targetRect,
      sourceBand,
      targetBand,
      sourceFixedSide: fixedPorts.get(endKey(edge.id, "source"))?.side,
      targetFixedSide: fixedPorts.get(endKey(edge.id, "target"))?.side,
    })
  }
  // Every measured node's rect, so side assignment can reject a pair whose route
  // would be driven through a third node.
  const allRects = new Map<string, Rect>()
  for (const n of nodes) {
    const r = bodyRectOf(n.id)
    if (r) allRects.set(n.id, r)
  }
  const four = (nodeId: string) =>
    getConnectionMode(nodeById.get(nodeId)?.type) === "four-center"
  // Four-centre nodes (interface / gateway / decision / merge …) expose ONE port per
  // side, so two edges on a side collide at the same point. Side assignment must spread
  // them across sides — pass which nodes are single-slot so it treats an occupied side
  // there as a hard conflict, not a soft tie-break.
  const fourCenterNodes = new Set<string>()
  for (const n of nodes) if (four(n.id)) fourCenterNodes.add(n.id)
  const reservedEnds: ReservedSideEnd[] = []
  for (const edge of ordered) {
    const source = fixedPorts.get(endKey(edge.id, "source"))
    const target = fixedPorts.get(endKey(edge.id, "target"))
    if (source)
      reservedEnds.push({
        nodeId: edge.source,
        partnerNodeId: edge.target,
        side: source.side,
      })
    if (target)
      reservedEnds.push({
        nodeId: edge.target,
        partnerNodeId: edge.source,
        side: target.side,
      })
  }
  const sideByEnd = assignSides(
    sideEdges,
    allRects,
    fourCenterNodes,
    reservedEnds,
    reservedRoutes
  )

  const out: EndRef[] = []
  for (const edge of ordered) {
    if (edge.source === edge.target) continue
    const sourceRect = rectOf(edge.source)
    const targetRect = rectOf(edge.target)
    if (!sourceRect || !targetRect) continue
    const sourceFixed = fixedPorts.get(endKey(edge.id, "source"))
    const targetFixed = fixedPorts.get(endKey(edge.id, "target"))
    const sourceSide =
      sourceFixed?.side ??
      sideOverrideByEnd?.get(endKey(edge.id, "source")) ??
      sideByEnd.get(endKey(edge.id, "source"))
    const targetSide =
      targetFixed?.side ??
      sideOverrideByEnd?.get(endKey(edge.id, "target")) ??
      sideByEnd.get(endKey(edge.id, "target"))
    if (sourceSide !== undefined && (endsByNode.get(edge.source) ?? 0) > 1)
      out.push({
        edgeId: edge.id,
        end: "source",
        nodeId: edge.source,
        rect: sourceRect,
        side: sourceSide,
        partnerCenter: centerOf(targetRect),
        partnerNodeId: edge.target,
        partnerRect: targetRect,
        partnerSide: targetSide,
        fourCenter: four(edge.source),
        immutableRatio: sourceFixed?.ratio,
      })
    if (targetSide !== undefined && (endsByNode.get(edge.target) ?? 0) > 1)
      out.push({
        edgeId: edge.id,
        end: "target",
        nodeId: edge.target,
        rect: targetRect,
        side: targetSide,
        partnerCenter: centerOf(sourceRect),
        partnerNodeId: edge.source,
        partnerRect: sourceRect,
        partnerSide: sourceSide,
        fourCenter: four(edge.target),
        immutableRatio: targetFixed?.ratio,
      })
  }
  return out
}

/**
 * Route EVERY edge in one synchronous pass. Fixed edges go first, then auto edges
 * follow a geometry-derived total order; ids break only exact geometric ties.
 */
function computeAllEdgeGeometryPass(
  input: SolverInput,
  generatedOrderVariant: number | "reverse",
  fixedRoutes: Readonly<Record<string, IPoint[]>> = {},
  sideOverrideByEnd?: ReadonlyMap<string, Position>
): {
  routeById: Record<string, IPoint[]>
} {
  const {
    nodes,
    nodeLookup,
    connectionMode,
    edges,
    straightPathTypes,
    straightHookTypes,
    fixedEdges = [],
    liveOverride,
    previous,
    solveCache,
  } = input

  // Exact, solve-scoped snapshot. React Flow can retain `nodes` identity while
  // mutating measurements/geometry in place, so this must be rebuilt for every
  // invocation, then shared by all edge obstacle and container-border queries.
  const nodeIndex = input.nodeIndex ?? createNodeIndex(nodes)
  const nodeById = nodeIndex.byId
  const edgeById = new Map(edges.map((e) => [e.id, e]))
  // AUTHORITATIVE edges route first: any user-pinned endpoint, authored bend
  // topology, or the current live drag. Committing them before auto edges puts the
  // customized geometry in every relevant neighbour set, so generated routes yield
  // to user intent without jumping when a drag becomes stored data.
  const hasPinnedEndpoint = (e: Edge): boolean =>
    !!asFreeformAnchor(e.data?.sourceAnchor) ||
    !!asFreeformAnchor(e.data?.targetAnchor)
  const hasAuthoritativeTopology = (e: Edge): boolean =>
    straightHookTypes.has(e.type ?? "") ||
    (Array.isArray(e.data?.points) && e.data.points.length > 0)
  const authorityRank = (e: Edge): number =>
    e.id === liveOverride?.edgeId
      ? 0
      : hasAuthoritativeTopology(e)
        ? 1
        : hasPinnedEndpoint(e)
          ? 2
          : 3
  const hardAuthoritative = (e: Edge): boolean => authorityRank(e) < 2
  const pinnedOnly = (e: Edge): boolean => authorityRank(e) === 2
  const authoritative = (e: Edge): boolean => authorityRank(e) < 3
  const geometryOrder = (edge: Edge): Array<number | string> => {
    const source = nodeRect(edge.source, nodes, nodeById)
    const target = nodeRect(edge.target, nodes, nodeById)
    const sourceAnchor = asFreeformAnchor(edge.data?.sourceAnchor)
    const targetAnchor = asFreeformAnchor(edge.data?.targetAnchor)
    const straightEligible =
      source &&
      target &&
      (canRunStraight(true, source, target) ||
        canRunStraight(false, source, target))
    const side = (p: Position | undefined): number =>
      p === Position.Top
        ? 0
        : p === Position.Right
          ? 1
          : p === Position.Bottom
            ? 2
            : p === Position.Left
              ? 3
              : -1
    return [
      authorityRank(edge),
      straightEligible ? 0 : 1,
      source?.x ?? Infinity,
      source?.y ?? Infinity,
      source?.width ?? 0,
      source?.height ?? 0,
      target?.x ?? Infinity,
      target?.y ?? Infinity,
      target?.width ?? 0,
      target?.height ?? 0,
      edge.type ?? "",
      side(sourceAnchor?.side),
      sourceAnchor?.ratio ?? -1,
      side(targetAnchor?.side),
      targetAnchor?.ratio ?? -1,
      edge.source,
      edge.target,
      edge.id,
    ]
  }
  const geometryOrderByEdge = new Map(
    edges.map((edge) => [edge, geometryOrder(edge)])
  )
  const compareOrder = (a: Edge, b: Edge): number => {
    const ak = geometryOrderByEdge.get(a)!
    const bk = geometryOrderByEdge.get(b)!
    for (let i = 0; i < ak.length; i++) {
      if (ak[i] === bk[i]) continue
      return ak[i] < bk[i] ? -1 : 1
    }
    return 0
  }
  const canonicalOrder = [...edges].sort((a, b) => {
    const pa = authoritative(a) ? 0 : 1
    const pb = authoritative(b) ? 0 : 1
    if (pa !== pb) return pa - pb
    return compareOrder(a, b)
  })
  const hardAuthoritativeOrder = canonicalOrder.filter(hardAuthoritative)
  const pinnedOrder = canonicalOrder.filter(pinnedOnly)
  const straightOrder = canonicalOrder.filter(
    (edge) => !authoritative(edge) && geometryOrderByEdge.get(edge)![1] === 0
  )
  const flexibleOrder = canonicalOrder.filter(
    (edge) => !authoritative(edge) && geometryOrderByEdge.get(edge)![1] !== 0
  )
  const rotate = <T>(values: readonly T[], by: number): T[] => {
    if (values.length < 2) return [...values]
    const offset = by % values.length
    return [...values.slice(offset), ...values.slice(0, offset)]
  }
  const ordered =
    generatedOrderVariant === 0
      ? canonicalOrder
      : [
          // Live/manual topology is byte-immutable. Pinned-only edges still have
          // a generated route between constrained endpoints, so vary their order
          // within the pinned priority cohort instead of freezing one greedy walk.
          ...hardAuthoritativeOrder,
          ...(generatedOrderVariant === "reverse"
            ? [...pinnedOrder].reverse()
            : rotate(pinnedOrder, generatedOrderVariant)),
          ...(generatedOrderVariant === "reverse"
            ? [...straightOrder].reverse()
            : straightOrder),
          ...(generatedOrderVariant === "reverse"
            ? [...flexibleOrder].reverse()
            : rotate(flexibleOrder, generatedOrderVariant)),
        ]
  const routeById: Record<string, IPoint[]> = { ...fixedRoutes }
  // Spatial index of finished routes, grown as the walk proceeds so each edge
  // finds its lower-id neighbours without rescanning the whole route map.
  const neighborGrid: NeighborGrid = new Map()
  for (const [edgeId, route] of Object.entries(fixedRoutes))
    indexRoutePolyline(neighborGrid, edgeId, route)
  // Geometric PORT COORDINATION for multi-edge nodes. Every edge participates in
  // capacity: generated ends get soft proposals, while pins/manual/live/straight
  // topology reserve immutable seats. This keeps sibling layout continuous when an
  // automatic route becomes customized without changing its visible geometry.
  const coordinationEdges = [...ordered, ...fixedEdges]
  const fixedPorts = collectFixedPorts(
    coordinationEdges,
    nodes,
    nodeById,
    nodeLookup,
    connectionMode,
    straightHookTypes,
    liveOverride,
    fixedRoutes,
    nodeIndex
  )
  const reservedRouteById = new Map<string, IPoint[]>(
    Object.entries(fixedRoutes)
  )
  for (const edge of coordinationEdges) {
    if (edge.id === liveOverride?.edgeId) {
      reservedRouteById.set(edge.id, liveOverride.points)
      continue
    }
    const manual = edge.data?.points
    if (Array.isArray(manual) && manual.length >= 2) {
      const endpoints = resolveEdgeEndpoints(
        edge,
        nodes,
        nodeById,
        nodeLookup,
        connectionMode,
        undefined,
        undefined,
        nodeIndex
      )
      reservedRouteById.set(
        edge.id,
        endpoints
          ? preserveOrthogonalEdgePoints(
              manual as IPoint[],
              endpoints.adjustedSource,
              endpoints.adjustedTarget,
              endpoints.sourcePosition,
              endpoints.targetPosition
            )
          : (manual as IPoint[])
      )
      continue
    }
    if (straightHookTypes.has(edge.type ?? "")) {
      const endpoints = resolveEdgeEndpoints(
        edge,
        nodes,
        nodeById,
        nodeLookup,
        connectionMode,
        undefined,
        undefined,
        nodeIndex
      )
      if (endpoints)
        reservedRouteById.set(edge.id, [
          endpoints.adjustedSource,
          endpoints.adjustedTarget,
        ])
    }
  }
  const bandPorts = assignPorts(
    collectPortEnds(
      coordinationEdges,
      nodes,
      nodeById,
      fixedPorts,
      [...reservedRouteById.values()],
      sideOverrideByEnd
    )
  )

  for (const edge of ordered) {
    if (liveOverride && liveOverride.edgeId === edge.id) {
      routeById[edge.id] = liveOverride.points
      indexRoutePolyline(neighborGrid, edge.id, liveOverride.points)
      continue
    }

    const endpoints = resolveEdgeEndpoints(
      edge,
      nodes,
      nodeById,
      nodeLookup,
      connectionMode,
      undefined,
      undefined,
      nodeIndex
    )
    if (!endpoints) {
      // Node not measured yet — hold the previous route, never paint a guess.
      if (previous?.[edge.id]) {
        routeById[edge.id] = previous[edge.id]
        indexRoutePolyline(neighborGrid, edge.id, previous[edge.id])
      }
      continue
    }

    // Straight-hook edges (use-case, syntax-tree, petri-net) are a plain line
    // between the adjusted endpoints — no obstacle or neighbour routing — but
    // their polyline still enters the map so step edges route around them.
    if (straightHookTypes.has(edge.type ?? "")) {
      const line = [endpoints.adjustedSource, endpoints.adjustedTarget]
      routeById[edge.id] = line
      indexRoutePolyline(neighborGrid, edge.id, line)
      continue
    }

    const candidateBounds: Rect = {
      x: Math.min(
        endpoints.sourceAbsolutePosition.x,
        endpoints.targetAbsolutePosition.x
      ),
      y: Math.min(
        endpoints.sourceAbsolutePosition.y,
        endpoints.targetAbsolutePosition.y
      ),
      width:
        Math.max(
          endpoints.sourceAbsolutePosition.x + endpoints.sourceSize.width,
          endpoints.targetAbsolutePosition.x + endpoints.targetSize.width
        ) -
        Math.min(
          endpoints.sourceAbsolutePosition.x,
          endpoints.targetAbsolutePosition.x
        ),
      height:
        Math.max(
          endpoints.sourceAbsolutePosition.y + endpoints.sourceSize.height,
          endpoints.targetAbsolutePosition.y + endpoints.targetSize.height
        ) -
        Math.min(
          endpoints.sourceAbsolutePosition.y,
          endpoints.targetAbsolutePosition.y
        ),
    }
    const obstacles: ObstacleRect[] = getEdgeObstacles(
      nodes,
      edge.source,
      edge.target,
      endpoints.adjustedSource,
      endpoints.adjustedTarget,
      nodeIndex,
      candidateBounds
    )
    // Bystander bodies the anchor pick must not graze: the reach-windowed obstacles
    // minus the two endpoint bodies (priced by hugPenaltyPx) and soft containers
    // (the edge may live inside one). Already bounded by getEdgeObstacles' window, so
    // folding these into the anchor signature keeps its churn local.
    const thirdPartyObstacles = obstacles.filter(
      (o) => !o.soft && o.id !== edge.source && o.id !== edge.target
    )
    const { edgeRoutes: neighborEdges, containerBorders } = collectNeighbors(
      edge,
      endpoints,
      nodes,
      nodeIndex,
      obstacles,
      routeById,
      neighborGrid,
      edgeById
    )
    const signatureNeighbors = [...neighborEdges, ...containerBorders]
    const autoNeighborSignature = reachableNeighborSignature(
      endpoints,
      obstacles,
      signatureNeighbors,
      true
    )

    const enableStraightPath = straightPathTypes.has(edge.type ?? "")
    const sourceCustom = asFreeformAnchor(edge.data?.sourceAnchor)
    const targetCustom = asFreeformAnchor(edge.data?.targetAnchor)
    // Every non-manual, non-loop edge uses the SAME joint router, including a
    // fully pinned edge. Pins reduce the endpoint candidate set to one; they must
    // not switch the path primitive from joint A* to routeStepEdge, because adding
    // a semantic no-op second pin would then change terminal stubs/lanes. Manual
    // points remain authoritative and are only re-projected, never replaced.
    const hasManualPoints =
      Array.isArray(edge.data?.points) && edge.data.points.length > 0
    const usesJointRouter = edge.source !== edge.target && !hasManualPoints

    // The endpoints the route is actually drawn between — the auto path replaces
    // them with the chosen anchors' resolution.
    let endpointsUsed = endpoints
    let computed: IPoint[]

    if (usesJointRouter) {
      const sourceType = nodeById.get(edge.source)?.type
      const targetType = nodeById.get(edge.target)?.type
      // The node-local coordinator proposes a distinct side/slot, but does not pin
      // it. Joint A* sees that candidate alongside every side and may override it
      // when the complete route is cheaper. User anchors remain authoritative.
      const sourceBand = bandPorts.get(endKey(edge.id, "source"))
      const targetBand = bandPorts.get(endKey(edge.id, "target"))
      const sig = solveCache
        ? autoAnchorSignature(
            endpoints,
            sourceType,
            targetType,
            sourceCustom,
            targetCustom,
            sourceBand,
            targetBand,
            enableStraightPath,
            obstacles,
            autoNeighborSignature
          )
        : ""
      const previousSolve = solveCache?.get(edge.id)
      const cached = cachedSolve(solveCache, edge.id, sig)
      if (cached) {
        // Anchor pick still stands. Re-resolve endpoints so fresh manual bends
        // can be re-merged (they are not part of the signature).
        endpointsUsed =
          resolveEdgeEndpoints(
            edge,
            nodes,
            nodeById,
            nodeLookup,
            connectionMode,
            {
              sourceAnchor: cached.sourceAnchor,
              targetAnchor: cached.targetAnchor,
            },
            true,
            nodeIndex
          ) ?? endpoints
        computed = cached.computed
      } else {
        const selected = selectEdgeAnchors({
          sourceRect: rectFromEndpoint(
            endpoints.sourceAbsolutePosition,
            endpoints.sourceSize
          ),
          targetRect: rectFromEndpoint(
            endpoints.targetAbsolutePosition,
            endpoints.targetSize
          ),
          sourceType,
          targetType,
          sourceCustom,
          targetCustom,
          sourcePreferred: sourceBand,
          targetPreferred: targetBand,
          resolve: (overrides) =>
            resolveEdgeEndpoints(
              edge,
              nodes,
              nodeById,
              nodeLookup,
              connectionMode,
              overrides,
              true,
              nodeIndex
            ),
          obstacles,
          thirdPartyObstacles,
          neighborEdges,
          enableStraightPath,
          incumbentRoute: previousSolve?.computed,
        })
        if (selected) {
          endpointsUsed = selected.endpoints
          computed = routeConflictsWithNeighborEdges(
            selected.route,
            containerBorders
          )
            ? routeChosenAnchors(
                selected.endpoints,
                obstacles,
                signatureNeighbors,
                enableStraightPath
              )
            : selected.route
          rememberSolve(solveCache, edge.id, {
            sig,
            routeSig: "",
            computed,
            sourceAnchor: selected.sourceAnchor,
            targetAnchor: selected.targetAnchor,
          })
        } else {
          // No candidate routed — fall back to the plain endpoints (uncached).
          computed = routeStepEdge(
            routeStepParams(
              endpoints,
              obstacles,
              neighborEdges,
              enableStraightPath
            )
          )
          if (routeConflictsWithNeighborEdges(computed, containerBorders))
            computed = routeStepEdge(
              routeStepParams(
                endpoints,
                obstacles,
                signatureNeighbors,
                enableStraightPath
              )
            )
        }
      }
    } else {
      const sig = solveCache
        ? routeSignature(
            enableStraightPath,
            endpoints,
            obstacles,
            reachableNeighborSignature(
              endpoints,
              obstacles,
              signatureNeighbors,
              false
            )
          )
        : ""
      const cached = cachedSolve(solveCache, edge.id, sig)
      if (cached) {
        computed = cached.computed
      } else {
        computed = routeStepEdge(
          routeStepParams(
            endpoints,
            obstacles,
            neighborEdges,
            enableStraightPath
          )
        )
        if (routeConflictsWithNeighborEdges(computed, containerBorders))
          computed = routeStepEdge(
            routeStepParams(
              endpoints,
              obstacles,
              signatureNeighbors,
              enableStraightPath
            )
          )
        rememberSolve(solveCache, edge.id, { sig, routeSig: "", computed })
      }
    }

    routeById[edge.id] = mergeManualPoints(edge, computed, endpointsUsed)
    indexRoutePolyline(neighborGrid, edge.id, routeById[edge.id])
  }

  // Drop cache entries for edges that no longer exist, so a deleted edge's route
  // cannot be resurrected and the cache tracks the live edge set.
  if (solveCache && solveCache.size > edgeById.size) {
    for (const id of solveCache.keys())
      if (!edgeById.has(id)) solveCache.delete(id)
  }

  return { routeById }
}

type RouteSetScore = Readonly<{
  hardInvalidity: number
  weightedCost: number
  crossings: number
  proximityPx: number
  straightBroken: number
  bends: number
  maxSideGapImbalancePx: number
  totalSideGapImbalancePx: number
  maxCornerJamPermille: number
  totalCornerJamPermille: number
  length: number
}>

type BoundaryPort = Readonly<{
  side: Position
  ratio: number
}>

/** Classify a routed endpoint by the closest side of its node. Route-set scoring
 * and side-feedback must use the exact same tie-break, otherwise a corner endpoint
 * could be scored on one side and rebalanced on another. */
const boundaryPort = (point: IPoint, rect: Rect): BoundaryPort => {
  const distances = [
    {
      side: Position.Left,
      distance: Math.abs(point.x - rect.x),
      ratio: (point.y - rect.y) / rect.height,
    },
    {
      side: Position.Right,
      distance: Math.abs(point.x - (rect.x + rect.width)),
      ratio: (point.y - rect.y) / rect.height,
    },
    {
      side: Position.Top,
      distance: Math.abs(point.y - rect.y),
      ratio: (point.x - rect.x) / rect.width,
    },
    {
      side: Position.Bottom,
      distance: Math.abs(point.y - (rect.y + rect.height)),
      ratio: (point.x - rect.x) / rect.width,
    },
  ].sort((a, b) => a.distance - b.distance || (a.side < b.side ? -1 : 1))
  return {
    side: distances[0].side,
    ratio: Math.max(0, Math.min(1, distances[0].ratio)),
  }
}

/** Feed the sides selected by obstacle-aware routing back into the next bounded
 * coordination pass. This repairs stale proposed groups: if a route moved away
 * from a side, the endpoints that actually remain there can occupy balanced n+1
 * seats instead of preserving a hole for an edge that is no longer present. */
const actualRouteSides = (
  routeById: Readonly<Record<string, readonly IPoint[]>>,
  edges: readonly Edge[],
  nodes: readonly Node[]
): Map<string, Position> => {
  const result = new Map<string, Position>()
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  for (const edge of edges) {
    const route = routeById[edge.id]
    if (!route || route.length === 0) continue
    const sourceRect = nodeRect(edge.source, nodes, nodeById)
    const targetRect = nodeRect(edge.target, nodes, nodeById)
    if (sourceRect)
      result.set(
        endKey(edge.id, "source"),
        boundaryPort(route[0], sourceRect).side
      )
    if (targetRect)
      result.set(
        endKey(edge.id, "target"),
        boundaryPort(route[route.length - 1], targetRect).side
      )
  }
  return result
}

const routeSetScoreValues = (score: RouteSetScore): readonly number[] => [
  score.hardInvalidity,
  score.weightedCost,
  score.maxSideGapImbalancePx,
  score.totalSideGapImbalancePx,
  score.maxCornerJamPermille,
  score.totalCornerJamPermille,
  score.straightBroken,
  score.bends,
  score.length,
]

const routeSetScoreLess = (
  left: RouteSetScore,
  right: RouteSetScore
): boolean => lexLess(routeSetScoreValues(left), routeSetScoreValues(right))

/** A score is already visually settled when no hard route conflict remains and
 * shared-side bands stay centred and clear of the extreme corner zone. */
const routeSetNeedsRefinement = (score: RouteSetScore): boolean =>
  score.hardInvalidity > 0 ||
  score.crossings > 0 ||
  score.proximityPx > 0 ||
  score.straightBroken > 0 ||
  score.maxSideGapImbalancePx > 0 ||
  score.maxCornerJamPermille > 800

type PolylineBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

const polylineBounds = (route: readonly IPoint[]): PolylineBounds => {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const point of route) {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }
  return { minX, maxX, minY, maxY }
}

/** Necessary broad-phase condition for any crossing, overlap or crowding cost.
 * A pair farther apart than the crowding band contributes exactly zero to every
 * route-set interaction term, so skipping it cannot change the objective. */
const boundsMayConflict = (
  a: PolylineBounds,
  b: PolylineBounds,
  clearance: number
): boolean =>
  !(
    a.maxX + clearance <= b.minX ||
    b.maxX + clearance <= a.minX ||
    a.maxY + clearance <= b.minY ||
    b.maxY + clearance <= a.minY
  )

const pointEqual = (a: IPoint, b: IPoint): boolean => a.x === b.x && a.y === b.y

const pointOnSegment = (point: IPoint, a: IPoint, b: IPoint): boolean =>
  point.x >= Math.min(a.x, b.x) &&
  point.x <= Math.max(a.x, b.x) &&
  point.y >= Math.min(a.y, b.y) &&
  point.y <= Math.max(a.y, b.y) &&
  (a.x === b.x ? point.x === a.x : point.y === a.y)

const trimOrientedRouteAt = (
  route: readonly IPoint[],
  point: IPoint
): IPoint[] => {
  for (let index = 0; index < route.length - 1; index++) {
    if (!pointOnSegment(point, route[index], route[index + 1])) continue
    const tail = pointEqual(point, route[index + 1])
      ? route.slice(index + 1)
      : [point, ...route.slice(index + 1)]
    return tail.map(({ x, y }) => ({ x, y }))
  }
  return route.map(({ x, y }) => ({ x, y }))
}

/**
 * Remove only the common terminal trunk at an explicit shared pin. Conflicts
 * after the routes diverge still count, so a shared arrowhead does not become a
 * blanket exemption for two otherwise crossing edges.
 */
const trimSharedPinnedTrunk = (
  firstRoute: readonly IPoint[],
  firstEnd: EdgeEnd,
  secondRoute: readonly IPoint[],
  secondEnd: EdgeEnd
): [IPoint[], IPoint[]] => {
  const first =
    firstEnd === "source" ? [...firstRoute] : [...firstRoute].reverse()
  const second =
    secondEnd === "source" ? [...secondRoute] : [...secondRoute].reverse()
  if (first.length < 2 || second.length < 2 || !pointEqual(first[0], second[0]))
    return [[...firstRoute], [...secondRoute]]

  let firstIndex = 0
  let secondIndex = 0
  let shared = first[0]
  while (firstIndex < first.length - 1 && secondIndex < second.length - 1) {
    const firstNext = first[firstIndex + 1]
    const secondNext = second[secondIndex + 1]
    const firstDx = Math.sign(firstNext.x - shared.x)
    const firstDy = Math.sign(firstNext.y - shared.y)
    const secondDx = Math.sign(secondNext.x - shared.x)
    const secondDy = Math.sign(secondNext.y - shared.y)
    if (firstDx !== secondDx || firstDy !== secondDy) break

    const firstDistance =
      Math.abs(firstNext.x - shared.x) + Math.abs(firstNext.y - shared.y)
    const secondDistance =
      Math.abs(secondNext.x - shared.x) + Math.abs(secondNext.y - shared.y)
    const commonDistance = Math.min(firstDistance, secondDistance)
    shared = {
      x: shared.x + firstDx * commonDistance,
      y: shared.y + firstDy * commonDistance,
    }
    if (firstDistance !== secondDistance) break
    firstIndex++
    secondIndex++
  }

  if (pointEqual(shared, first[0])) return [[...firstRoute], [...secondRoute]]
  const trimmedFirst = trimOrientedRouteAt(first, shared)
  const trimmedSecond = trimOrientedRouteAt(second, shared)
  return [
    firstEnd === "source" ? trimmedFirst : trimmedFirst.reverse(),
    secondEnd === "source" ? trimmedSecond : trimmedSecond.reverse(),
  ]
}

const routeSetScore = (
  routeById: Readonly<Record<string, readonly IPoint[]>>,
  edges: readonly Edge[],
  nodes: readonly Node[],
  straightPathTypes: ReadonlySet<string>,
  /** When present, score only terms that can change while these edges are
   * rerouted. Interactions with every fixed route still count, but fixed-vs-fixed
   * pairs and fixed per-edge costs are invariant and are not rescanned. */
  focusEdgeIds?: ReadonlySet<string>,
  /** Edges whose route topology is authored/live/plain-line. Their ports still
   * shape shared-side centroid balance, but an intentional corner pin is not an
   * auto-layout defect and must not trigger or improve refinement. */
  immutableEdgeIds: ReadonlySet<string> = new Set()
): RouteSetScore => {
  const scoreStartedAt =
    import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
      ? performance.now()
      : 0
  let hardInvalidity = 0
  let weightedCost = 0
  let crossings = 0
  let proximityPx = 0
  let straightBroken = 0
  let bends = 0
  let length = 0
  let maxCornerJamPermille = 0
  let totalCornerJamPermille = 0
  const portsByNodeSide = new Map<
    string,
    { ratios: number[]; pinnedRatios: Set<number>; sideLength: number }
  >()
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const focusNodeIds = focusEdgeIds
    ? new Set(
        edges
          .filter((edge) => focusEdgeIds.has(edge.id))
          .flatMap((edge) => [edge.source, edge.target])
      )
    : undefined
  const recordPort = (
    nodeId: string,
    point: IPoint,
    movable: boolean,
    explicitlyPinned: boolean
  ): void => {
    if (focusNodeIds && !focusNodeIds.has(nodeId)) return
    const rect = nodeRect(nodeId, nodes, nodeById)
    if (!rect || rect.width <= 0 || rect.height <= 0) return
    const port = boundaryPort(point, rect)
    if (movable) {
      const cornerJam = Math.round(2_000 * Math.abs(port.ratio - 0.5))
      maxCornerJamPermille = Math.max(maxCornerJamPermille, cornerJam)
      totalCornerJamPermille += cornerJam
    }
    const key = `${nodeId}|${port.side}`
    const group = portsByNodeSide.get(key)
    const pinnedRatioKey = Math.round(port.ratio * 1e9)
    if (group) {
      if (explicitlyPinned && group.pinnedRatios.has(pinnedRatioKey)) return
      group.ratios.push(port.ratio)
      if (explicitlyPinned) group.pinnedRatios.add(pinnedRatioKey)
    } else
      portsByNodeSide.set(key, {
        ratios: [port.ratio],
        pinnedRatios: new Set(explicitlyPinned ? [pinnedRatioKey] : []),
        sideLength: sideAxisLength(port.side, rect),
      })
  }
  const routes = edges.flatMap((edge) => {
    const focused = !focusEdgeIds || focusEdgeIds.has(edge.id)
    const route = routeById[edge.id]
    if (!route || route.length === 0) {
      if (focused) hardInvalidity++
      return []
    }
    const topologyImmutable = immutableEdgeIds.has(edge.id)
    const sourcePinned = asFreeformAnchor(edge.data?.sourceAnchor)
    const targetPinned = asFreeformAnchor(edge.data?.targetAnchor)
    recordPort(
      edge.source,
      route[0],
      !topologyImmutable && !sourcePinned,
      sourcePinned !== undefined
    )
    recordPort(
      edge.target,
      route[route.length - 1],
      !topologyImmutable && !targetPinned,
      targetPinned !== undefined
    )
    const sourceRect = nodeRect(edge.source, nodes, nodeById)
    const targetRect = nodeRect(edge.target, nodes, nodeById)
    const generated =
      !asFreeformAnchor(edge.data?.sourceAnchor) &&
      !asFreeformAnchor(edge.data?.targetAnchor) &&
      !(Array.isArray(edge.data?.points) && edge.data.points.length > 0)
    if (
      focused &&
      generated &&
      sourceRect &&
      targetRect &&
      straightPathTypes.has(edge.type ?? "") &&
      (canRunStraight(true, sourceRect, targetRect) ||
        canRunStraight(false, sourceRect, targetRect)) &&
      route.length > 2
    )
      straightBroken++
    if (focused) {
      const routeBends = Math.max(0, route.length - 2)
      bends += routeBends
      let routeLength = 0
      for (let i = 0; i < route.length - 1; i++)
        routeLength +=
          Math.abs(route[i + 1].x - route[i].x) +
          Math.abs(route[i + 1].y - route[i].y)
      length += routeLength
      weightedCost += weightedRoutingCost(
        { lengthPx: routeLength, bends: routeBends },
        CANVAS.SNAP_TO_GRID_PX
      )
    }
    return [{ edge, route, focused, bounds: polylineBounds(route) }]
  })
  const conflictClearance =
    ROUTING_COST.parallelCrowdingClearanceInGridCells * CANVAS.SNAP_TO_GRID_PX
  for (let i = 0; i < routes.length; i++) {
    if (!routes[i].focused) continue
    for (let j = 0; j < routes.length; j++) {
      if (i === j || (routes[j].focused && j < i)) continue
      if (
        !boundsMayConflict(
          routes[i].bounds,
          routes[j].bounds,
          conflictClearance
        )
      )
        continue
      recordRouteScorePair()
      let first = routes[i].route as IPoint[]
      let second = routes[j].route as IPoint[]
      for (const junction of sharedPinnedJunctions(
        routes[i].edge,
        routes[j].edge
      ))
        [first, second] = trimSharedPinnedTrunk(
          first,
          junction.firstEnd,
          second,
          junction.secondEnd
        )
      // Per-edge crossing attribution is half-open so a lattice-vertex crossing
      // is charged once. A route set has no direction: score both orientations
      // and keep the symmetric worst case.
      const forward = routeConflictScore(first, [second])
      const reverse = routeConflictScore(second, [first])
      const pairCrossings = Math.max(forward.crossings, reverse.crossings)
      const general = polylineConflictCost(first, [second], conflictClearance)
      crossings += pairCrossings
      proximityPx += general.overlapPx + general.crowdingPx
      weightedCost += weightedRoutingCost(
        {
          crossings: pairCrossings,
          overlapPx: general.overlapPx,
          crowdingPx: general.crowdingPx,
        },
        CANVAS.SNAP_TO_GRID_PX
      )
    }
  }
  let maxSideGapImbalancePx = 0
  let totalSideGapImbalancePx = 0
  for (const { ratios, sideLength } of portsByNodeSide.values()) {
    const balance = sideGapBalance(ratios, sideLength, CANVAS.SNAP_TO_GRID_PX)
    // Charge the complete n+1 gap vector once. Per-port centre costs would count
    // the same displacement twice and still miss a centred but uneven fan.
    weightedCost += balance.cost
    maxSideGapImbalancePx = Math.max(
      maxSideGapImbalancePx,
      balance.maxGapErrorPx
    )
    totalSideGapImbalancePx += balance.totalGapErrorPx
  }
  const result = {
    hardInvalidity,
    weightedCost,
    crossings,
    proximityPx,
    straightBroken,
    bends,
    maxSideGapImbalancePx,
    totalSideGapImbalancePx,
    maxCornerJamPermille,
    totalCornerJamPermille,
    length,
  }
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
    recordRouteScoreRun(performance.now() - scoreStartedAt)
  return result
}

const refinementEdgeKey = (
  edge: Edge,
  nodes: readonly Node[],
  nodeById: Map<string, Node>
): Array<number | string> => {
  const source = nodeRect(edge.source, nodes, nodeById)
  const target = nodeRect(edge.target, nodes, nodeById)
  return [
    source?.x ?? Infinity,
    source?.y ?? Infinity,
    source?.width ?? 0,
    source?.height ?? 0,
    target?.x ?? Infinity,
    target?.y ?? Infinity,
    target?.width ?? 0,
    target?.height ?? 0,
    edge.type ?? "",
    edge.source,
    edge.target,
    edge.id,
  ]
}

const compareRefinementKeys = (
  left: readonly (number | string)[],
  right: readonly (number | string)[]
): number => {
  for (let i = 0; i < left.length; i++) {
    if (left[i] === right[i]) continue
    return left[i] < right[i] ? -1 : 1
  }
  return 0
}

/**
 * Partition route-set refinement by actual interaction. Edges sharing a node must
 * coordinate ports; routes already crossing or crowding each other must coordinate
 * lanes. Everything else can remain a fixed neighbour while the component is
 * rerouted, so a remote ninth edge cannot disable repair of a four-edge fan.
 */
const refinementComponents = (
  edges: readonly Edge[],
  routeById: Readonly<Record<string, readonly IPoint[]>>
): Edge[][] => {
  const parent = new Int32Array(edges.length)
  for (let i = 0; i < edges.length; i++) parent[i] = i
  const find = (index: number): number => {
    let root = index
    while (parent[root] !== root) root = parent[root]
    while (parent[index] !== index) {
      const next = parent[index]
      parent[index] = root
      index = next
    }
    return root
  }
  const union = (left: number, right: number): void => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot
  }

  const firstEdgeByNode = new Map<string, number>()
  edges.forEach((edge, index) => {
    for (const nodeId of [edge.source, edge.target]) {
      const first = firstEdgeByNode.get(nodeId)
      if (first === undefined) firstEdgeByNode.set(nodeId, index)
      else union(first, index)
    }
  })

  const conflictClearance =
    ROUTING_COST.parallelCrowdingClearanceInGridCells * CANVAS.SNAP_TO_GRID_PX
  const bounds = edges.map((edge) => {
    const route = routeById[edge.id]
    return route && route.length >= 2 ? polylineBounds(route) : null
  })

  for (let i = 0; i < edges.length; i++) {
    const first = routeById[edges[i].id]
    if (!first || first.length < 2) continue
    for (let j = i + 1; j < edges.length; j++) {
      if (find(i) === find(j)) continue
      const second = routeById[edges[j].id]
      if (!second || second.length < 2) continue
      const firstBounds = bounds[i]
      const secondBounds = bounds[j]
      if (
        firstBounds &&
        secondBounds &&
        !boundsMayConflict(firstBounds, secondBounds, conflictClearance)
      )
        continue
      const forward = routeConflictScore(first as IPoint[], [
        second as IPoint[],
      ])
      const reverse = routeConflictScore(second as IPoint[], [
        first as IPoint[],
      ])
      if (
        forward.crossings > 0 ||
        reverse.crossings > 0 ||
        forward.proximityPx > 0 ||
        reverse.proximityPx > 0 ||
        routeConflictsWithNeighborEdges(first as IPoint[], [
          second as IPoint[],
        ]) ||
        routeConflictsWithNeighborEdges(second as IPoint[], [first as IPoint[]])
      )
        union(i, j)
    }
  }

  const byRoot = new Map<number, Edge[]>()
  edges.forEach((edge, index) => {
    const root = find(index)
    const component = byRoot.get(root)
    if (component) component.push(edge)
    else byRoot.set(root, [edge])
  })
  const result = [...byRoot.values()]
  return result
}

/**
 * Route the complete edge set. A canonical pass handles the ordinary case. Small
 * diagrams with a real route-set conflict or a visibly off-centre shared-side band
 * receive a bounded set of rip-up alternatives: cyclic flexible-edge orders plus a
 * reversed order, while authoritative and straight cohorts retain priority. A
 * coordinate-descent refinement may then combine individually valid routes from
 * those passes when that strictly improves the whole-diagram objective. This lets
 * an earlier flexible edge yield to a later constrained one and lets nested
 * connectors swap seats as a pair, without putting an unbounded global optimiser
 * on the drag path.
 */
export function computeAllEdgeGeometry(input: SolverInput): {
  routeById: Record<string, IPoint[]>
} {
  const prepared = prepareLiveEdgeSolve(input.edges, input.liveOverride)
  const solveInput: SolverInput = {
    ...input,
    edges: prepared.edges,
    liveOverride: prepared.liveOverride,
    nodeIndex: input.nodeIndex ?? createNodeIndex(input.nodes),
  }
  const primary = computeAllEdgeGeometryPass(solveInput, 0)
  // Five component passes are the interactive ceiling: primary, reverse, two
  // rotations, and one actual-side feedback pass. Above eight INTERACTING edges
  // even that bounded repair can dominate a node-drag frame, so large conflict
  // components keep the fast canonical solve.
  // Remote components do not consume this budget or change one another's geometry.
  // Crucially the rule is identical while an edge is live and after commit,
  // preventing drag-start/end snaps.
  const MAX_REFINEMENT_EDGES = 8
  const MAX_ROTATIONS = 2
  const immutableForRefinement = (edge: Edge): boolean =>
    edge.id === solveInput.liveOverride?.edgeId ||
    solveInput.straightHookTypes.has(edge.type ?? "") ||
    (Array.isArray(edge.data?.points) && edge.data.points.length > 0)
  const immutableEdgeIds = new Set(
    solveInput.edges.filter(immutableForRefinement).map((edge) => edge.id)
  )

  const primaryScore = routeSetScore(
    primary.routeById,
    solveInput.edges,
    solveInput.nodes,
    solveInput.straightPathTypes,
    undefined,
    immutableEdgeIds
  )
  if (!routeSetNeedsRefinement(primaryScore)) return primary

  let bestRoutes = primary.routeById
  const nodeById = new Map(solveInput.nodes.map((node) => [node.id, node]))
  const keyByEdge = new Map(
    solveInput.edges.map((edge) => [
      edge,
      refinementEdgeKey(edge, solveInput.nodes, nodeById),
    ])
  )
  const compareEdges = (a: Edge, b: Edge): number =>
    compareRefinementKeys(keyByEdge.get(a)!, keyByEdge.get(b)!)
  const components = refinementComponents(
    solveInput.edges,
    primary.routeById
  ).map((component) => component.sort(compareEdges))
  components.sort((a, b) => compareEdges(a[0], b[0]))

  for (const componentEdges of components) {
    const immutableEdges = componentEdges.filter(immutableForRefinement)
    // Pins constrain endpoint candidates but do not freeze the generated route
    // between them. Only authored/live/plain-line topology is immutable; this lets
    // a pinned edge still participate in route-set repair without moving its seats.
    const mutableEdges = componentEdges.filter(
      (edge) => !immutableForRefinement(edge)
    )
    if (mutableEdges.length < 2 || mutableEdges.length > MAX_REFINEMENT_EDGES)
      continue
    const componentIds = new Set(componentEdges.map((edge) => edge.id))
    let bestComponentScore = routeSetScore(
      bestRoutes,
      solveInput.edges,
      solveInput.nodes,
      solveInput.straightPathTypes,
      componentIds,
      immutableEdgeIds
    )
    if (!routeSetNeedsRefinement(bestComponentScore)) continue

    const mutableIds = new Set(mutableEdges.map((edge) => edge.id))
    const fixedRoutes = Object.fromEntries(
      Object.entries(bestRoutes).filter(([edgeId]) => !mutableIds.has(edgeId))
    )
    const candidates = [{ routeById: bestRoutes }]
    const variants: Array<number | "reverse"> = ["reverse"]
    for (
      let rotation = 1;
      rotation < mutableEdges.length && rotation <= MAX_ROTATIONS;
      rotation++
    )
      variants.push(rotation)
    for (const variant of variants) {
      const candidate = computeAllEdgeGeometryPass(
        {
          ...solveInput,
          edges: mutableEdges,
          fixedEdges: immutableEdges,
          solveCache: undefined,
        },
        variant,
        fixedRoutes
      )
      const score = routeSetScore(
        candidate.routeById,
        solveInput.edges,
        solveInput.nodes,
        solveInput.straightPathTypes,
        componentIds,
        immutableEdgeIds
      )
      candidates.push(candidate)
      if (routeSetScoreLess(score, bestComponentScore)) {
        bestRoutes = candidate.routeById
        bestComponentScore = score
      }
    }

    // Route choice is allowed to overrule a proposed side to save a bend or avoid
    // an obstacle. Re-coordinate once from the sides the current best routes
    // actually use, so the remaining endpoints do not retain empty seats. The
    // candidate is still accepted only on a strict whole-component improvement.
    const feedbackSides = actualRouteSides(
      bestRoutes,
      solveInput.edges,
      solveInput.nodes
    )
    const feedbackCandidate = computeAllEdgeGeometryPass(
      {
        ...solveInput,
        edges: mutableEdges,
        fixedEdges: immutableEdges,
        solveCache: undefined,
      },
      0,
      fixedRoutes,
      feedbackSides
    )
    const feedbackScore = routeSetScore(
      feedbackCandidate.routeById,
      solveInput.edges,
      solveInput.nodes,
      solveInput.straightPathTypes,
      componentIds,
      immutableEdgeIds
    )
    candidates.push(feedbackCandidate)
    if (routeSetScoreLess(feedbackScore, bestComponentScore)) {
      bestRoutes = feedbackCandidate.routeById
      bestComponentScore = feedbackScore
    }

    // Every candidate route has passed the same bounded routing and degradation
    // policy. Their cross-edge coupling is soft, so MUTABLE routes from different
    // passes can be recombined. Immutable routes are seeded every pass and only
    // influence the objective/neighbour field. Greedy descent is bounded by
    // mutable edge count.
    for (let pass = 0; pass < mutableEdges.length; pass++) {
      let improved = false
      for (const edge of mutableEdges) {
        for (const candidate of candidates) {
          const route = candidate.routeById[edge.id]
          if (!route || route === bestRoutes[edge.id]) continue
          const combined = { ...bestRoutes, [edge.id]: route }
          const score = routeSetScore(
            combined,
            solveInput.edges,
            solveInput.nodes,
            solveInput.straightPathTypes,
            componentIds,
            immutableEdgeIds
          )
          if (!routeSetScoreLess(score, bestComponentScore)) continue
          bestRoutes = combined
          bestComponentScore = score
          improved = true
        }
      }
      if (!improved) break
    }
  }
  return { routeById: bestRoutes }
}

/**
 * The route a fully-auto edge from `sourceId` to `targetId` would take — what the
 * connect-onto-a-node commit writes. Runs the SAME `selectEdgeAnchors` the solver
 * runs, so the ghost previews the edge that will actually appear rather than a
 * fixed-drag-handle guess that jumps to the auto anchors on release. `null` when the
 * nodes are not measured yet; the caller falls back to a plain preview.
 */
export function computeConnectionPreviewRoute(input: {
  sourceId: string
  targetId: string
  edgeType?: string
  enableStraightPath: boolean
  nodes: readonly Node[]
  nodeLookup: Map<string, InternalNode>
  connectionMode: ConnectionMode
  obstacles: readonly ObstacleRect[]
  neighborEdges: readonly IPoint[][]
}): IPoint[] | null {
  const nodeById = new Map(input.nodes.map((n) => [n.id, n]))
  const edge = {
    id: "__connection_preview__",
    source: input.sourceId,
    target: input.targetId,
    type: input.edgeType,
    data: {},
  } as Edge
  const endpoints = resolveEdgeEndpoints(
    edge,
    input.nodes,
    nodeById,
    input.nodeLookup,
    input.connectionMode
  )
  if (!endpoints) return null
  const thirdPartyObstacles = input.obstacles.filter(
    (o) => !o.soft && o.id !== input.sourceId && o.id !== input.targetId
  )
  const selected = selectEdgeAnchors({
    sourceRect: rectFromEndpoint(
      endpoints.sourceAbsolutePosition,
      endpoints.sourceSize
    ),
    targetRect: rectFromEndpoint(
      endpoints.targetAbsolutePosition,
      endpoints.targetSize
    ),
    sourceType: nodeById.get(input.sourceId)?.type,
    targetType: nodeById.get(input.targetId)?.type,
    sourceCustom: undefined,
    targetCustom: undefined,
    resolve: (overrides) =>
      resolveEdgeEndpoints(
        edge,
        input.nodes,
        nodeById,
        input.nodeLookup,
        input.connectionMode,
        overrides,
        true
      ),
    obstacles: input.obstacles,
    thirdPartyObstacles,
    neighborEdges: input.neighborEdges,
    enableStraightPath: input.enableStraightPath,
  })
  return selected?.route ?? null
}
