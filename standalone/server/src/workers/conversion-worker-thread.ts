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

// Skia (the SVG rasterizer behind @napi-rs/canvas) lays down ~20% less ink than
// a browser for the same Inter glyphs — it does no stem darkening — so PNG text
// reads thinner than the editor/SVG. A hairline same-colour stroke calibrated
// against the browser (≈0.0156em) restores the weight at both 400 and 700. This
// is a raster-only concern; the vector SVG/PDF are served unchanged.
const STEM_DARKEN_EM = 0.0156

// The library's compat export is already portable (CSS variables, relative units
// and dominant-baseline all resolved). For PNG the raster needs the target pixel
// size (upscaling a natural-size bitmap blurs text) and the stem-darkening above.
function prepareForPng(svg: string, width: number, height: number): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  doc.documentElement.setAttribute("width", String(width))
  doc.documentElement.setAttribute("height", String(height))

  doc.querySelectorAll("text").forEach((text) => {
    const fill = text.getAttribute("fill") || "#000000"
    if (fill === "none") return
    const fontSize = parseFloat(text.getAttribute("font-size") ?? "16") || 16
    text.setAttribute("stroke", fill)
    text.setAttribute("paint-order", "stroke")
    text.setAttribute("stroke-linejoin", "round")
    text.setAttribute("stroke-width", String(STEM_DARKEN_EM * fontSize))
    text.querySelectorAll("tspan").forEach((tspan) => {
      const tspanSize = parseFloat(tspan.getAttribute("font-size") ?? "")
      if (tspanSize)
        tspan.setAttribute("stroke-width", String(STEM_DARKEN_EM * tspanSize))
    })
  })

  return new XMLSerializer().serializeToString(doc)
}

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
    const width = Math.ceil(clip.width * factor)
    const height = Math.ceil(clip.height * factor)
    const image = await loadImage(
      Buffer.from(prepareForPng(svg, width, height))
    )
    const canvas = new Canvas(width, height)
    const ctx = canvas.getContext("2d")
    // Flatten onto white — a transparent PNG reads as black in most viewers.
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0, width, height)
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
