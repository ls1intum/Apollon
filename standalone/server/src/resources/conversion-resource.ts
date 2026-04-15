import { spawn } from "node:child_process"
import { Request, Response } from "express"
import type { UMLModel } from "@tumaet/apollon"

type QueueEntry = {
  model: UMLModel
  resolve: (pdf: Buffer) => void
  reject: (error: Error) => void
}

export class ConversionResource {
  private readonly conversionTimeoutMs = Number(
    process.env.CONVERTER_TIMEOUT_MS ?? 30000
  )
  private readonly maxQueueLength = Number(
    process.env.CONVERTER_MAX_QUEUE_LENGTH ?? 20
  )
  private readonly workerMaxOldSpaceMb = Number(
    process.env.CONVERTER_WORKER_MAX_OLD_SPACE_MB ?? 256
  )

  private readonly queue: QueueEntry[] = []
  private processing = false

  private processQueue = async () => {
    if (this.processing) {
      return
    }

    const nextEntry = this.queue.shift()
    if (!nextEntry) {
      return
    }

    this.processing = true

    try {
      const pdf = await this.runWorker(nextEntry.model)
      nextEntry.resolve(pdf)
    } catch (error) {
      nextEntry.reject(error as Error)
    } finally {
      this.processing = false
      void this.processQueue()
    }
  }

  private runWorker = async (model: UMLModel): Promise<Buffer> => {
    const workerPath = require.resolve("../workers/pdf-conversion-worker")

    return await new Promise<Buffer>((resolve, reject) => {
      const worker = spawn(process.execPath, [workerPath], {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          NODE_OPTIONS: [
            process.env.NODE_OPTIONS,
            `--max-old-space-size=${this.workerMaxOldSpaceMb}`,
          ]
            .filter(Boolean)
            .join(" "),
        },
      })

      const stdoutChunks: Buffer[] = []
      const stderrChunks: Buffer[] = []
      let settled = false

      const finish = (callback: () => void) => {
        if (settled) {
          return
        }

        settled = true
        clearTimeout(timeout)
        callback()
      }

      const timeout = setTimeout(() => {
        worker.kill("SIGKILL")
        finish(() => reject(new Error("PDF conversion worker timed out")))
      }, this.conversionTimeoutMs)

      worker.stdout.on("data", (chunk: Buffer) => {
        stdoutChunks.push(chunk)
      })

      worker.stderr.on("data", (chunk: Buffer | string) => {
        stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })

      worker.on("error", (error) => {
        finish(() => reject(error))
      })

      worker.on("close", (code, signal) => {
        finish(() => {
          if (code === 0) {
            resolve(Buffer.concat(stdoutChunks))
            return
          }

          const errorOutput = Buffer.concat(stderrChunks)
            .toString("utf-8")
            .trim()
          reject(
            new Error(
              errorOutput ||
                `PDF conversion worker exited with code ${code ?? "unknown"} and signal ${signal ?? "none"}`
            )
          )
        })
      })

      worker.stdin.end(JSON.stringify(model))
    })
  }

  private renderPdf = async (model: UMLModel): Promise<Buffer> => {
    if (this.queue.length >= this.maxQueueLength) {
      throw new Error("PDF conversion queue is full")
    }

    return await new Promise<Buffer>((resolve, reject) => {
      this.queue.push({ model, resolve, reject })
      void this.processQueue()
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
