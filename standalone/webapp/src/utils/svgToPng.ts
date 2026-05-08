/**
 * Rasterise an Apollon SVG export to a PNG blob via resvg-wasm in a Web Worker.
 *
 * The browser's `<canvas>` is capped at ~16 MP on Safari/iOS and ~268 MP on
 * Chrome — bigger diagrams used to silently produce 0-byte files (issue #667).
 * resvg renders directly into its own pixel buffer in WebAssembly memory and
 * emits a PNG byte-stream, so the canvas cap never applies. The 4 GB wasm32
 * address space is the hard ceiling; we cap at 32 MP so peak working set stays
 * well within reach on every browser (Safari/iOS is the strictest, ~16 MP for
 * `<canvas>`; we double that here because resvg doesn't use `<canvas>`).
 *
 * The Worker also frees the main thread while a 30-MP raster runs.
 */
import { RasterTimeoutError, RasterTooLargeError } from "./exportErrors"
import type {
  SvgToPngWorkerRequest,
  SvgToPngWorkerResponse,
} from "@/workers/svgToPng.worker"

/** 32 MP — comfortably below the wasm32 4 GB ceiling (~4× working set). */
const DEFAULT_MAX_AREA_PX = 32_000_000
/** Per-side cap (resvg renders to one buffer; per-side rarely binds first). */
const DEFAULT_MAX_DIMENSION_PX = 16_384
/** Generous because real diagrams take longer than 15 s on slow hardware. */
const DEFAULT_TIMEOUT_MS = 60_000
/** Terminate the worker after this many ms of inactivity to free its memory. */
const IDLE_TERMINATE_MS = 5 * 60_000

export type SvgToPngOptions = {
  /** Multiplier applied to the diagram clip dimensions. */
  scale?: number
  /** CSS color (e.g. "#ffffff") or null for transparent. */
  background?: string | null
  /** Override the default 32 MP area budget. */
  maxAreaPx?: number
  /** Override the default 16,384 px per-side cap. */
  maxDimensionPx?: number
  /** Override the default 60 s render timeout. */
  timeoutMs?: number
}

export type SvgToPngResult = {
  blob: Blob
  /** The scale that was actually used (≤ requested when clamped). */
  appliedScale: number
  clamped: boolean
  width: number
  height: number
}

/**
 * Compute the largest scale that fits both an area budget and a per-side cap.
 * Pure math, separated for unit testing without a worker.
 */
export function computeAppliedScale(
  width: number,
  height: number,
  requestedScale: number,
  maxAreaPx: number,
  maxDimensionPx: number
): number {
  if (width <= 0 || height <= 0) return requestedScale
  const areaScale = Math.sqrt(maxAreaPx / (width * height))
  const widthScale = maxDimensionPx / width
  const heightScale = maxDimensionPx / height
  return Math.min(requestedScale, areaScale, widthScale, heightScale)
}

// ---------------------------------------------------------------------------
// Worker plumbing
// ---------------------------------------------------------------------------

type Pending = {
  resolve: (
    response: Extract<SvgToPngWorkerResponse, { type: "rendered" }>
  ) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

let workerInstance: Worker | null = null
let idleTerminateTimer: ReturnType<typeof setTimeout> | null = null
const pending = new Map<string, Pending>()

let workerFactory: () => Worker = () =>
  new Worker(new URL("../workers/svgToPng.worker.ts", import.meta.url), {
    type: "module",
  })

function rejectAllPending(message: string) {
  pending.forEach((p) => {
    clearTimeout(p.timer)
    p.reject(new Error(message))
  })
  pending.clear()
}

function disposeWorker() {
  if (idleTerminateTimer) {
    clearTimeout(idleTerminateTimer)
    idleTerminateTimer = null
  }
  workerInstance?.terminate()
  workerInstance = null
}

function scheduleIdleTerminate() {
  if (idleTerminateTimer) clearTimeout(idleTerminateTimer)
  idleTerminateTimer = setTimeout(() => {
    if (pending.size === 0) disposeWorker()
  }, IDLE_TERMINATE_MS)
}

function getWorker(): Worker {
  if (workerInstance) return workerInstance
  const w = workerFactory()
  w.onmessage = (event: MessageEvent<SvgToPngWorkerResponse>) => {
    const data = event.data
    const p = pending.get(data.id)
    if (!p) return
    pending.delete(data.id)
    clearTimeout(p.timer)
    if (data.type === "error") {
      const err = new Error(data.error.message)
      err.name = data.error.name
      p.reject(err)
    } else {
      p.resolve(data)
    }
    if (pending.size === 0) scheduleIdleTerminate()
  }
  w.onerror = (event) => {
    rejectAllPending(event.message || "PNG worker crashed")
    disposeWorker()
  }
  workerInstance = w
  return w
}

function generateRequestId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function renderInWorker(
  payload: Omit<SvgToPngWorkerRequest, "id" | "type">,
  timeoutMs: number
): Promise<Extract<SvgToPngWorkerResponse, { type: "rendered" }>> {
  return new Promise((resolve, reject) => {
    if (idleTerminateTimer) {
      clearTimeout(idleTerminateTimer)
      idleTerminateTimer = null
    }
    const id = generateRequestId()
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(
        new RasterTimeoutError(
          `PNG render timed out after ${timeoutMs}ms — diagram is too complex.`
        )
      )
      if (pending.size === 0) scheduleIdleTerminate()
    }, timeoutMs)
    pending.set(id, { resolve, reject, timer })
    const request: SvgToPngWorkerRequest = { type: "render", id, ...payload }
    getWorker().postMessage(request)
  })
}

/**
 * Test-only seam used by the Vitest suite; no production caller imports it.
 * Tree-shaking keeps it out of the prod bundle because nothing else references
 * the `__test_internals__` symbol.
 */
export const __test_internals__ = {
  setWorkerFactory(factory: (() => Worker) | null): void {
    rejectAllPending("Worker reset for testing")
    disposeWorker()
    workerFactory =
      factory ??
      (() =>
        new Worker(new URL("../workers/svgToPng.worker.ts", import.meta.url), {
          type: "module",
        }))
  },
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function svgToPng(
  svg: string,
  clip: { width: number; height: number },
  opts: SvgToPngOptions = {}
): Promise<SvgToPngResult> {
  const requestedScale = opts.scale ?? 1.5
  const maxAreaPx = opts.maxAreaPx ?? DEFAULT_MAX_AREA_PX
  const maxDimensionPx = opts.maxDimensionPx ?? DEFAULT_MAX_DIMENSION_PX
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const background = opts.background ?? null

  if (clip.width <= 0 || clip.height <= 0) {
    throw new RasterTooLargeError(
      `Diagram has zero or negative dimensions (${clip.width}x${clip.height}).`,
      clip.width,
      clip.height
    )
  }

  const appliedScale = computeAppliedScale(
    clip.width,
    clip.height,
    requestedScale,
    maxAreaPx,
    maxDimensionPx
  )
  const clamped = appliedScale < requestedScale

  let response: Extract<SvgToPngWorkerResponse, { type: "rendered" }>
  try {
    response = await renderInWorker(
      { svg, scale: appliedScale, background },
      timeoutMs
    )
  } catch (err) {
    // Translate wasm out-of-memory into a typed error so the navbar branches.
    if (err instanceof RasterTimeoutError) throw err
    if (err instanceof RasterTooLargeError) throw err
    const e = err as Error
    if (
      e.name === "RangeError" ||
      /memory|allocation|out of memory/i.test(e.message ?? "")
    ) {
      const cw = Math.round(clip.width * appliedScale)
      const ch = Math.round(clip.height * appliedScale)
      throw new RasterTooLargeError(
        `PNG render ran out of memory at ${cw}x${ch}: ${e.message}`,
        cw,
        ch
      )
    }
    throw err
  }

  const { png, width, height } = response
  const blob = new Blob([png], { type: "image/png" })
  return { blob, appliedScale, clamped, width, height }
}
