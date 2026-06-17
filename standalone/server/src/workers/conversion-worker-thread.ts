// Side-effect import: installs jsdom + Inter font registration + browser-API
// shims before anything touches `window`/`document` or the apollon library.
// Runs in its own thread so those globals never leak into the main process.
import "./jsdom-shims.js"
import { parentPort } from "node:worker_threads"
import pdfMake from "pdfmake/build/pdfmake.js"
import pdfFonts from "pdfmake/build/vfs_fonts.js"
import { Canvas, loadImage } from "canvas"
import type { UMLModel } from "@tumaet/apollon"
import { ConversionService } from "../services/conversion-service.js"

export type ConversionFormat = "svg" | "png" | "pdf"

type WorkerRequest = {
  id: number
  model: UMLModel
  format: ConversionFormat
  scale?: number
}

type WorkerResponse =
  | { id: number; ok: true; mime: string; data: string | Uint8Array }
  | { id: number; ok: false; error: string; code?: string }

const PNG_MIN_SCALE = 1
const PNG_MAX_SCALE = 4
const PNG_DEFAULT_SCALE = 2

const service = new ConversionService()
pdfMake.addVirtualFileSystem(pdfFonts)

async function render(
  format: ConversionFormat,
  model: UMLModel,
  scale?: number
): Promise<{ mime: string; data: string | Uint8Array }> {
  const { svg, clip } = await service.convertToSvg(model)

  if (format === "svg") {
    return { mime: "image/svg+xml", data: svg }
  }

  if (format === "png") {
    const factor = Number.isFinite(scale)
      ? Math.min(PNG_MAX_SCALE, Math.max(PNG_MIN_SCALE, scale as number))
      : PNG_DEFAULT_SCALE
    const image = await loadImage(Buffer.from(svg))
    const canvas = new Canvas(
      Math.ceil(clip.width * factor),
      Math.ceil(clip.height * factor)
    )
    const ctx = canvas.getContext("2d")
    // The SVG is transparent; flatten onto white so the PNG isn't see-through
    // (transparency reads as black in most viewers).
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return { mime: "image/png", data: canvas.toBuffer("image/png") }
  }

  const doc = pdfMake.createPdf({
    content: [{ svg }],
    pageSize: { width: clip.width, height: clip.height },
    pageMargins: 0,
  })
  return {
    mime: "application/pdf",
    data: new Uint8Array(await doc.getBuffer()),
  }
}

parentPort?.on("message", async (message: WorkerRequest) => {
  let response: WorkerResponse
  try {
    const { mime, data } = await render(
      message.format,
      message.model,
      message.scale
    )
    response = { id: message.id, ok: true, mime, data }
  } catch (error) {
    const code = (error as { code?: string })?.code
    response = {
      id: message.id,
      ok: false,
      error:
        error instanceof Error ? error.stack || error.message : String(error),
      ...(code ? { code } : {}),
    }
  }
  parentPort?.postMessage(response)
})
