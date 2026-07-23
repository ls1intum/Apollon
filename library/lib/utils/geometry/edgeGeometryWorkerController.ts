import {
  EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
  type EdgeGeometrySolveRequest,
  type EdgeGeometrySolveResult,
  type EdgeGeometryWorkerResponse,
  type SerializedEdgeSolveCache,
  type SerializedSolverInput,
} from "@/utils/geometry/edgeGeometryWorkerProtocol"

export type EdgeGeometryWorkerPort = {
  postMessage: (request: EdgeGeometrySolveRequest) => void
  terminate: () => void
}

type ControllerOptions = {
  sessionId: string
  worker: EdgeGeometryWorkerPort
  onResult: (result: EdgeGeometrySolveResult) => void
  /** Exact result for a superseded input snapshot. It may improve transient
   * display geometry, but must never replace the latest settled generation. */
  onProvisionalResult?: (result: EdgeGeometrySolveResult) => void
  onFailure: (message: string) => void
}

let sessionCounter = 0

export const createEdgeGeometryWorkerSessionId = (): string =>
  `edge-geometry-${++sessionCounter}`

export const shouldUseEdgeGeometryWorker = ({
  hasRunInitialSolve,
  edgeCount,
  threshold,
  disabled,
}: {
  hasRunInitialSolve: boolean
  edgeCount: number
  threshold: number
  disabled: boolean
}): boolean => hasRunInitialSolve && edgeCount >= threshold && !disabled

export const EDGE_GEOMETRY_WORKER_EDGE_THRESHOLD = 32
export const EDGE_GEOMETRY_WORKER_PREVIEW_EDGE_THRESHOLD =
  EDGE_GEOMETRY_WORKER_EDGE_THRESHOLD
/** Maximum time between sampled holistic previews during active interaction.
 * The Worker still coalesces to one in-flight + one pending generation. */
export const EDGE_GEOMETRY_WORKER_PREVIEW_CADENCE_MS = 80

/**
 * At the measured crossover where routing moves off-thread, sample changing
 * input at a bounded cadence. Superseded solves can improve the display-only
 * preview, while only the newest revision may replace settled geometry.
 */
export const shouldSampleEdgeGeometryWorker = ({
  edgeCount,
  interacting,
}: {
  edgeCount: number
  interacting: boolean
}): boolean =>
  interacting && edgeCount >= EDGE_GEOMETRY_WORKER_PREVIEW_EDGE_THRESHOLD

/**
 * A Worker cannot interrupt a CPU-bound solve already running. Keep at most one
 * request in flight and one replaceable pending snapshot instead: rapid drag
 * frames collapse to the newest revision rather than forming an obsolete queue.
 */
export class EdgeGeometryWorkerController {
  readonly sessionId: string

  private readonly worker: EdgeGeometryWorkerPort
  private readonly onResult: ControllerOptions["onResult"]
  private readonly onProvisionalResult: ControllerOptions["onProvisionalResult"]
  private readonly onFailure: ControllerOptions["onFailure"]
  private latestRevision = 0
  private hardInvalidatedThrough = 0
  private inFlightRevision: number | null = null
  private pendingRequest: EdgeGeometrySolveRequest | null = null
  private hasSubmitted = false
  private disposed = false

  constructor({
    sessionId,
    worker,
    onResult,
    onProvisionalResult,
    onFailure,
  }: ControllerOptions) {
    this.sessionId = sessionId
    this.worker = worker
    this.onResult = onResult
    this.onProvisionalResult = onProvisionalResult
    this.onFailure = onFailure
  }

  submit(
    input: SerializedSolverInput,
    initialCache?: SerializedEdgeSolveCache
  ): number {
    if (this.disposed) return this.latestRevision
    const isFirstRequest = !this.hasSubmitted
    this.hasSubmitted = true
    const request: EdgeGeometrySolveRequest = {
      protocol: EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      revision: ++this.latestRevision,
      kind: "solve",
      input,
      initialCache: isFirstRequest ? initialCache : undefined,
    }
    if (this.inFlightRevision !== null) {
      this.pendingRequest = request
    } else {
      this.post(request)
    }
    return request.revision
  }

  /**
   * Make every outstanding result stale. Used before a synchronous solve and
   * when transient interaction state clears.
   */
  invalidate(): number {
    if (this.disposed) return this.latestRevision
    this.pendingRequest = null
    const revision = ++this.latestRevision
    this.hardInvalidatedThrough = revision
    return revision
  }

  /**
   * Mark outstanding work as too old to settle while keeping its exact result
   * eligible as a provisional display generation. Interaction code can use this
   * before deferring the next submit; synchronous commits must use `invalidate`.
   */
  supersede(): number {
    if (this.disposed) return this.latestRevision
    return ++this.latestRevision
  }

  receive(response: EdgeGeometryWorkerResponse): void {
    if (
      this.disposed ||
      response.protocol !== EDGE_GEOMETRY_WORKER_PROTOCOL_VERSION ||
      response.sessionId !== this.sessionId ||
      response.revision !== this.inFlightRevision
    )
      return

    this.inFlightRevision = null
    if (response.kind === "result") {
      if (response.revision === this.latestRevision) this.onResult(response)
      else if (response.revision > this.hardInvalidatedThrough)
        this.onProvisionalResult?.(response)
    } else if (response.revision === this.latestRevision) {
      this.pendingRequest = null
      this.onFailure(response.message)
      return
    }

    const pending = this.pendingRequest
    this.pendingRequest = null
    // A cadence-sampled request may itself have been superseded by newer
    // pointer frames. It is still valuable as bounded-lag display progress;
    // only a hard invalidation makes it ineligible to run.
    if (pending && pending.revision > this.hardInvalidatedThrough)
      this.post(pending)
  }

  fail(message: string): void {
    if (this.disposed) return
    this.pendingRequest = null
    this.inFlightRevision = null
    this.onFailure(message)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.pendingRequest = null
    this.inFlightRevision = null
    this.worker.terminate()
  }

  private post(request: EdgeGeometrySolveRequest): void {
    try {
      this.worker.postMessage(request)
      this.inFlightRevision = request.revision
    } catch (error) {
      this.pendingRequest = null
      this.inFlightRevision = null
      this.onFailure(
        error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
          ? error.message
          : "Failed to post geometry solve"
      )
    }
  }
}
