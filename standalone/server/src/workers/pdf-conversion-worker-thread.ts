// Side-effect import: installs jsdom + browser-API shims before any code
// that touches `window`, `document`, or the apollon library.
import "./jsdom-shims.js"
import { parentPort } from "node:worker_threads"
import pdfMake from "pdfmake/build/pdfmake.js"
import pdfFonts from "pdfmake/build/vfs_fonts.js"
import type { UMLModel } from "@tumaet/apollon"
import { ConversionService } from "../services/conversion-service.js"

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
    content: [{ svg }],
    pageSize: { width, height },
    pageMargins: 0,
  })

  // getBuffer materialises the entire PDF in one callback — semantically
  // equivalent to consuming the stream end-to-end, but with no manual chunk
  // accumulation and no need to `any`-cast a getStream() Promise (the
  // @types/pdfmake declaration disagrees with runtime). PDFs from a single
  // diagram are bounded by MAX_SNAPSHOT_BYTES; no streaming pressure.
  return await new Promise<Buffer>((resolve, reject) => {
    try {
      doc.getBuffer((buffer) => resolve(buffer))
    } catch (err) {
      reject(err as Error)
    }
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
