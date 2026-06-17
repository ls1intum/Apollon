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

// Skia also lays down ~20% less ink than the browser for the same Inter glyphs
// (no stem darkening), so PNG text looks lighter than the SVG/PDF. A hairline
// same-colour stroke calibrated against the browser (≈0.0156em) restores the
// expected weight at both 400 and 700.
const STEM_DARKEN_EM = 0.0156

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
    const textFontSize =
      parseFloat(text.getAttribute("font-size") ?? "16") || 16
    const tspans = Array.from(text.querySelectorAll("tspan"))

    // Resolve dominant-baseline="middle" to an explicit baseline `y`.
    const baseline = text.getAttribute("dominant-baseline")
    if (baseline === "middle" || baseline === "central") {
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
    }

    // Stem-darken: a hairline stroke in the fill colour restores browser weight.
    const fill = text.getAttribute("fill") || "#000000"
    if (fill !== "none") {
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
    return { mime: "image/svg+xml", data: svg }
  }

  if (format === "png") {
    const factor = Number.isFinite(scale)
      ? Math.min(PNG_MAX_SCALE, Math.max(PNG_MIN_SCALE, scale as number))
      : PNG_DEFAULT_SCALE
    const width = Math.ceil(clip.width * factor)
    const height = Math.ceil(clip.height * factor)
    // Rasterize at the target resolution; upscaling a natural-size bitmap blurs text.
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
