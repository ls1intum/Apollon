import type { Edge, InternalNode, Node, Position } from "@xyflow/react"
import type { ConnectionMode } from "@xyflow/system"
import type { IPoint } from "@/edges/Connection"
import type {
  EdgeSolveCacheEntry,
  LiveEdgeOverride,
  SolverInput,
} from "@/utils/geometry/edgeGeometrySolver"
import type { RoutingPerfCounters } from "@/sync/perfCounters"

export const EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION = 2 as const

type SerializedSize = {
  width?: number
  height?: number
}

type SerializedHandle = {
  id: string | null
  type: "source" | "target"
  position: Position
  x: number
  y: number
  width: number
  height: number
}

type SerializedHandleBounds = {
  source: SerializedHandle[] | null
  target: SerializedHandle[] | null
}

/**
 * Only the node facts the route solver reads. React Flow's full InternalNode also
 * retains `internals.userNode`, whose arbitrary data may contain functions,
 * elements, or host objects that cannot cross a structured-clone boundary.
 */
export type SerializedSolverNode = {
  id: string
  type?: string
  position: IPoint
  parentId?: string
  width?: number
  height?: number
  initialWidth?: number
  initialHeight?: number
  measured?: SerializedSize
  hidden?: boolean
}

export type SerializedInternalSolverNode = SerializedSolverNode & {
  positionAbsolute: IPoint
  handleBounds?: SerializedHandleBounds
  handles?: SerializedHandle[]
}

type SerializedFreeformAnchor = {
  side: Position
  ratio: number
}

export type SerializedEdgeSolveCacheEntry = {
  sig: string
  routeSig: string
  computed: IPoint[]
  sourceAnchor?: SerializedFreeformAnchor
  targetAnchor?: SerializedFreeformAnchor
  alternatives?: SerializedEdgeSolveCacheEntry[]
}

export type SerializedEdgeSolveCache = Array<
  [edgeId: string, entry: SerializedEdgeSolveCacheEntry]
>

type SerializedRoutingEdgeData = {
  points?: IPoint[]
  sourceAnchor?: SerializedFreeformAnchor
  targetAnchor?: SerializedFreeformAnchor
}

export type SerializedSolverEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: string
  data?: SerializedRoutingEdgeData
}

export type SerializedLiveEdgeOverride = {
  edgeId: string
  points: IPoint[]
  edge?: SerializedSolverEdge
  strategy?: "authoritative" | "predicted"
}

export type SerializedSolverInput = {
  nodes: SerializedSolverNode[]
  nodeLookup: Array<[string, SerializedInternalSolverNode]>
  connectionMode: "strict" | "loose"
  edges: SerializedSolverEdge[]
  straightPathTypes: string[]
  straightHookTypes: string[]
  fixedEdges?: SerializedSolverEdge[]
  liveOverride?: SerializedLiveEdgeOverride | null
  previous?: Record<string, IPoint[]>
}

export type EdgeGeometrySolveRequest = {
  protocol: typeof EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION
  sessionId: string
  revision: number
  kind: "solve"
  input: SerializedSolverInput
  /** One-shot bootstrap from the initial synchronous solve. Later requests rely
   * on the Worker's own session-local cache and omit this payload. */
  initialCache?: SerializedEdgeSolveCache
}

export type EdgeGeometrySolveResult = {
  protocol: typeof EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION
  sessionId: string
  revision: number
  kind: "result"
  routeById: Record<string, IPoint[]>
  durationMs: number
  perfDelta?: RoutingPerfCounters
}

export type EdgeGeometrySolveError = {
  protocol: typeof EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION
  sessionId: string
  revision: number
  kind: "error"
  message: string
}

export type EdgeGeometryWorkerResponse =
  | EdgeGeometrySolveResult
  | EdgeGeometrySolveError

const clonePoint = ({ x, y }: IPoint): IPoint => ({ x, y })

const clonePoints = (points: readonly IPoint[]): IPoint[] =>
  points.map(clonePoint)

const MAX_SERIALIZED_CACHE_ALTERNATIVES = 4

const serializeCacheEntry = (
  entry: EdgeSolveCacheEntry,
  includeAlternatives: boolean
): SerializedEdgeSolveCacheEntry => ({
  sig: entry.sig,
  routeSig: entry.routeSig,
  computed: clonePoints(entry.computed),
  sourceAnchor: entry.sourceAnchor ? { ...entry.sourceAnchor } : undefined,
  targetAnchor: entry.targetAnchor ? { ...entry.targetAnchor } : undefined,
  alternatives: includeAlternatives
    ? entry.alternatives
        ?.slice(0, MAX_SERIALIZED_CACHE_ALTERNATIVES)
        .map((alternative) => serializeCacheEntry(alternative, false))
    : undefined,
})

/** Clone only solver-owned primitives into a bounded Worker bootstrap payload.
 * Alternative history is deliberately one level deep: `rememberSolve` stores
 * flat alternatives, and accepting recursive input here could grow a request
 * without bound. */
export const serializeEdgeSolveCache = (
  cache: ReadonlyMap<string, EdgeSolveCacheEntry>
): SerializedEdgeSolveCache =>
  [...cache].map(([edgeId, entry]) => [
    edgeId,
    serializeCacheEntry(entry, true),
  ])

const deserializeCacheEntry = (
  entry: SerializedEdgeSolveCacheEntry,
  includeAlternatives: boolean
): EdgeSolveCacheEntry => ({
  sig: entry.sig,
  routeSig: entry.routeSig,
  computed: clonePoints(entry.computed),
  sourceAnchor: entry.sourceAnchor ? { ...entry.sourceAnchor } : undefined,
  targetAnchor: entry.targetAnchor ? { ...entry.targetAnchor } : undefined,
  alternatives: includeAlternatives
    ? entry.alternatives
        ?.slice(0, MAX_SERIALIZED_CACHE_ALTERNATIVES)
        .map((alternative) => deserializeCacheEntry(alternative, false))
    : undefined,
})

export const deserializeEdgeSolveCache = (
  cache: SerializedEdgeSolveCache
): Map<string, EdgeSolveCacheEntry> =>
  new Map(
    cache.map(([edgeId, entry]) => [edgeId, deserializeCacheEntry(entry, true)])
  )

const serializeAnchor = (
  value: unknown
): SerializedFreeformAnchor | undefined => {
  if (!value || typeof value !== "object") return undefined
  const candidate = value as { side?: unknown; ratio?: unknown }
  if (
    (candidate.side !== "top" &&
      candidate.side !== "right" &&
      candidate.side !== "bottom" &&
      candidate.side !== "left") ||
    typeof candidate.ratio !== "number"
  )
    return undefined
  return {
    side: candidate.side as Position,
    ratio: candidate.ratio,
  }
}

const serializeEdge = (edge: Edge): SerializedSolverEdge => {
  const points = Array.isArray(edge.data?.points)
    ? clonePoints(edge.data.points as IPoint[])
    : undefined
  const sourceAnchor = serializeAnchor(edge.data?.sourceAnchor)
  const targetAnchor = serializeAnchor(edge.data?.targetAnchor)
  const data =
    points || sourceAnchor || targetAnchor
      ? { points, sourceAnchor, targetAnchor }
      : undefined

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type,
    data,
  }
}

const serializeNode = (node: Node): SerializedSolverNode => ({
  id: node.id,
  type: node.type,
  position: clonePoint(node.position),
  parentId: node.parentId,
  width: node.width,
  height: node.height,
  initialWidth: node.initialWidth,
  initialHeight: node.initialHeight,
  measured: node.measured
    ? { width: node.measured.width, height: node.measured.height }
    : undefined,
  hidden: node.hidden,
})

const serializeHandle = (
  handle: NonNullable<
    NonNullable<InternalNode["internals"]["handleBounds"]>["source"]
  >[number]
): SerializedHandle => ({
  id: handle.id ?? null,
  type: handle.type,
  position: handle.position,
  x: handle.x,
  y: handle.y,
  width: handle.width,
  height: handle.height,
})

const serializeHandles = (
  handles:
    | NonNullable<InternalNode["internals"]["handleBounds"]>["source"]
    | undefined
): SerializedHandle[] | null | undefined => {
  if (handles === undefined) return undefined
  return handles?.map(serializeHandle) ?? null
}

const serializeInternalNode = (
  node: InternalNode
): SerializedInternalSolverNode => {
  const basic = serializeNode(node)
  const handleBounds = node.internals.handleBounds
    ? {
        source: serializeHandles(node.internals.handleBounds.source) ?? null,
        target: serializeHandles(node.internals.handleBounds.target) ?? null,
      }
    : undefined
  const handles = node.handles?.map((handle) => ({
    id: handle.id ?? null,
    type: handle.type,
    position: handle.position,
    x: handle.x,
    y: handle.y,
    width: handle.width ?? 1,
    height: handle.height ?? 1,
  }))

  return {
    ...basic,
    positionAbsolute: clonePoint(node.internals.positionAbsolute),
    handleBounds,
    handles,
  }
}

const cloneRouteMap = (
  routeById: Readonly<Record<string, readonly IPoint[]>> | undefined
): Record<string, IPoint[]> | undefined =>
  routeById
    ? Object.fromEntries(
        Object.entries(routeById).map(([id, points]) => [
          id,
          clonePoints(points),
        ])
      )
    : undefined

const serializeLiveOverride = (
  override: LiveEdgeOverride | null | undefined
): SerializedLiveEdgeOverride | null | undefined =>
  override === undefined
    ? undefined
    : override === null
      ? null
      : {
          edgeId: override.edgeId,
          points: clonePoints(override.points),
          edge: override.edge ? serializeEdge(override.edge) : undefined,
          strategy: override.strategy,
        }

export const serializeSolverInput = (
  input: SolverInput
): SerializedSolverInput => ({
  nodes: input.nodes.map(serializeNode),
  nodeLookup: [...input.nodeLookup].map(([id, node]) => [
    id,
    serializeInternalNode(node),
  ]),
  connectionMode: input.connectionMode as "strict" | "loose",
  edges: input.edges.map(serializeEdge),
  straightPathTypes: [...input.straightPathTypes],
  straightHookTypes: [...input.straightHookTypes],
  fixedEdges: input.fixedEdges?.map(serializeEdge),
  liveOverride: serializeLiveOverride(input.liveOverride),
  previous: cloneRouteMap(input.previous),
})

const deserializeNode = (node: SerializedSolverNode): Node =>
  ({
    ...node,
    position: clonePoint(node.position),
    measured: node.measured ? { ...node.measured } : undefined,
    data: {},
  }) as Node

const deserializeHandle = (handle: SerializedHandle) => ({ ...handle })

const deserializeEdge = (edge: SerializedSolverEdge): Edge =>
  ({
    ...edge,
    data: edge.data
      ? {
          points: edge.data.points ? clonePoints(edge.data.points) : undefined,
          sourceAnchor: edge.data.sourceAnchor
            ? { ...edge.data.sourceAnchor }
            : undefined,
          targetAnchor: edge.data.targetAnchor
            ? { ...edge.data.targetAnchor }
            : undefined,
        }
      : undefined,
  }) as Edge

const deserializeInternalNode = (
  node: SerializedInternalSolverNode
): InternalNode => {
  const userNode = deserializeNode(node)
  return {
    ...userNode,
    handles: node.handles?.map(deserializeHandle),
    measured: node.measured ? { ...node.measured } : {},
    internals: {
      positionAbsolute: clonePoint(node.positionAbsolute),
      z: 0,
      userNode,
      handleBounds: node.handleBounds
        ? {
            source: node.handleBounds.source?.map(deserializeHandle) ?? null,
            target: node.handleBounds.target?.map(deserializeHandle) ?? null,
          }
        : undefined,
    },
  } as InternalNode
}

const deserializeLiveOverride = (
  override: SerializedLiveEdgeOverride | null | undefined
): LiveEdgeOverride | null | undefined =>
  override === undefined
    ? undefined
    : override === null
      ? null
      : {
          edgeId: override.edgeId,
          points: clonePoints(override.points),
          edge: override.edge ? deserializeEdge(override.edge) : undefined,
          strategy: override.strategy,
        }

export const deserializeSolverInput = (
  input: SerializedSolverInput
): SolverInput => ({
  nodes: input.nodes.map(deserializeNode),
  nodeLookup: new Map(
    input.nodeLookup.map(([id, node]) => [id, deserializeInternalNode(node)])
  ),
  connectionMode: input.connectionMode as ConnectionMode,
  edges: input.edges.map(deserializeEdge),
  straightPathTypes: new Set(input.straightPathTypes),
  straightHookTypes: new Set(input.straightHookTypes),
  fixedEdges: input.fixedEdges?.map(deserializeEdge),
  liveOverride: deserializeLiveOverride(input.liveOverride),
  previous: cloneRouteMap(input.previous),
})
