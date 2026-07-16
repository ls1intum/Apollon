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
import { getEdgeAnchorPoint } from "@/utils/connectionModes"
import {
  getEdgeObstacles,
  getContainerBorderPolylines,
  type ObstacleRect,
} from "@/utils/geometry/obstacles"
import { routeStepEdge } from "@/utils/geometry/edgeRoute"
import { selectEdgeAnchors } from "@/utils/geometry/edgeAnchoring"

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
  }
): ResolvedEdgeEndpoints | null {
  const sourceInternal = nodeLookup.get(edge.source)
  const targetInternal = nodeLookup.get(edge.target)
  if (!sourceInternal || !targetInternal) return null

  const base = getEdgePosition({
    id: edge.id,
    sourceNode: sourceInternal,
    targetNode: targetInternal,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
    connectionMode,
  })
  if (!base) return null

  const sourceNode = nodeById.get(edge.source)
  const targetNode = nodeById.get(edge.target)

  const sourceAbsolutePosition = sourceNode
    ? getPositionOnCanvas(sourceNode, nodes)
    : { x: base.sourceX, y: base.sourceY }
  const targetAbsolutePosition = targetNode
    ? getPositionOnCanvas(targetNode, nodes)
    : { x: base.targetX, y: base.targetY }

  const sourceRect = sourceNode
    ? {
        x: sourceAbsolutePosition.x,
        y: sourceAbsolutePosition.y,
        width: nodeWidth(sourceNode) ?? 0,
        height: nodeHeight(sourceNode) ?? 0,
      }
    : null
  const targetRect = targetNode
    ? {
        x: targetAbsolutePosition.x,
        y: targetAbsolutePosition.y,
        width: nodeWidth(targetNode) ?? 0,
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

  const { markerPadding } = getEdgeMarkerStyles(edge.type ?? "")
  const padding = markerPadding ?? EDGES.MARKER_PADDING

  const sourceX = resolvedSourceAnchor?.point.x ?? base.sourceX
  const sourceY = resolvedSourceAnchor?.point.y ?? base.sourceY
  const targetX = resolvedTargetAnchor?.point.x ?? base.targetX
  const targetY = resolvedTargetAnchor?.point.y ?? base.targetY
  const sourcePosition = resolvedSourceAnchor?.position ?? base.sourcePosition
  const targetPosition = resolvedTargetAnchor?.position ?? base.targetPosition
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
 * A grid bucketing each already-routed edge's polyline VERTICES by cell, so an
 * edge finds its nearby neighbours without scanning every routed edge (the walk
 * is ascending-id, so a full scan is O(edges) per edge → O(edges²) per frame).
 * The cell only has to be a spatial hint: the caller re-checks each candidate
 * against the exact box, so the result is identical to a full scan.
 */
type NeighborGrid = Map<string, string[]>
const NEIGHBOR_CELL_PX = 256
const cellKey = (cx: number, cy: number): string => `${cx},${cy}`

/** Bucket `edgeId` under every cell its polyline has a vertex in. */
function indexRoutePolyline(
  grid: NeighborGrid,
  edgeId: string,
  polyline: readonly IPoint[]
): void {
  let lastKey: string | null = null
  for (const p of polyline) {
    const key = cellKey(
      Math.floor(p.x / NEIGHBOR_CELL_PX),
      Math.floor(p.y / NEIGHBOR_CELL_PX)
    )
    // Consecutive vertices usually share a cell; the query dedups the rest.
    if (key === lastKey) continue
    lastKey = key
    const bucket = grid.get(key)
    if (bucket) {
      if (bucket[bucket.length - 1] !== edgeId) bucket.push(edgeId)
    } else {
      grid.set(key, [edgeId])
    }
  }
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

  // Candidate lower-id edges: those with a vertex in a cell overlapping the box.
  // A vertex inside the box lands in a cell inside this range, so no neighbour is
  // missed; the precise test below drops the cell's out-of-box extras.
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
    const inRange = polyline.some(
      (p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY
    )
    if (inRange) neighbors.push(polyline)
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

/** One edge's cached solve. For an auto-anchored edge the CHOSEN anchors ride
 * along, so a cache hit can re-resolve the endpoints that `mergeManualPoints`
 * needs (manual bends are re-applied every frame) without re-running the search. */
export type EdgeSolveCacheEntry = {
  sig: string
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
 * types, any custom (pinned) anchors, the obstacle and neighbour sets, whether
 * the edge may go straight, and the sibling lane. Unchanged ⇒ the memoryless
 * selector returns the same anchors, so the cached route (and its anchors) is
 * reused without re-searching. Node RECTS, not the base endpoints: the selection
 * is a function of the rectangles, and the base point React Flow would have
 * picked is irrelevant once the selector overrides it.
 */
function autoAnchorSignature(
  endpoints: ResolvedEdgeEndpoints,
  sourceType: string | undefined,
  targetType: string | undefined,
  sourceCustom: FreeformEdgeAnchor | undefined,
  targetCustom: FreeformEdgeAnchor | undefined,
  obstacles: readonly ObstacleRect[],
  neighborEdges: readonly IPoint[][],
  enableStraightPath: boolean,
  lane: { index: number; count: number }
): string {
  const e = endpoints
  const anchor = (a: FreeformEdgeAnchor | undefined) =>
    a ? `${a.side},${a.ratio}` : "-"
  return [
    enableStraightPath ? "1" : "0",
    `${sourceType ?? ""},${targetType ?? ""}`,
    `${e.sourceAbsolutePosition.x},${e.sourceAbsolutePosition.y},${e.sourceSize.width},${e.sourceSize.height}`,
    `${e.targetAbsolutePosition.x},${e.targetAbsolutePosition.y},${e.targetSize.width},${e.targetSize.height}`,
    `${anchor(sourceCustom)};${anchor(targetCustom)}`,
    `${lane.index}/${lane.count}`,
    serializeObstacles(obstacles),
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

/**
 * Rank each edge within its PARALLEL SET (edges sharing an unordered node pair),
 * by ascending id so the fan-out is deterministic and independent of routing
 * order. A lone edge is index 0 of a set of 1 (no lane offset).
 */
function computeParallelInfo(
  ordered: readonly Edge[]
): Map<string, { index: number; count: number }> {
  const groups = new Map<string, Edge[]>()
  for (const e of ordered) {
    const key =
      e.source < e.target
        ? `${e.source}|${e.target}`
        : `${e.target}|${e.source}`
    const group = groups.get(key)
    if (group) group.push(e)
    else groups.set(key, [e])
  }
  const info = new Map<string, { index: number; count: number }>()
  for (const group of groups.values())
    group.forEach((e, index) => info.set(e.id, { index, count: group.length }))
  return info
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
  const ordered = [...edges].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  )
  const routeById: Record<string, IPoint[]> = {}
  // Spatial index of finished routes, grown as the walk proceeds so each edge
  // finds its lower-id neighbours without rescanning the whole route map.
  const neighborGrid: NeighborGrid = new Map()
  const parallelInfo = computeParallelInfo(ordered)

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
      const lane = parallelInfo.get(edge.id) ?? { index: 0, count: 1 }
      const sourceType = nodeById.get(edge.source)?.type
      const targetType = nodeById.get(edge.target)?.type
      const sig = solveCache
        ? autoAnchorSignature(
            endpoints,
            sourceType,
            targetType,
            sourceCustom,
            targetCustom,
            obstacles,
            neighborEdges,
            enableStraightPath,
            lane
          )
        : ""
      const cached = solveCache?.get(edge.id)
      if (cached && cached.sig === sig) {
        // Reuse the chosen anchors and route; only re-resolve endpoints so fresh
        // manual bends can be re-merged (they are not part of the signature).
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
            }
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
          resolve: (overrides) =>
            resolveEdgeEndpoints(
              edge,
              nodes,
              nodeById,
              nodeLookup,
              connectionMode,
              overrides
            ),
          obstacles,
          neighborEdges,
          enableStraightPath,
          laneIndex: lane.index,
          laneCount: lane.count,
        })
        if (selected) {
          endpointsUsed = selected.endpoints
          computed = selected.route
          solveCache?.set(edge.id, {
            sig,
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
        solveCache?.set(edge.id, { sig, computed })
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
