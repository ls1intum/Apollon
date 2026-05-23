import { create } from "zustand"
import { BBox, Point } from "../utils/geometry/OrthogonalVisibilityGraph"
import type { RouteRequest, RouteResponse } from "../workers/routing.worker"

type Pending = {
  resolve: (path: Point[]) => void
  reject: (err: Error) => void
}

let workerInstance: Worker | null = null
let msgIdCounter = 0
let workerLeaseCount = 0
const pendingRequests = new Map<string, Pending>()
type HotModule = { dispose: (callback: () => void) => void }
type HotImportMeta = ImportMeta & { hot?: HotModule }

function getWorker() {
  return new Worker(new URL("../workers/routing.worker.ts", import.meta.url), {
    type: "module",
  })
}

function initializeWorker() {
  if (workerInstance) return

  workerInstance = getWorker()
  workerInstance.onmessage = (e: MessageEvent<RouteResponse>) => {
    const { msgId, path, error } = e.data
    const pending = pendingRequests.get(msgId)
    if (!pending) return
    pendingRequests.delete(msgId)
    if (error) {
      pending.reject(new Error(error))
    } else {
      pending.resolve(path)
    }
  }
  workerInstance.onerror = (e: ErrorEvent) => {
    // A fatal worker error invalidates all in-flight requests.
    const err = new Error(e.message || "Routing worker error")
    for (const pending of pendingRequests.values()) pending.reject(err)
    pendingRequests.clear()
  }
}

function terminateWorker() {
  if (!workerInstance) return
  workerInstance.terminate()
  workerInstance = null
  const err = new Error("Routing worker terminated")
  for (const pending of pendingRequests.values()) pending.reject(err)
  pendingRequests.clear()
}

export function retainRoutingWorker(): () => void {
  workerLeaseCount += 1
  let released = false

  return () => {
    if (released) return
    released = true
    workerLeaseCount = Math.max(0, workerLeaseCount - 1)
    if (workerLeaseCount === 0) {
      terminateWorker()
    }
  }
}

// Vite HMR: tear down the worker so pending promises don't leak across reloads.
const hot = (import.meta as HotImportMeta).hot
if (hot) {
  hot.dispose(() => {
    terminateWorker()
  })
}

export type CalculateRouteOptions = {
  /** Optional per-obstacle padding overrides, parallel to `obstacles`. */
  paddings?: Array<number | undefined>
}

export type RoutingState = {
  /**
   * Dispatches a route calculation request to the Web Worker and returns
   * a Promise resolving to the calculated array of Points.
   */
  calculateRoute: (
    edgeId: string,
    obstacles: BBox[],
    source: Point,
    target: Point,
    waypoints?: Point[],
    options?: CalculateRouteOptions
  ) => Promise<Point[]>
  /** Terminate the worker — call on app unmount or during HMR. */
  disposeRoutingWorker: () => void
}

export const useRoutingStore = create<RoutingState>(() => ({
  calculateRoute: (edgeId, obstacles, source, target, waypoints, options) => {
    initializeWorker()

    return new Promise<Point[]>((resolve, reject) => {
      const msgId = `${edgeId}-${++msgIdCounter}`
      pendingRequests.set(msgId, { resolve, reject })

      const request: RouteRequest = {
        msgId,
        edgeId,
        obstacles,
        source,
        target,
        waypoints,
        paddings: options?.paddings,
      }

      workerInstance!.postMessage(request)
    })
  },
  disposeRoutingWorker: terminateWorker,
}))
