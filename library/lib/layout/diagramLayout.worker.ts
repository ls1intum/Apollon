import { solveDiagramLayout } from "./candidateSolver"
import {
  DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
  type DiagramLayoutWorkerRequest,
  type DiagramLayoutWorkerResponse,
} from "./workerProtocol"

type WorkerScope = {
  onmessage: ((event: MessageEvent<DiagramLayoutWorkerRequest>) => void) | null
  postMessage: (response: DiagramLayoutWorkerResponse) => void
}

const scope = globalThis as unknown as WorkerScope

scope.onmessage = async ({ data }) => {
  if (
    data.protocol !== DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION ||
    data.kind !== "layout"
  )
    return
  try {
    const { positions } = await solveDiagramLayout(data.input)
    scope.postMessage({
      protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId: data.requestId,
      kind: "result",
      positions,
    })
  } catch (error) {
    scope.postMessage({
      protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId: data.requestId,
      kind: "error",
      message: error instanceof Error ? error.message : "Diagram layout failed",
    })
  }
}
