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

async function renderPdf(model: UMLModel): Promise<Uint8Array> {
  const conversionService = new ConversionService()
  const { svg, clip } = await conversionService.convertToSvg(model)
  const { width, height } = clip

  // pdfmake 0.3.x registers fonts via addVirtualFileSystem(). The 0.2.x
  // `pdfMake.vfs = ...` assignment is a silent no-op, leaving every Roboto
  // face unregistered so svg-to-pdfkit fails as soon as the SVG needs one.
  // The 0.3.x vfs_fonts default export is the vfs map itself (no `.vfs`).
  pdfMake.addVirtualFileSystem(pdfFonts)

  const doc = pdfMake.createPdf({
    content: [{ svg }],
    pageSize: { width, height },
    pageMargins: 0,
  })

  // pdfmake 0.3.x dropped the getBuffer(callback) overload (the missing
  // callback was this worker's other 0.2.x bug) for a Promise that resolves
  // to a browserified Uint8Array, not a Node Buffer — hence the return type.
  return await doc.getBuffer()
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
