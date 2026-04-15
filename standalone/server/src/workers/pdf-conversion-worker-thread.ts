import { parentPort } from "node:worker_threads"
import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import type { UMLModel } from "@tumaet/apollon"
import { ConversionService } from "../services/conversion-service"

type WorkerRequest = {
  id: number
  model: UMLModel
}

type WorkerResponse =
  | {
      id: number
      ok: true
      pdf: Uint8Array
    }
  | {
      id: number
      ok: false
      error: string
    }

async function renderPdf(model: UMLModel): Promise<Buffer> {
  const conversionService = new ConversionService()
  const { svg, clip } = await conversionService.convertToSvg(model)
  const { width, height } = clip

  pdfMake.vfs = pdfFonts.vfs

  const doc = pdfMake.createPdf({
    content: [
      {
        svg,
      },
    ],
    pageSize: { width, height },
    pageMargins: 0,
  })

  return await new Promise<Buffer>((resolve, reject) => {
    void (doc as any).getStream().then((stream: NodeJS.ReadableStream) => {
      const chunks: Buffer[] = []

      stream.on("data", (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })

      stream.on("end", () => {
        resolve(Buffer.concat(chunks))
      })

      stream.on("error", reject)
      stream.resume()
      ;(stream as { end?: () => void }).end?.()
    }, reject)
  })
}

parentPort?.on("message", async (message: WorkerRequest) => {
  let response: WorkerResponse

  try {
    const pdf = await renderPdf(message.model)
    response = {
      id: message.id,
      ok: true,
      pdf: new Uint8Array(pdf),
    }
  } catch (error) {
    response = {
      id: message.id,
      ok: false,
      error:
        error instanceof Error ? error.stack || error.message : String(error),
    }
  }

  parentPort?.postMessage(response)
})
