/**
 * HTTP resource that converts an Apollon UMLModel to PNG or PDF on the
 * server. The standalone webapp does its own client-side render; this path
 * exists for the Artemis LMS exam-integrity flow, which needs a verified
 * render of a student's submission produced in a controlled environment.
 *
 * Architecture: a single Node worker thread handles both formats so that
 * the JSDOM bootstrap and Apollon-library load are amortised. Requests are
 * queued (default depth 20) and timed out (default 30 s); the worker is
 * given a strict heap limit and is auto-restarted on crash.
 */
import { Request, Response } from "express"
import { Worker } from "node:worker_threads"
import path from "node:path"
import type { UMLModel } from "@tumaet/apollon"
import type { ConversionFormat } from "../workers/conversion-worker-thread"

type QueueEntry = {
  id: number
  format: ConversionFormat
  model: UMLModel
  resolve: (bytes: Buffer) => void
  reject: (error: Error) => void
}

type WorkerSuccess = {
  id: number
  ok: true
  format: ConversionFormat
  bytes: Uint8Array
}

type WorkerFailure = {
  id: number
  ok: false
  error: string
}

type WorkerMessage = WorkerSuccess | WorkerFailure

const FORMAT_MIME: Record<ConversionFormat, string> = {
  png: "image/png",
  pdf: "application/pdf",
}

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
   * Recycle the worker after this many successful renders. The Apollon
   * library + JSDOM combination retains ~10 MB per export (the React Flow
   * component tree leaves dangling references the GC can't collect with
   * jsdom's mocked ResizeObserver/getBBox). Without recycling, the worker
   * crashes against `workerMaxOldGenerationMb` after ~20 renders. With it,
   * the next request after the threshold pays a one-time ~600 ms restart
   * but memory stays bounded indefinitely.
   */
  private readonly workerMaxRendersBeforeRecycle = Number(
    process.env.CONVERTER_WORKER_MAX_RENDERS ?? 15
  )

  private worker: Worker
  private queue: QueueEntry[] = []
  private activeJob:
    | {
        id: number
        timeout: NodeJS.Timeout
        resolve: (bytes: Buffer) => void
        reject: (error: Error) => void
      }
    | undefined
  private nextId = 1
  private rendersOnCurrentWorker = 0

  constructor() {
    this.worker = this.createWorker()
  }

  private createWorker() {
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

  private handleWorkerMessage(message: WorkerMessage) {
    if (!this.activeJob || this.activeJob.id !== message.id) return

    clearTimeout(this.activeJob.timeout)
    const activeJob = this.activeJob
    this.activeJob = undefined

    if (message.ok) {
      activeJob.resolve(Buffer.from(message.bytes))
      this.rendersOnCurrentWorker++
      if (this.rendersOnCurrentWorker >= this.workerMaxRendersBeforeRecycle) {
        // Drain accumulated DOM/library state by replacing the worker
        // before the next render starts. The next call pays a one-time
        // restart cost; subsequent ones are normal.
        this.recycleWorker()
        return
      }
    } else {
      activeJob.reject(new Error(message.error))
    }

    this.processQueue()
  }

  /**
   * Replace the current worker with a fresh one. Unlike `restartWorker`,
   * this does not reject the active job (there is none — we just finished
   * one) and runs as the routine memory-bound recycle path.
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

  private processQueue() {
    if (this.activeJob) return

    const nextEntry = this.queue.shift()
    if (!nextEntry) return

    const timeout = setTimeout(() => {
      this.restartWorker(this.worker, new Error("Conversion worker timed out"))
    }, this.conversionTimeoutMs)

    this.activeJob = {
      id: nextEntry.id,
      timeout,
      resolve: nextEntry.resolve,
      reject: nextEntry.reject,
    }

    this.worker.postMessage({
      id: nextEntry.id,
      format: nextEntry.format,
      model: nextEntry.model,
    })
  }

  private render = async (
    format: ConversionFormat,
    model: UMLModel
  ): Promise<Buffer> => {
    if (this.queue.length >= this.maxQueueLength) {
      throw new Error("Conversion queue is full")
    }

    return new Promise<Buffer>((resolve, reject) => {
      this.queue.push({
        id: this.nextId++,
        format,
        model,
        resolve,
        reject,
      })
      this.processQueue()
    })
  }

  private convert = async (
    format: ConversionFormat,
    req: Request,
    res: Response
  ) => {
    let model: UMLModel | undefined

    if (!req.body) {
      res.status(400).send({ error: "Model must be defined!" })
      return
    }

    try {
      model = req.body.model ? req.body.model : req.body
      if (typeof model === "string") {
        model = JSON.parse(model)
      }

      const bytes = await this.render(format, model as UMLModel)
      res.type(FORMAT_MIME[format])
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

  convertPdf = (req: Request, res: Response) => this.convert("pdf", req, res)
  convertPng = (req: Request, res: Response) => this.convert("png", req, res)

  status = (_req: Request, res: Response) => {
    res.sendStatus(200)
  }
}
