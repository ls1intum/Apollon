import { Worker } from "node:worker_threads"
import path from "node:path"
import type { UMLModel } from "@tumaet/apollon"
import { Errors } from "../http/errors.js"
import type { ConversionFormat } from "../workers/conversion-worker-thread.js"

export type ConversionOutput = { mime: string; data: Buffer | string }

type Job = {
  id: number
  format: ConversionFormat
  model: UMLModel
  scale?: number
  resolve: (output: ConversionOutput) => void
  reject: (error: Error) => void
}

type WorkerMessage =
  | { id: number; ok: true; mime: string; data: string | Uint8Array }
  | { id: number; ok: false; error: string; code?: string }

export class QueueFullError extends Error {}

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

  private worker: Worker
  private queue: Job[] = []
  private activeJob:
    | { id: number; timeout: NodeJS.Timeout; job: Job }
    | undefined
  private nextId = 1

  constructor() {
    this.worker = this.createWorker()
  }

  private createWorker() {
    // Default resolves the compiled worker next to this module. Overridable so
    // tests (where import.meta.dirname is src/, with no built .js) point at dist.
    const workerPath =
      process.env.CONVERTER_WORKER_PATH ??
      path.resolve(
        import.meta.dirname,
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
      if (this.worker === worker) this.handleWorkerMessage(message)
    })
    worker.on("error", (error) => {
      if (this.worker === worker) this.restartWorker(worker, error)
    })
    worker.on("exit", (code) => {
      if (this.worker === worker && code !== 0) {
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
    const { job } = this.activeJob
    this.activeJob = undefined

    if (message.ok) {
      job.resolve({
        mime: message.mime,
        data:
          typeof message.data === "string"
            ? message.data
            : Buffer.from(message.data),
      })
    } else if (message.code === "INVALID_MODEL_GEOMETRY") {
      // Corrupt client model, not a server fault — 422, not 500.
      job.reject(
        Errors.invalidParams(message.error.split("\n")[0] || message.error)
      )
    } else {
      job.reject(new Error(message.error))
    }

    this.processQueue()
  }

  private restartWorker(worker: Worker, error: Error) {
    if (this.worker !== worker) return

    if (this.activeJob) {
      clearTimeout(this.activeJob.timeout)
      this.activeJob.job.reject(error)
      this.activeJob = undefined
    }

    void worker.terminate().catch(() => undefined)
    this.worker = this.createWorker()
    this.processQueue()
  }

  private processQueue() {
    if (this.activeJob) return

    const job = this.queue.shift()
    if (!job) return

    const timeout = setTimeout(() => {
      this.restartWorker(this.worker, new Error("Conversion worker timed out"))
    }, this.conversionTimeoutMs)

    this.activeJob = { id: job.id, timeout, job }
    this.worker.postMessage({
      id: job.id,
      model: job.model,
      format: job.format,
      scale: job.scale,
    })
  }

  render = async (
    format: ConversionFormat,
    model: UMLModel,
    scale?: number
  ): Promise<ConversionOutput> => {
    if (this.queue.length >= this.maxQueueLength) {
      throw new QueueFullError("Conversion queue is full")
    }

    return await new Promise<ConversionOutput>((resolve, reject) => {
      this.queue.push({
        id: this.nextId++,
        format,
        model,
        resolve,
        reject,
        ...(scale !== undefined ? { scale } : {}),
      })
      this.processQueue()
    })
  }
}
