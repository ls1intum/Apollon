import { Request, Response } from "express"
import { Worker } from "node:worker_threads"
import path from "node:path"
import type { UMLModel } from "@tumaet/apollon"

type QueueEntry = {
  id: number
  model: UMLModel
  resolve: (pdf: Buffer) => void
  reject: (error: Error) => void
}

type WorkerSuccess = {
  id: number
  ok: true
  pdf: Uint8Array
}

type WorkerFailure = {
  id: number
  ok: false
  error: string
}

type WorkerMessage = WorkerSuccess | WorkerFailure

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
  private queue: QueueEntry[] = []
  private activeJob:
    | {
        id: number
        timeout: NodeJS.Timeout
        resolve: (pdf: Buffer) => void
        reject: (error: Error) => void
      }
    | undefined
  private nextId = 1

  constructor() {
    this.worker = this.createWorker()
  }

  private createWorker() {
    const workerPath = path.resolve(
      __dirname,
      "../workers/pdf-conversion-worker-thread.js"
    )

    const worker = new Worker(workerPath, {
      env: {
        ...process.env,
      },
      resourceLimits: {
        maxOldGenerationSizeMb: this.workerMaxOldGenerationMb,
        stackSizeMb: this.workerStackMb,
      },
    })

    worker.on("message", (message: WorkerMessage) => {
      this.handleWorkerMessage(message)
    })

    worker.on("error", (error) => {
      this.restartWorker(error)
    })

    worker.on("exit", (code) => {
      if (code !== 0) {
        this.restartWorker(
          new Error(`PDF worker thread exited with code ${code}`)
        )
      }
    })

    return worker
  }

  private handleWorkerMessage(message: WorkerMessage) {
    if (!this.activeJob || this.activeJob.id !== message.id) {
      return
    }

    clearTimeout(this.activeJob.timeout)
    const activeJob = this.activeJob
    this.activeJob = undefined

    if (message.ok) {
      activeJob.resolve(Buffer.from(message.pdf))
    } else {
      activeJob.reject(new Error(message.error))
    }

    this.processQueue()
  }

  private restartWorker(error: Error) {
    if (this.activeJob) {
      clearTimeout(this.activeJob.timeout)
      const activeJob = this.activeJob
      this.activeJob = undefined
      activeJob.reject(error)
    }

    void this.worker.terminate()
    this.worker = this.createWorker()
    this.processQueue()
  }

  private processQueue() {
    if (this.activeJob) {
      return
    }

    const nextEntry = this.queue.shift()
    if (!nextEntry) {
      return
    }

    const timeout = setTimeout(() => {
      this.restartWorker(new Error("PDF conversion worker timed out"))
    }, this.conversionTimeoutMs)

    this.activeJob = {
      id: nextEntry.id,
      timeout,
      resolve: nextEntry.resolve,
      reject: nextEntry.reject,
    }

    this.worker.postMessage({
      id: nextEntry.id,
      model: nextEntry.model,
    })
  }

  private renderPdf = async (model: UMLModel): Promise<Buffer> => {
    if (this.queue.length >= this.maxQueueLength) {
      throw new Error("PDF conversion queue is full")
    }

    return await new Promise<Buffer>((resolve, reject) => {
      this.queue.push({
        id: this.nextId++,
        model,
        resolve,
        reject,
      })
      this.processQueue()
    })
  }

  convert = async (req: Request, res: Response) => {
    let model: UMLModel | undefined

    if (req.body) {
      try {
        model = req.body.model ? req.body.model : req.body
        if (typeof model === "string") {
          model = JSON.parse(model)
        }

        const pdfBuffer = await this.renderPdf(model as UMLModel)
        res.type("application/pdf")
        res.status(200).send(pdfBuffer)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        if (message === "PDF conversion queue is full") {
          res.status(503).send({ error: message })
          return
        }

        throw error
      }
    } else {
      res.status(400).send({ error: "Model must be defined!" })
    }
  }

  status = (_req: Request, res: Response) => {
    res.sendStatus(200)
  }
}
