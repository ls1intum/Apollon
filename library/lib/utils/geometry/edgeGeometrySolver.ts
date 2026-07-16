import {
  Position,
  type Edge,
  type Node,
  type InternalNode,
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
  connectionMode: ConnectionMode
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

  const sourceAnchor = edge.data?.sourceAnchor as FreeformEdgeAnchor | undefined
  const targetAnchor = edge.data?.targetAnchor as FreeformEdgeAnchor | undefined
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

/** Gather the polylines this edge must not be drawn on top of — lower-id
 * neighbours' finished routes plus container borders. */
function collectNeighbors(
  edge: Edge,
  endpoints: ResolvedEdgeEndpoints,
  nodes: readonly Node[],
  edgeById: Map<string, Edge>,
  routeById: Record<string, IPoint[]>
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

  // `routeById` holds only already-routed lower-id edges at this edge's turn
  // (ascending-id walk), so there is no higher-id neighbour to filter out.
  const neighbors: IPoint[][] = []
  for (const [otherId, polyline] of Object.entries(routeById)) {
    if (polyline.length < 2) continue
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
  } = input

  const edgeById = new Map(edges.map((e) => [e.id, e]))
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const ordered = [...edges].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  )
  const routeById: Record<string, IPoint[]> = {}

  for (const edge of ordered) {
    if (liveOverride && liveOverride.edgeId === edge.id) {
      routeById[edge.id] = liveOverride.points
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
      if (previous?.[edge.id]) routeById[edge.id] = previous[edge.id]
      continue
    }

    // Straight-hook edges (use-case, syntax-tree, petri-net) are a plain line
    // between the adjusted endpoints — no obstacle or neighbour routing — but
    // their polyline still enters the map so step edges route around them.
    if (straightHookTypes.has(edge.type ?? "")) {
      routeById[edge.id] = [endpoints.adjustedSource, endpoints.adjustedTarget]
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
      routeById
    )

    const computed = routeStepEdge({
      enableStraightPath: straightPathTypes.has(edge.type ?? ""),
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
    })

    routeById[edge.id] = mergeManualPoints(edge, computed, endpoints)
  }

  return { routeById }
}
