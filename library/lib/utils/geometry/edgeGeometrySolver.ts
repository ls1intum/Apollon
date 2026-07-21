import {
  Position,
  type Edge,
  type Node,
  type InternalNode,
  type Rect,
} from "@xyflow/react"
import { getEdgePosition, ConnectionMode } from "@xyflow/system"
import { EDGES } from "@/constants"
import type { IPoint } from "@/edges/Connection"
import { getPositionOnCanvas } from "@/utils/nodeUtils"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  getEdgeMarkerStyles,
  preserveOrthogonalEdgePoints,
  isFreeformEdgeAnchor,
  type FreeformEdgeAnchor,
} from "@/utils/edgeUtils"
import { getEdgeAnchorPoint, getConnectionMode } from "@/utils/connectionModes"
import {
  getEdgeObstacles,
  getContainerBorderPolylines,
  type ObstacleRect,
} from "@/utils/geometry/obstacles"
import { routeStepEdge } from "@/utils/geometry/edgeRoute"
import { neighborsWithinReach } from "@/utils/geometry/orthogonalRouter"
import {
  routeChosenAnchors,
  selectEdgeAnchors,
} from "@/utils/geometry/edgeAnchoring"
import {
  assignPorts,
  assignSides,
  endKey,
  type EndRef,
  type SideEdge,
} from "@/utils/geometry/portAssignment"
import { centerOf } from "@/utils/geometry/rectSides"

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
  skipBase?: boolean
): ResolvedEdgeEndpoints | null {
  const sourceInternal = nodeLookup.get(edge.source)
  const targetInternal = nodeLookup.get(edge.target)
  if (!sourceInternal || !targetInternal) return null

  const sourceNode = nodeById.get(edge.source)
  const targetNode = nodeById.get(edge.target)

  const sourceRect =
    sourceNode && (nodeWidth(sourceNode) ?? 0) > 0
      ? {
          ...getPositionOnCanvas(sourceNode, nodes),
          width: nodeWidth(sourceNode)!,
          height: nodeHeight(sourceNode) ?? 0,
        }
      : null
  const targetRect =
    targetNode && (nodeWidth(targetNode) ?? 0) > 0
      ? {
          ...getPositionOnCanvas(targetNode, nodes),
          width: nodeWidth(targetNode)!,
          height: nodeHeight(targetNode) ?? 0,
        }
      : null

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
  const targetConnectionPointPadding = resolvedTargetAnchor ? 0 : padding

  const roundedSourceX = Math.round(sourceX)
  const roundedSourceY = Math.round(sourceY)
  const roundedTargetX = Math.round(targetX)
  const roundedTargetY = Math.round(targetY)

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

/** Whether `other` is a TRUE sibling of `self`: leaves the very same
 * connection point, so it shares geometry. */
function isSibling(self: Edge, other: Edge): boolean {
  const sharedNodes = [other.source, other.target].filter((n) =>
    [self.source, self.target].includes(n)
  ).length
  if (sharedNodes !== 1) return false
  const ends = [
    [self.source, self.sourceHandle],
    [self.target, self.targetHandle],
  ] as const
  const otherEnds = [
    [other.source, other.sourceHandle],
    [other.target, other.targetHandle],
  ] as const
  return ends.some(([node, handle]) =>
    otherEnds.some(
      ([otherNode, otherHandle]) => node === otherNode && handle === otherHandle
    )
  )
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

/** Gather the polylines this edge must not be drawn on top of — lower-id
 * neighbours' finished routes plus container borders. */
function collectNeighbors(
  edge: Edge,
  endpoints: ResolvedEdgeEndpoints,
  nodes: readonly Node[],
  edgeById: Map<string, Edge>,
  routeById: Record<string, IPoint[]>,
  grid: NeighborGrid
): IPoint[][] {
  const borders = getContainerBorderPolylines(nodes, edge.source, edge.target)

  const { x: sx } = endpoints.adjustedSource
  const { y: sy } = endpoints.adjustedSource
  const { x: tx } = endpoints.adjustedTarget
  const { y: ty } = endpoints.adjustedTarget
  const pad = EDGES.STUB_LENGTH * 6
  const minX = Math.min(sx, tx) - pad
  const maxX = Math.max(sx, tx) + pad
  const minY = Math.min(sy, ty) - pad
  const maxY = Math.max(sy, ty) + pad

  // Candidate lower-id edges: those with a segment in a cell overlapping the box.
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

  // Ascending-id order, matching the previous full-map scan (routeById is built
  // ascending), so neighbour order — and thus the routed result — is unchanged.
  const ordered = [...candidateIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  const neighbors: IPoint[][] = []
  for (const otherId of ordered) {
    const polyline = routeById[otherId]
    if (!polyline || polyline.length < 2) continue
    const other = edgeById.get(otherId)
    if (other && isSibling(edge, other)) continue
    if (polylineIntersectsBox(polyline, minX, maxX, minY, maxY)) {
      neighbors.push(polyline)
    }
  }
  neighbors.push(...borders)
  return neighbors
}

export type LiveEdgeOverride = {
  edgeId: string
  points: IPoint[]
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
  /** An in-progress drag preview, routed at its own id so higher-id edges dodge
   * it exactly as they would its committed route. */
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
}

/** One edge's cached solve, split into two keys. `sig` (the ANCHOR key) covers
 * everything the anchor PICK depends on — rects, types, customs, lane — so a hit
 * means the CHOSEN anchors still stand and ride along, letting a hit re-resolve
 * the endpoints `mergeManualPoints` needs without re-selecting. `routeSig` covers
 * what only the ROUTE depends on once anchors are fixed: the obstacle and
 * neighbour sets. Anchor hit + route miss ⇒ one cheap fixed-anchor re-route
 * instead of a full multi-candidate re-search, which is what stops a one-node
 * drag from cascading an anchor re-search across the whole graph. */
export type EdgeSolveCacheEntry = {
  sig: string
  routeSig: string
  computed: IPoint[]
  sourceAnchor?: FreeformEdgeAnchor
  targetAnchor?: FreeformEdgeAnchor
}

/** Lossless digest of every input `routeStepEdge` reads. Geometry only (obstacle
 * ids don't affect the route); NOT `edge.data.points`, which `mergeManualPoints`
 * layers on AFTER and is applied fresh every frame. */
function routeSignature(
  enableStraightPath: boolean,
  endpoints: ResolvedEdgeEndpoints,
  obstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][]
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
  parts.push(serializeObstacles(obstacles), serializeNeighbors(neighborEdges))
  return parts.join("|")
}

const serializeObstacles = (obstacles: readonly ObstacleRect[]): string => {
  let o = "O"
  for (const b of obstacles)
    o += `;${b.x},${b.y},${b.width},${b.height},${b.soft ? 1 : 0}`
  return o
}

const serializeNeighbors = (neighborEdges: readonly IPoint[][]): string => {
  let n = "N"
  for (const pl of neighborEdges) {
    n += ";"
    for (const p of pl) n += `${p.x},${p.y} `
  }
  return n
}

/**
 * The ROUTE key for an auto edge with fixed anchors: the CHOSEN-anchor endpoints
 * (with their marker-padding-adjusted coordinates and exit positions), the
 * obstacles, plus only the neighbour segments the route can actually reach
 * (`neighborsWithinReach`, the router's own corridor). A neighbour bending OUTSIDE
 * this edge's corridor cannot change its route, so it must not invalidate the key —
 * that is what keeps a one-node drag from cascading a re-route across the whole
 * graph. The endpoints are keyed explicitly (not left implicit in the corridor)
 * because a padding-only change — e.g. a component edge switching between the
 * provided and required interface sockets — moves the adjusted endpoint without
 * necessarily touching any reachable neighbour, and would otherwise reuse a stale
 * polyline that no longer reaches the socket.
 */
const routeInputSignature = (
  endpoints: ResolvedEdgeEndpoints,
  obstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][]
): string => {
  const e = endpoints
  const reach = neighborsWithinReach(
    e.adjustedSource,
    [e.adjustedTarget],
    obstacles,
    neighborEdges
  )
  let n = "R"
  for (const s of reach) n += `;${s.x1},${s.y1},${s.x2},${s.y2}`
  const ends =
    `${e.adjustedSource.x},${e.adjustedSource.y},${e.adjustedTarget.x},${e.adjustedTarget.y}` +
    `|${e.sourcePosition},${e.targetPosition},${e.padding}`
  return `${ends}|${serializeObstacles(obstacles)}|${n}`
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
 * Digest of everything the anchor SELECTION depends on: the two node rects, node
 * types, any custom (pinned) anchors, whether the edge may go straight, the sibling
 * lane, and the BYSTANDER bodies its ideal route is scored against (so a third node
 * moving into/out of the way re-picks the anchor).
 *
 * NEIGHBOURS ARE PART OF THIS KEY. `scoreKey` prices a candidate's crossings and
 * near-parallel runs against the already-committed routes, at up to three bends per
 * crossing, so the chosen anchor genuinely depends on them. Leaving them out let an
 * edge keep an anchor that was picked against neighbours which have since moved: the
 * cached diagram and a freshly-loaded one then differ, and so do two Yjs peers with
 * different drag histories — the anchors stop being a pure function of the current
 * geometry. Both digests are bounded by the same reach window the router uses, so a
 * far-away edge still touches nothing here.
 *
 * Node RECTS, not the base endpoints: selection is a function of the rectangles, and
 * the base React Flow would have picked is overridden.
 *
 * PLUS the marker padding. `selectEdgeAnchors` re-resolves each candidate through
 * `resolveEdgeEndpoints`, which sets an auto endpoint back by `endpoints.padding` (the
 * edge type's marker gap) before the route is scored. Two edge types with the same node
 * rects but different markers can therefore pick different anchors, so the padding is
 * part of the key — matching the route cache (`routeInputSignature`), which already
 * folds it in.
 */
function autoAnchorSignature(
  endpoints: ResolvedEdgeEndpoints,
  sourceType: string | undefined,
  targetType: string | undefined,
  sourceCustom: FreeformEdgeAnchor | undefined,
  targetCustom: FreeformEdgeAnchor | undefined,
  enableStraightPath: boolean,
  thirdPartyObstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][]
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
    // Bystanders the graze penalty scores against — a third node sliding into the
    // ideal lane must re-pick, or the anchor stays on a now-grazing straight shot.
    serializeObstacles(thirdPartyObstacles),
    // Committed neighbours the crossing/proximity terms score against.
    serializeNeighbors(neighborEdges),
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
    ...getPositionOnCanvas(node, nodes),
    width: w,
    height: nodeHeight(node) ?? 0,
  }
}

/** The free edge-ends of MULTI-EDGE nodes (a node carrying more than one free end),
 * each tagged with its GEOMETRIC facing side (the sector its partner sits in — so a
 * fork splits across sides by direction), its rect, its partner's centre (the angular
 * key) and whether the node is four-centre. Feeds `assignPorts`. Ends of single-edge
 * nodes are omitted: they stay on the per-edge cost path, which already handles their
 * side/ratio with no regression. Self-loops and fully-pinned edges take no part. */
function collectPortEnds(
  ordered: readonly Edge[],
  nodes: readonly Node[],
  nodeById: Map<string, Node>
): EndRef[] {
  // Free ends per node — only a node with more than one gets geometric assignment.
  const freeEnds = new Map<string, number>()
  for (const edge of ordered) {
    if (edge.source === edge.target) continue
    if (!asFreeformAnchor(edge.data?.sourceAnchor))
      freeEnds.set(edge.source, (freeEnds.get(edge.source) ?? 0) + 1)
    if (!asFreeformAnchor(edge.data?.targetAnchor))
      freeEnds.set(edge.target, (freeEnds.get(edge.target) ?? 0) + 1)
  }
  // The band ends are the FREE ends on MULTI-EDGE nodes. Their sides are chosen JOINTLY
  // (per edge, min corners over the side PAIR) so a diagonal fork arm is a 1-corner L,
  // not a 2-corner Z, and a straight edge claims its opposing sides first.
  const isBand = (
    nodeId: string,
    custom: FreeformEdgeAnchor | undefined
  ): boolean => !custom && (freeEnds.get(nodeId) ?? 0) > 1
  const sideEdges: SideEdge[] = []
  const rectCache = new Map<string, Rect | null>()
  const rectOf = (nodeId: string): Rect | null => {
    if (!rectCache.has(nodeId))
      rectCache.set(nodeId, nodeRect(nodeId, nodes, nodeById))
    return rectCache.get(nodeId) ?? null
  }
  for (const edge of ordered) {
    if (edge.source === edge.target) continue
    const sourceCustom = asFreeformAnchor(edge.data?.sourceAnchor)
    const targetCustom = asFreeformAnchor(edge.data?.targetAnchor)
    if (sourceCustom && targetCustom) continue
    const sourceRect = rectOf(edge.source)
    const targetRect = rectOf(edge.target)
    if (!sourceRect || !targetRect) continue
    const sourceBand = isBand(edge.source, sourceCustom)
    const targetBand = isBand(edge.target, targetCustom)
    if (!sourceBand && !targetBand) continue
    sideEdges.push({
      edgeId: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      sourceRect,
      targetRect,
      sourceBand,
      targetBand,
    })
  }
  // Every measured node's rect, so side assignment can reject a pair whose route
  // would be driven through a third node.
  const allRects = new Map<string, Rect>()
  for (const n of nodes) {
    const r = rectOf(n.id)
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
  const sideByEnd = assignSides(sideEdges, allRects, fourCenterNodes)

  const out: EndRef[] = []
  for (const edge of ordered) {
    if (edge.source === edge.target) continue
    const sourceCustom = asFreeformAnchor(edge.data?.sourceAnchor)
    const targetCustom = asFreeformAnchor(edge.data?.targetAnchor)
    if (sourceCustom && targetCustom) continue
    const sourceRect = rectOf(edge.source)
    const targetRect = rectOf(edge.target)
    if (!sourceRect || !targetRect) continue
    const sourceSide = sideByEnd.get(endKey(edge.id, "source"))
    const targetSide = sideByEnd.get(endKey(edge.id, "target"))
    if (sourceSide !== undefined)
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
      })
    if (targetSide !== undefined)
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
      })
  }
  return out
}

/**
 * Route EVERY edge in one synchronous pass. An edge yields only to LOWER-id
 * neighbours (a strict DAG), so a single ascending-id walk visits each edge
 * after every neighbour it can depend on is final.
 */
export function computeAllEdgeGeometry(input: SolverInput): {
  routeById: Record<string, IPoint[]>
} {
  const {
    nodes,
    nodeLookup,
    connectionMode,
    edges,
    straightPathTypes,
    straightHookTypes,
    liveOverride,
    previous,
    solveCache,
  } = input

  const edgeById = new Map(edges.map((e) => [e.id, e]))
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  // FULLY-PINNED edges (both ends user-anchored) route FIRST, then the rest by id.
  // Their geometry is fixed and authoritative, so committing them before the auto
  // edges puts them in the neighbour set for EVERY auto edge — the cross-edge cost
  // then makes autos aware of them regardless of id order (a higher-id pinned edge
  // was previously invisible to the autos it should avoid). Deterministic: a total
  // order (pinned-first, then ascending id), and pinned routes depend on nothing an
  // auto edge produces, so this is a valid topological order for the route DAG.
  const fullyPinned = (e: Edge): boolean =>
    !!asFreeformAnchor(e.data?.sourceAnchor) &&
    !!asFreeformAnchor(e.data?.targetAnchor)
  const ordered = [...edges].sort((a, b) => {
    const pa = fullyPinned(a) ? 0 : 1
    const pb = fullyPinned(b) ? 0 : 1
    if (pa !== pb) return pa - pb
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  const routeById: Record<string, IPoint[]> = {}
  // Spatial index of finished routes, grown as the walk proceeds so each edge
  // finds its lower-id neighbours without rescanning the whole route map.
  const neighborGrid: NeighborGrid = new Map()
  // Geometric PORT ASSIGNMENT for MULTI-EDGE nodes: each such node's free ends are
  // distributed across sides by their partner's direction (so a fork splits), then
  // within a shared side ordered by rotation and seated in a centred band (so they
  // nest and space themselves instead of piling onto one corner-aimed anchor). Each
  // assigned port PINS its end — like a user anchor — so the other end still optimises
  // against it on the cost path below. Single-edge nodes are absent and stay fully on
  // the cost path. This replaces the whole fan / lane / slot / fork-redistribute stack
  // (see `portAssignment.ts` and `./README.md`).
  const bandPorts = assignPorts(collectPortEnds(ordered, nodes, nodeById))

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
      connectionMode
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

    const obstacles: ObstacleRect[] = getEdgeObstacles(
      nodes,
      edge.source,
      edge.target,
      endpoints.adjustedSource,
      endpoints.adjustedTarget
    )
    // Bystander bodies the anchor pick must not graze: the reach-windowed obstacles
    // minus the two endpoint bodies (priced by hugPenaltyPx) and soft containers
    // (the edge may live inside one). Already bounded by getEdgeObstacles' window, so
    // folding these into the anchor signature keeps its churn local.
    const thirdPartyObstacles = obstacles.filter(
      (o) => !o.soft && o.id !== edge.source && o.id !== edge.target
    )
    const neighborEdges = collectNeighbors(
      edge,
      endpoints,
      nodes,
      edgeById,
      routeById,
      neighborGrid
    )

    const enableStraightPath = straightPathTypes.has(edge.type ?? "")
    const sourceCustom = asFreeformAnchor(edge.data?.sourceAnchor)
    const targetCustom = asFreeformAnchor(edge.data?.targetAnchor)
    // Auto-anchored unless BOTH ends are user-pinned, or it is a self-loop (which
    // the anchor search has nothing to optimise — both ends sit on one node).
    const isAuto =
      edge.source !== edge.target && !(sourceCustom && targetCustom)

    // The endpoints the route is actually drawn between — the auto path replaces
    // them with the chosen anchors' resolution.
    let endpointsUsed = endpoints
    let computed: IPoint[]

    if (isAuto) {
      const sourceType = nodeById.get(edge.source)?.type
      const targetType = nodeById.get(edge.target)?.type
      // A crowded end is PINNED to its band port (a solver-assigned `{side, ratio}`),
      // exactly like a user anchor: `selectEdgeAnchors` then optimises only the other,
      // still-free end against it. A real user anchor always wins over a band port.
      const sourceBand = bandPorts.get(endKey(edge.id, "source"))
      const targetBand = bandPorts.get(endKey(edge.id, "target"))
      const effSourceCustom = sourceCustom ?? sourceBand
      const effTargetCustom = targetCustom ?? targetBand
      const sig = solveCache
        ? autoAnchorSignature(
            endpoints,
            sourceType,
            targetType,
            effSourceCustom,
            effTargetCustom,
            enableStraightPath,
            thirdPartyObstacles,
            neighborEdges
          )
        : ""
      const cached = solveCache?.get(edge.id)
      if (cached && cached.sig === sig) {
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
            true
          ) ?? endpoints
        // The route key is built from the CHOSEN-anchor endpoints, so its reach
        // corridor matches the route the router would run.
        const routeSig = solveCache
          ? routeInputSignature(endpointsUsed, obstacles, neighborEdges)
          : ""
        if (cached.routeSig === routeSig) {
          // Obstacles and reachable neighbours held too — reuse verbatim.
          computed = cached.computed
        } else {
          // Only an obstacle or reachable neighbour moved: re-route the SAME
          // anchors (one search), not a full re-pick.
          computed = routeChosenAnchors(
            endpointsUsed,
            obstacles,
            neighborEdges,
            enableStraightPath
          )
          solveCache?.set(edge.id, { ...cached, routeSig, computed })
        }
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
          sourceCustom: effSourceCustom,
          targetCustom: effTargetCustom,
          resolve: (overrides) =>
            resolveEdgeEndpoints(
              edge,
              nodes,
              nodeById,
              nodeLookup,
              connectionMode,
              overrides,
              true
            ),
          obstacles,
          thirdPartyObstacles,
          neighborEdges,
          enableStraightPath,
        })
        if (selected) {
          endpointsUsed = selected.endpoints
          computed = selected.route
          solveCache?.set(edge.id, {
            sig,
            routeSig: solveCache
              ? routeInputSignature(
                  selected.endpoints,
                  obstacles,
                  neighborEdges
                )
              : "",
            computed,
            // A pinned end returns no chosen anchor; persist the band port (or user
            // anchor) so the cache-hit re-resolve reproduces the identical pin.
            sourceAnchor: selected.sourceAnchor ?? sourceBand,
            targetAnchor: selected.targetAnchor ?? targetBand,
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
        }
      }
    } else {
      const sig = solveCache
        ? routeSignature(
            enableStraightPath,
            endpoints,
            obstacles,
            neighborEdges
          )
        : ""
      const cached = solveCache?.get(edge.id)
      if (cached && cached.sig === sig) {
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
        // Non-auto edges key on one combined `routeSignature` (which already
        // folds in obstacles and neighbours), so the split's `routeSig` is
        // unused here.
        solveCache?.set(edge.id, { sig, routeSig: "", computed })
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
