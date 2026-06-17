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

// Skia (the SVG rasterizer behind @napi-rs/canvas) ignores `dominant-baseline`
// and draws text at the alphabetic baseline, so `middle`-aligned labels sit too
// high. The browser/pdf place `middle` ~0.25em below the alphabetic baseline;
// bake that shift in for the PNG so it matches the SVG/PDF.
const MIDDLE_BASELINE_EM = 0.25

const service = new ConversionService()
pdfMake.addVirtualFileSystem(pdfFonts)

/**
 * Produce a PNG-only copy of the export SVG: sized to the target resolution and
 * with `dominant-baseline="middle"` resolved to an explicit baseline `y`, since
 * the Skia rasterizer honours neither the SVG's intrinsic scaling nor that
 * attribute. The original SVG (served as-is, and fed to pdfmake) is untouched.
 */
function prepareSvgForPng(svg: string, width: number, height: number): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  const root = doc.documentElement
  root.setAttribute("width", String(width))
  root.setAttribute("height", String(height))

  doc.querySelectorAll("text").forEach((text) => {
    const baseline = text.getAttribute("dominant-baseline")
    if (baseline !== "middle" && baseline !== "central") return

    const textFontSize =
      parseFloat(text.getAttribute("font-size") ?? "16") || 16
    const tspans = text.querySelectorAll("tspan")
    const shift = (el: Element, fallbackY: number) => {
      const fontSize =
        parseFloat(el.getAttribute("font-size") ?? "") || textFontSize
      const y = parseFloat(el.getAttribute("y") ?? "") || fallbackY
      el.setAttribute("y", String(y + MIDDLE_BASELINE_EM * fontSize))
    }

    const textY = parseFloat(text.getAttribute("y") ?? "0") || 0
    if (tspans.length) tspans.forEach((tspan) => shift(tspan, textY))
    else shift(text, 0)
    text.removeAttribute("dominant-baseline")
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
    // Size the SVG to the target resolution (rendering at natural size and
    // upscaling the bitmap blurs text) and resolve dominant-baseline.
    const image = await loadImage(
      Buffer.from(prepareSvgForPng(svg, width, height))
    )
    const canvas = new Canvas(width, height)
    const ctx = canvas.getContext("2d")
    // The SVG is transparent; flatten onto white so the PNG isn't see-through
    // (transparency reads as black in most viewers).
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
