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

// Apollon positions node text with `dominant-baseline` (`middle` to centre,
// `hanging` for labels below a shape), which the browser honours but most
// non-browser renderers — Skia (@napi-rs/canvas), macOS Preview, Inkscape,
// PowerPoint, pdfmake — ignore, drawing every label at the alphabetic baseline
// (too high). We resolve it to an explicit `y` so every output places text like
// the editor. Offsets are the browser's baseline shift, measured against Inter.
const BASELINE_SHIFT_EM: Record<string, number> = {
  middle: 0.25,
  central: 0.35,
  hanging: 0.75,
}

// Skia also lays down ~20% less ink than the browser for the same Inter glyphs
// (no stem darkening), so rasterized PNG text looks lighter than the vector
// SVG/PDF. A hairline same-colour stroke calibrated against the browser
// (≈0.0156em) restores the expected weight at both 400 and 700.
const STEM_DARKEN_EM = 0.0156

const service = new ConversionService()
pdfMake.addVirtualFileSystem(pdfFonts)

type PrepareOptions = { width?: number; height?: number; stemDarken?: boolean }

/**
 * Rewrite the export SVG for portable rendering: resolve `dominant-baseline`
 * to an explicit baseline `y` (always), optionally resize the root to a target
 * raster resolution, and optionally stem-darken text (PNG only). Applied to
 * every served format so they all centre text like the editor.
 */
function prepareSvg(svg: string, options: PrepareOptions = {}): string {
  const { width, height, stemDarken } = options
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  if (width && height) {
    const root = doc.documentElement
    root.setAttribute("width", String(width))
    root.setAttribute("height", String(height))
  }

  doc.querySelectorAll("text").forEach((text) => {
    const textFontSize =
      parseFloat(text.getAttribute("font-size") ?? "16") || 16
    const tspans = Array.from(text.querySelectorAll("tspan"))

    const baseline = text.getAttribute("dominant-baseline")
    const shiftEm = baseline ? BASELINE_SHIFT_EM[baseline] : undefined
    if (shiftEm !== undefined) {
      const shift = (el: Element, fallbackY: number) => {
        const fontSize =
          parseFloat(el.getAttribute("font-size") ?? "") || textFontSize
        const y = parseFloat(el.getAttribute("y") ?? "") || fallbackY
        el.setAttribute("y", String(y + shiftEm * fontSize))
      }
      const textY = parseFloat(text.getAttribute("y") ?? "0") || 0
      if (tspans.length) tspans.forEach((tspan) => shift(tspan, textY))
      else shift(text, 0)
      text.removeAttribute("dominant-baseline")
    }

    const fill = text.getAttribute("fill") || "#000000"
    if (stemDarken && fill !== "none") {
      text.setAttribute("stroke", fill)
      text.setAttribute("paint-order", "stroke")
      text.setAttribute("stroke-linejoin", "round")
      text.setAttribute("stroke-width", String(STEM_DARKEN_EM * textFontSize))
      tspans.forEach((tspan) => {
        const fontSize = parseFloat(tspan.getAttribute("font-size") ?? "")
        if (fontSize)
          tspan.setAttribute("stroke-width", String(STEM_DARKEN_EM * fontSize))
      })
    }
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
    return { mime: "image/svg+xml", data: prepareSvg(svg) }
  }

  if (format === "png") {
    const factor = Number.isFinite(scale)
      ? Math.min(PNG_MAX_SCALE, Math.max(PNG_MIN_SCALE, scale as number))
      : PNG_DEFAULT_SCALE
    const width = Math.ceil(clip.width * factor)
    const height = Math.ceil(clip.height * factor)
    // Rasterize at the target resolution; upscaling a natural-size bitmap blurs text.
    const image = await loadImage(
      Buffer.from(prepareSvg(svg, { width, height, stemDarken: true }))
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
    content: [{ svg: prepareSvg(svg) }],
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
