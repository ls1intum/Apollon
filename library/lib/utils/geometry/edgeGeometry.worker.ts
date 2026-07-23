import type { EdgeSolveCacheEntry } from "./edgeGeometrySolver"
import { handleEdgeGeometryWorkerRequest } from "./edgeGeometryWorkerHandler"
import type {
  EdgeGeometrySolveRequest,
  EdgeGeometryWorkerResponse,
} from "./edgeGeometryWorkerProtocol"

type WorkerScope = {
  onmessage: ((event: MessageEvent<EdgeGeometrySolveRequest>) => void) | null
  postMessage: (response: EdgeGeometryWorkerResponse) => void
}

const scope = globalThis as unknown as WorkerScope
const solveCache = new Map<string, EdgeSolveCacheEntry>()

scope.onmessage = ({ data }) => {
  scope.postMessage(handleEdgeGeometryWorkerRequest(data, solveCache))
}
