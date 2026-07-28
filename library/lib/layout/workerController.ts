import type { DiagramLayoutSnapshot } from "./model"
import { CANVAS } from "@/utils/geometry/routingConstants"
import {
  DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
  type DiagramLayoutWorkerRequest,
  type DiagramLayoutWorkerResponse,
  type DiagramLayoutWorkerResult,
} from "./workerProtocol"

export type DiagramLayoutWorkerPort = {
  postMessage: (request: DiagramLayoutWorkerRequest) => void
  terminate: () => void
  onmessage: ((event: MessageEvent<DiagramLayoutWorkerResponse>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
}

export type DiagramLayoutJob = Readonly<{
  result: Promise<DiagramLayoutWorkerResult>
  cancel: () => void
}>

export type DiagramLayoutErrorCode =
  | "timeout"
  | "worker-start"
  | "worker-runtime"
  | "invalid-result"

export class DiagramLayoutError extends Error {
  public readonly name = "DiagramLayoutError"

  public constructor(
    public readonly code: DiagramLayoutErrorCode,
    message: string
  ) {
    super(message)
  }
}

let requestCounter = 0

const compareId = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

const validateResult = (
  input: DiagramLayoutSnapshot,
  result: DiagramLayoutWorkerResult
): void => {
  const expected = input.solver.nodes.map((node) => node.id).sort(compareId)
  const actual = Object.keys(result.positions).sort(compareId)
  if (
    expected.length !== actual.length ||
    expected.some((id, index) => id !== actual[index])
  )
    throw new Error("Diagram layout Worker returned an incomplete node set")
  const nodeById = new Map(input.solver.nodes.map((node) => [node.id, node]))
  for (const [id, position] of Object.entries(result.positions)) {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y))
      throw new Error("Diagram layout Worker returned a non-finite position")
    if (
      !nodeById.get(id)?.hidden &&
      (position.x !== nodeById.get(id)?.position.x ||
        position.y !== nodeById.get(id)?.position.y) &&
      (Math.abs(position.x % CANVAS.SNAP_TO_GRID_PX) > 1e-9 ||
        Math.abs(position.y % CANVAS.SNAP_TO_GRID_PX) > 1e-9)
    )
      throw new Error("Diagram layout Worker returned an off-grid position")
  }
}

const createWorker = (): DiagramLayoutWorkerPort =>
  new Worker(new URL("./diagramLayout.worker.ts", import.meta.url), {
    type: "module",
    name: "apollon-diagram-layout",
  }) as DiagramLayoutWorkerPort

export const startDiagramLayoutJob = (
  input: DiagramLayoutSnapshot,
  {
    worker: suppliedWorker,
    timeoutMs = 5_000,
  }: {
    worker?: DiagramLayoutWorkerPort
    timeoutMs?: number
  } = {}
): DiagramLayoutJob => {
  let worker: DiagramLayoutWorkerPort
  try {
    worker = suppliedWorker ?? createWorker()
  } catch {
    return {
      result: Promise.reject(
        new DiagramLayoutError(
          "worker-start",
          "Diagram layout Worker could not start"
        )
      ),
      cancel: () => {},
    }
  }
  const requestId = ++requestCounter
  let settled = false
  let resolveResult: (value: DiagramLayoutWorkerResult) => void = () => {}
  let rejectResult: (reason: unknown) => void = () => {}

  const finish = () => {
    if (settled) return false
    settled = true
    clearTimeout(timeout)
    worker.onmessage = null
    worker.onerror = null
    worker.terminate()
    return true
  }

  const result = new Promise<DiagramLayoutWorkerResult>((resolve, reject) => {
    resolveResult = resolve
    rejectResult = reject
  })

  worker.onmessage = ({ data }) => {
    if (
      data.protocol !== DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION ||
      data.requestId !== requestId
    )
      return
    if (!finish()) return
    if (data.kind === "result") {
      try {
        validateResult(input, data)
        resolveResult(data)
      } catch {
        rejectResult(
          new DiagramLayoutError(
            "invalid-result",
            "Diagram layout Worker returned an invalid result"
          )
        )
      }
    } else
      rejectResult(
        new DiagramLayoutError("worker-runtime", "Diagram layout Worker failed")
      )
  }
  worker.onerror = () => {
    if (!finish()) return
    rejectResult(
      new DiagramLayoutError("worker-runtime", "Diagram layout Worker failed")
    )
  }
  const timeout = setTimeout(() => {
    if (!finish()) return
    rejectResult(new DiagramLayoutError("timeout", "Diagram layout timed out"))
  }, timeoutMs)
  try {
    worker.postMessage({
      protocol: DIAGRAM_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId,
      kind: "layout",
      input,
    })
  } catch {
    if (finish())
      rejectResult(
        new DiagramLayoutError(
          "worker-start",
          "Diagram layout Worker could not start"
        )
      )
  }

  return {
    result,
    cancel: () => {
      if (!finish()) return
      rejectResult(new DOMException("Diagram layout cancelled", "AbortError"))
    },
  }
}
