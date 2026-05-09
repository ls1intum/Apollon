/**
 * Pure render functions used by the server-side conversion worker.
 * Extracted from the worker thread so they can be unit-tested directly
 * without spawning a `worker_threads` process.
 *
 *   - `renderPdf`  → Artemis exam-integrity flow (`/api/converter/pdf`).
 *   - `renderSvgSafe` → embed surface (`/api/diagrams/:id/preview.svg`,
 *     `/embed/:id`). Returns DOMPurify-sanitized SVG.
 *
 * Output of `renderPdf` mirrors the client (`useExportAsPDF`) byte-for-
 * byte modulo PDF random-id fields. Output of `renderSvgSafe` mirrors
 * what the editor would have produced in the browser, modulo
 * defence-in-depth sanitization.
 *
 * PNG is rendered client-side only (resvg-wasm in a Web Worker); the
 * server intentionally exposes only PDF + SVG because exam-integrity
 * submissions are archived as PDF and embeds inline as SVG.
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { jsPDF } from "jspdf"
import { svg2pdf } from "svg2pdf.js"
import type { UMLModel, SVG } from "@tumaet/apollon"
import { convertModelToSvg, sanitizeSvg } from "./conversion-service"
import { preProcessSvgForPdf } from "./preProcessSvgForPdf"

/** svg2pdf.js MediaBox ceiling — matches the client `useExportAsPDF.ts`. */
const PDF_MAX_DIMENSION_PT = 14_400

const FONTS_DIR = path.join(__dirname, "..", "workers", "fonts")
const INTER_REGULAR = path.join(FONTS_DIR, "Inter-Regular.ttf")
const INTER_BOLD = path.join(FONTS_DIR, "Inter-Bold.ttf")
const INTER_ITALIC = path.join(FONTS_DIR, "Inter-Italic.ttf")
const INTER_BOLD_ITALIC = path.join(FONTS_DIR, "Inter-BoldItalic.ttf")

/**
 * Loaded once on first PDF render and reused across the worker's lifetime.
 * Reading the four TTFs synchronously inside `addFileToVFS` would otherwise
 * happen per-render.
 */
let cachedPdfFontBase64: {
  regular: string
  bold: string
  italic: string
  boldItalic: string
} | null = null
function pdfFontBase64() {
  if (cachedPdfFontBase64) return cachedPdfFontBase64
  for (const file of [
    INTER_REGULAR,
    INTER_BOLD,
    INTER_ITALIC,
    INTER_BOLD_ITALIC,
  ]) {
    if (!fs.existsSync(file)) {
      throw new Error(
        `Bundled font missing: ${file}. Build step did not copy fonts.`
      )
    }
  }
  cachedPdfFontBase64 = {
    regular: fs.readFileSync(INTER_REGULAR).toString("base64"),
    bold: fs.readFileSync(INTER_BOLD).toString("base64"),
    italic: fs.readFileSync(INTER_ITALIC).toString("base64"),
    boldItalic: fs.readFileSync(INTER_BOLD_ITALIC).toString("base64"),
  }
  return cachedPdfFontBase64
}

/**
 * Register the Inter family with a jsPDF instance. Mirrors the client's
 * `registerInterFonts` exactly — same vfs names, same style+weight aliases.
 * Required for svg2pdf.js to render every weight Apollon's compat-mode SVG
 * emits (400, 600, 700 × normal/italic). Without this, svg2pdf falls back
 * to Helvetica and silently drops the <text> elements at unsupported
 * weights — exactly how stereotype labels disappeared before this fix.
 */
function registerInterFontsServer(pdf: jsPDF): void {
  const fonts = pdfFontBase64()
  pdf.addFileToVFS("Inter-Regular.ttf", fonts.regular)
  pdf.addFont("Inter-Regular.ttf", "Inter", "normal", "400")
  pdf.addFont("Inter-Regular.ttf", "Inter", "normal", "normal")

  pdf.addFileToVFS("Inter-Bold.ttf", fonts.bold)
  pdf.addFont("Inter-Bold.ttf", "Inter", "normal", "600")
  pdf.addFont("Inter-Bold.ttf", "Inter", "normal", "700")
  pdf.addFont("Inter-Bold.ttf", "Inter", "normal", "bold")

  pdf.addFileToVFS("Inter-Italic.ttf", fonts.italic)
  pdf.addFont("Inter-Italic.ttf", "Inter", "italic", "400")
  pdf.addFont("Inter-Italic.ttf", "Inter", "italic", "normal")

  pdf.addFileToVFS("Inter-BoldItalic.ttf", fonts.boldItalic)
  pdf.addFont("Inter-BoldItalic.ttf", "Inter", "italic", "600")
  pdf.addFont("Inter-BoldItalic.ttf", "Inter", "italic", "700")
  pdf.addFont("Inter-BoldItalic.ttf", "Inter", "italic", "bold")
}

export async function renderPdf(model: UMLModel): Promise<Uint8Array> {
  const { svg, clip } = await convertModelToSvg(model)
  const { width: srcWidth, height: srcHeight } = clip

  if (srcWidth <= 0 || srcHeight <= 0) {
    throw new Error(
      `Diagram has zero or negative dimensions (${srcWidth}x${srcHeight}).`
    )
  }

  // Clamp the page so neither side exceeds svg2pdf.js's MediaBox ceiling.
  const pageScale = Math.min(
    1,
    PDF_MAX_DIMENSION_PT / srcWidth,
    PDF_MAX_DIMENSION_PT / srcHeight
  )
  const pageWidth = srcWidth * pageScale
  const pageHeight = srcHeight * pageScale

  const pdf = new jsPDF({
    orientation: pageWidth > pageHeight ? "l" : "p",
    unit: "pt",
    format: [pageWidth, pageHeight],
    compress: true,
  })
  registerInterFontsServer(pdf)

  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Failed to parse exported SVG for PDF rendering.")
  }

  // Resolve `font-size="85%"` → absolute px so svg2pdf doesn't drop tspans,
  // flatten nested <svg> wrappers + multi-tspan texts, and collapse the
  // Inter font-family chain so jsPDF's getTextWidth uses the embedded TTF.
  // Together these are the difference between «Interface»/«Abstract»/
  // «Enumeration» stereotypes appearing or being silently dropped.
  preProcessSvgForPdf(doc.documentElement)

  await svg2pdf(doc.documentElement as unknown as SVGElement, pdf, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  })

  const buffer = pdf.output("arraybuffer") as ArrayBuffer
  return new Uint8Array(buffer)
}

/**
 * Renders the diagram model and returns a DOMPurify-sanitised SVG string
 * + clip box. Used by the embed routes — the SVG is inlined into a
 * `<svg>` in the embed HTML page where script execution would be live,
 * so sanitisation runs on every render.
 *
 * `preProcessSvgForPdf` is deliberately NOT applied here. Its transforms
 * (collapsing CSS font-stacks, splitting tspans, replacing nested
 * `<svg>` with `<g>`) are svg2pdf.js workarounds; browsers handle the
 * library output natively and applying the transform would degrade
 * rendering (e.g. kill the Inter → system-ui fallback chain).
 */
export async function renderSvgSafe(model: UMLModel): Promise<SVG> {
  const { svg, clip } = await convertModelToSvg(model)
  return { svg: sanitizeSvg(svg), clip }
}
