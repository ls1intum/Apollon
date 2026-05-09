/**
 * HTTP-driven conversion pipeline. Two render modes share one
 * worker-thread + one queue:
 *
 *   - **PDF** (`/api/converter/pdf`): user-clicked, ≤ 30 s tolerance,
 *     produced for the Artemis LMS exam-integrity flow.
 *   - **SVG** (`/api/diagrams/:id/preview.svg` and `/embed/:id`):
 *     Camo / browser fetches, sub-second tolerance, served per-render
 *     into the embed surface.
 *
 * # Architecture
 *
 *   - A single Node worker thread renders serially so the JSDOM
 *     bootstrap + Apollon-library load are amortised.
 *   - The worker is auto-restarted on crash and routinely recycled
 *     after `CONVERTER_WORKER_MAX_RENDERS` successful renders to
 *     bound JSDOM heap growth (the React Flow component tree leaves
 *     refs the GC can't collect under jsdom's mocked DOM).
 *   - Requests are queued; backpressure is `503` past
 *     `CONVERTER_MAX_QUEUE_LENGTH`.
 *
 * # Why SVG-priority dispatch
 *
 * PDFs and SVGs share one queue against one single-threaded worker.
 * FIFO would park sub-second-tolerance embed requests behind a
 * 30-second-tolerance PDF burst and trigger 503 storms downstream
 * (GitHub Camo retries 3× then gives up, leaving every README image
 * broken until Camo's recheck cycle).
 *
 * `dequeueNext` walks the queue, returns the first SVG entry if any,
 * and falls back to FIFO. Cost: O(queue depth) per dispatch — fine
 * for the 20-slot cap.
 *
 * # Anti-starvation backstop
 *
 * Sustained SVG load would otherwise leave a queued PDF skipped
 * indefinitely. We track per-entry `skipCount` and force-promote any
 * PDF passed over `PDF_STARVATION_THRESHOLD` times — a hard upper
 * bound on PDF wait. Threshold (8) lets a fully saturated queue give
 * each PDF a turn within seconds.
 */
import { Request, Response } from "express"
import { Worker } from "node:worker_threads"
import path from "node:path"
import type { UMLModel } from "@tumaet/apollon"

export interface SvgRender {
  svg: string
  clip: { x: number; y: number; width: number; height: number }
}

type PdfQueueEntry = {
  id: number
  mode: "pdf"
  model: UMLModel
  resolve: (bytes: Buffer) => void
  reject: (error: Error) => void
  /**
   * How many times this PDF has been skipped over by SVG-priority
   * dispatch. Promoted to the head of the queue once the count
   * reaches `PDF_STARVATION_THRESHOLD`.
   */
  skipCount: number
}

type SvgQueueEntry = {
  id: number
  mode: "svg"
  model: UMLModel
  resolve: (svg: SvgRender) => void
  reject: (error: Error) => void
}

type QueueEntry = PdfQueueEntry | SvgQueueEntry

type PdfSuccess = { id: number; ok: true; type: "pdf"; bytes: Uint8Array }
type SvgSuccess = {
  id: number
  ok: true
  type: "svg"
  svg: string
  clip: { x: number; y: number; width: number; height: number }
}
type WorkerFailure = { id: number; ok: false; error: string }
type WorkerMessage = PdfSuccess | SvgSuccess | WorkerFailure

type ActiveJob =
  | {
      mode: "pdf"
      id: number
      timeout: NodeJS.Timeout
      resolve: (bytes: Buffer) => void
      reject: (error: Error) => void
    }
  | {
      mode: "svg"
      id: number
      timeout: NodeJS.Timeout
      resolve: (svg: SvgRender) => void
      reject: (error: Error) => void
    }

const PDF_STARVATION_THRESHOLD = 8

export class ConversionResource {
  private readonly conversionTimeoutMs = Number(
    process.env.CONVERTER_TIMEOUT_MS ?? 30000
  )
  private readonly maxQueueLength = Number(
    process.env.CONVERTER_MAX_QUEUE_LENGTH ?? 20
  )
  private readonly workerMaxOldGenerationMb = Number(
    process.env.CONVERTER_WORKER_MAX_OLD_SPACE_MB ?? 256
  )
  private readonly workerStackMb = Number(
    process.env.CONVERTER_WORKER_STACK_MB ?? 8
  )
  /**
   * Recycle the worker after this many successful renders. Apollon +
   * JSDOM retain ~10 MB per export (React Flow + jsdom interaction
   * leaves dangling refs). Without recycling, the worker crashes
   * against `workerMaxOldGenerationMb` after ~20 renders. With it,
   * the next request after the threshold pays a one-time ~600 ms
   * restart but memory stays bounded indefinitely.
   */
  private readonly workerMaxRendersBeforeRecycle = Number(
    process.env.CONVERTER_WORKER_MAX_RENDERS ?? 15
  )

  private worker: Worker
  private queue: QueueEntry[] = []
  private activeJob: ActiveJob | undefined
  private nextId = 1
  private rendersOnCurrentWorker = 0

  constructor() {
    this.worker = this.createWorker()
  }

  protected createWorker(): Worker {
    const workerPath = path.resolve(
      __dirname,
      "../workers/conversion-worker-thread.js"
    )

    const worker = new Worker(workerPath, {
      env: { ...process.env },
      resourceLimits: {
        maxOldGenerationSizeMb: this.workerMaxOldGenerationMb,
        stackSizeMb: this.workerStackMb,
      },
    })

    worker.on("message", (message: WorkerMessage) => {
      if (this.worker !== worker) return
      this.handleWorkerMessage(message)
    })
    worker.on("error", (error) => {
      if (this.worker !== worker) return
      this.restartWorker(worker, error)
    })
    worker.on("exit", (code) => {
      if (this.worker !== worker) return
      if (code !== 0) {
        this.restartWorker(
          worker,
          new Error(`Conversion worker thread exited with code ${code}`)
        )
      }
    })

    return worker
  }

  protected handleWorkerMessage(message: WorkerMessage) {
    if (!this.activeJob || this.activeJob.id !== message.id) return

    clearTimeout(this.activeJob.timeout)
    const activeJob = this.activeJob
    this.activeJob = undefined

    if (!message.ok) {
      activeJob.reject(new Error(message.error))
      this.processQueue()
      return
    }

    // Mode mismatch is a programmer error in the worker, not a
    // transient failure. Reject the job rather than mis-routing.
    if (message.type !== activeJob.mode) {
      activeJob.reject(
        new Error(
          `Conversion worker returned ${message.type} for ${activeJob.mode} job`
        )
      )
      this.processQueue()
      return
    }

    if (activeJob.mode === "pdf" && message.type === "pdf") {
      activeJob.resolve(Buffer.from(message.bytes))
    } else if (activeJob.mode === "svg" && message.type === "svg") {
      activeJob.resolve({ svg: message.svg, clip: message.clip })
    }

    // Recycle counter increments on *any* successful render — heap
    // pressure is mode-agnostic.
    this.rendersOnCurrentWorker++
    if (this.rendersOnCurrentWorker >= this.workerMaxRendersBeforeRecycle) {
      this.recycleWorker()
      return
    }
    this.processQueue()
  }

  /**
   * Replace the current worker with a fresh one. Unlike
   * `restartWorker`, this does not reject the active job (there is
   * none — we just finished one) and runs as the routine memory-bound
   * recycle path.
   */
  private recycleWorker() {
    const stale = this.worker
    void stale.terminate().catch(() => undefined)
    this.worker = this.createWorker()
    this.rendersOnCurrentWorker = 0
    this.processQueue()
  }

  private restartWorker(worker: Worker, error: Error) {
    if (this.worker !== worker) return

    if (this.activeJob) {
      clearTimeout(this.activeJob.timeout)
      const activeJob = this.activeJob
      this.activeJob = undefined
      activeJob.reject(error)
    }

    void worker.terminate().catch(() => undefined)
    this.worker = this.createWorker()
    this.rendersOnCurrentWorker = 0
    this.processQueue()
  }

  /**
   * SVG-priority + anti-starvation. Returns the next entry to dispatch,
   * or `undefined` if the queue is empty. Mutates the queue.
   */
  private dequeueNext(): QueueEntry | undefined {
    if (this.queue.length === 0) return undefined

    // Anti-starvation: any PDF skipped enough times wins next pick,
    // regardless of any pending SVG.
    const starvedIdx = this.queue.findIndex(
      (e) => e.mode === "pdf" && e.skipCount >= PDF_STARVATION_THRESHOLD
    )
    if (starvedIdx >= 0) {
      const [entry] = this.queue.splice(starvedIdx, 1)
      return entry
    }

    const svgIndex = this.queue.findIndex((e) => e.mode === "svg")
    if (svgIndex >= 0) {
      // Bump skipCount on every PDF this SVG just jumped over. After
      // enough jumps, the PDF earns priority via the branch above.
      for (let i = 0; i < svgIndex; i++) {
        const entry = this.queue[i]
        if (entry && entry.mode === "pdf") entry.skipCount += 1
      }
      const [entry] = this.queue.splice(svgIndex, 1)
      return entry
    }
    return this.queue.shift()
  }

  private processQueue() {
    if (this.activeJob) return
    const nextEntry = this.dequeueNext()
    if (!nextEntry) return

    const timeout = setTimeout(() => {
      this.restartWorker(this.worker, new Error("Conversion worker timed out"))
    }, this.conversionTimeoutMs)

    if (nextEntry.mode === "pdf") {
      this.activeJob = {
        mode: "pdf",
        id: nextEntry.id,
        timeout,
        resolve: nextEntry.resolve,
        reject: nextEntry.reject,
      }
    } else {
      this.activeJob = {
        mode: "svg",
        id: nextEntry.id,
        timeout,
        resolve: nextEntry.resolve,
        reject: nextEntry.reject,
      }
    }

    this.worker.postMessage({
      id: nextEntry.id,
      mode: nextEntry.mode,
      model: nextEntry.model,
    })
  }

  private renderPdf = (model: UMLModel): Promise<Buffer> => {
    if (this.queue.length >= this.maxQueueLength) {
      throw new Error("Conversion queue is full")
    }
    return new Promise<Buffer>((resolve, reject) => {
      this.queue.push({
        id: this.nextId++,
        mode: "pdf",
        model,
        resolve,
        reject,
        skipCount: 0,
      })
      this.processQueue()
    })
  }

  /**
   * Renders the diagram model to an SVG string + clip box. Used by
   * the embed surface (`/api/diagrams/:id/preview.svg` and
   * `/embed/:id`). Output is DOMPurify-sanitised inside the worker
   * before being returned.
   */
  renderSvg = (model: UMLModel): Promise<SvgRender> => {
    if (this.queue.length >= this.maxQueueLength) {
      throw new Error("Conversion queue is full")
    }
    return new Promise<SvgRender>((resolve, reject) => {
      this.queue.push({
        id: this.nextId++,
        mode: "svg",
        model,
        resolve,
        reject,
      })
      this.processQueue()
    })
  }

  convert = async (req: Request, res: Response) => {
    if (!req.body) {
      res.status(400).send({ error: "Model must be defined!" })
      return
    }

    try {
      let model: UMLModel = req.body.model ? req.body.model : req.body
      if (typeof model === "string") {
        model = JSON.parse(model)
      }

      const bytes = await this.renderPdf(model)
      res.type("application/pdf")
      res.status(200).send(bytes)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message === "Conversion queue is full") {
        res.status(503).send({ error: message })
        return
      }
      throw error
    }
  }

  status = (_req: Request, res: Response) => {
    res.sendStatus(200)
  }
}
