import {
  computeAllEdgeGeometry,
  type EdgeSolveCacheEntry,
} from "@/utils/geometry/edgeGeometrySolver"
import {
  deserializeEdgeSolveCache,
  deserializeSolverInput,
  EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
  type EdgeGeometrySolveRequest,
  type EdgeGeometryWorkerResponse,
} from "@/utils/geometry/edgeGeometryWorkerProtocol"
import {
  diffRoutingPerfCounters,
  getRoutingPerfCounters,
} from "@/sync/perfCounters"

export const handleEdgeGeometryWorkerRequest = (
  request: EdgeGeometrySolveRequest,
  solveCache: Map<string, EdgeSolveCacheEntry> = new Map()
): EdgeGeometryWorkerResponse => {
  const startedAt = performance.now()
  const perfBefore =
    import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
      ? getRoutingPerfCounters()
      : undefined
  try {
    const input = deserializeSolverInput(request.input)
    // The main thread solves once before starting a Worker. Import that exact
    // cache only at session bootstrap; a delayed or duplicated request must never
    // replace results the Worker has since proven for newer revisions.
    if (solveCache.size === 0 && request.initialCache) {
      for (const [edgeId, entry] of deserializeEdgeSolveCache(
        request.initialCache
      ))
        solveCache.set(edgeId, entry)
    }
    const { routeById } = computeAllEdgeGeometry({ ...input, solveCache })
    return {
      protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
      sessionId: request.sessionId,
      revision: request.revision,
      kind: "result",
      routeById,
      durationMs: performance.now() - startedAt,
      perfDelta:
        import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
          ? diffRoutingPerfCounters(perfBefore, getRoutingPerfCounters())
          : undefined,
    }
  } catch (error) {
    return {
      protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
      sessionId: request.sessionId,
      revision: request.revision,
      kind: "error",
      message:
        error instanceof Error ? error.message : "Edge geometry solve failed",
    }
  }
}
