/**
 * Render an Apollon compat-mode SVG to a vector PDF with svg2pdf.js on jsPDF.
 *
 * Replaces the old client path that rasterised the SVG onto a `<canvas>` and
 * embedded a PNG — that inherited the canvas area cap (#667) and produced a
 * blurry, oversized file. Vector output stays sharp at any zoom and is small.
 *
 * jspdf and svg2pdf.js are `optionalDependencies`, lazily `import()`-ed so they
 * stay out of the editor bundle.
 */
import type { jsPDF } from "jspdf"
import interBoldUrl from "@/assets/fonts/Inter-Bold.ttf?url"
import interRegularUrl from "@/assets/fonts/Inter-Regular.ttf?url"
import interItalicUrl from "@/assets/fonts/Inter-Italic.ttf?url"
import interBoldItalicUrl from "@/assets/fonts/Inter-BoldItalic.ttf?url"
import { preProcessSvgForPdf } from "./preProcessSvgForPdf"

/** svg2pdf.js / PDF-1.x MediaBox ceiling in points (yWorks/svg2pdf.js#213). */
const PDF_MAX_DIMENSION_PT = 14_400

export type SvgToPdfOptions = {
  /** Document title metadata; does not affect layout. */
  title?: string
  /**
   * Inter faces as ttf/otf bytes, for hosts without `fetch` of the bundled
   * `?url` font asset (e.g. tests, headless Node). Defaults to the bundled
   * Inter. `italic`/`boldItalic` are optional — omit them and abstract text
   * simply won't render slanted in that host.
   */
  fonts?: {
    regular: Uint8Array
    bold: Uint8Array
    italic?: Uint8Array
    boldItalic?: Uint8Array
  }
}

type FontSet = {
  regular: string
  bold: string
  italic?: string
  boldItalic?: string
}

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

let cachedFontBase64: Promise<FontSet> | null = null

async function fontBase64(
  injected?: SvgToPdfOptions["fonts"]
): Promise<FontSet> {
  if (injected) {
    return {
      regular: toBase64(injected.regular),
      bold: toBase64(injected.bold),
      italic: injected.italic && toBase64(injected.italic),
      boldItalic: injected.boldItalic && toBase64(injected.boldItalic),
    }
  }
  if (!cachedFontBase64) {
    cachedFontBase64 = (async () => {
      const [regular, bold, italic, boldItalic] = await Promise.all(
        [interRegularUrl, interBoldUrl, interItalicUrl, interBoldItalicUrl].map(
          async (url) => {
            const res = await fetch(url)
            if (!res.ok)
              throw new Error(`Failed to load font ${url}: ${res.status}`)
            return toBase64(new Uint8Array(await res.arrayBuffer()))
          }
        )
      )
      return { regular, bold, italic, boldItalic }
    })()
  }
  return cachedFontBase64
}

/**
 * Register Inter with jsPDF before svg2pdf walks the SVG. svg2pdf looks up
 * `(family, weight)` in jsPDF's registry and silently falls back to a standard
 * font (dropping glyphs / mismatching widths) for any combination it can't
 * find — which is how stereotype labels and headers used to vanish. We ship
 * Regular + Bold (matching the server) and register the weights Apollon emits;
 * jsPDF folds them into one key per face: 400→"normal", 700→"bold",
 * 600→"600normal" (600 aliases onto Bold). Italic faces back the abstract
 * notation and are registered under style "italic" so svg2pdf resolves a
 * `font-style="italic"` `<text>` to the real slanted face.
 */
async function registerInter(
  pdf: jsPDF,
  fonts?: SvgToPdfOptions["fonts"]
): Promise<void> {
  const { regular, bold, italic, boldItalic } = await fontBase64(fonts)
  pdf.addFileToVFS("Inter-Regular.ttf", regular)
  pdf.addFileToVFS("Inter-Bold.ttf", bold)
  pdf.addFont("Inter-Regular.ttf", "Inter", "normal", "400")
  pdf.addFont("Inter-Bold.ttf", "Inter", "normal", "600")
  pdf.addFont("Inter-Bold.ttf", "Inter", "normal", "700")
  if (italic) {
    pdf.addFileToVFS("Inter-Italic.ttf", italic)
    pdf.addFont("Inter-Italic.ttf", "Inter", "italic", "400")
  }
  if (boldItalic) {
    pdf.addFileToVFS("Inter-BoldItalic.ttf", boldItalic)
    pdf.addFont("Inter-BoldItalic.ttf", "Inter", "italic", "600")
    pdf.addFont("Inter-BoldItalic.ttf", "Inter", "italic", "700")
  }
}

export async function svgToPdf(
  svg: string,
  clip: { width: number; height: number },
  opts: SvgToPdfOptions = {}
): Promise<Blob> {
  const { width: srcWidth, height: srcHeight } = clip
  if (srcWidth <= 0 || srcHeight <= 0) {
    throw new Error(
      `Diagram has zero or negative dimensions (${srcWidth}x${srcHeight}).`
    )
  }

  // Scale the page down (aspect preserved) so neither side exceeds the MediaBox
  // ceiling; output stays vector, so viewers zoom with no quality loss.
  const pageScale = Math.min(
    1,
    PDF_MAX_DIMENSION_PT / srcWidth,
    PDF_MAX_DIMENSION_PT / srcHeight
  )
  const pageWidth = srcWidth * pageScale
  const pageHeight = srcHeight * pageScale

  const [{ jsPDF }, { svg2pdf }] = await Promise.all([
    import("jspdf"),
    import("svg2pdf.js"),
  ])

  const pdf = new jsPDF({
    orientation: pageWidth > pageHeight ? "l" : "p",
    unit: "pt",
    format: [pageWidth, pageHeight],
    compress: true,
  })
  if (opts.title) pdf.setProperties({ title: opts.title })
  await registerInter(pdf, opts.fonts)

  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Failed to parse exported SVG for PDF rendering.")
  }
  preProcessSvgForPdf(doc.documentElement)

  await svg2pdf(doc.documentElement as unknown as SVGElement, pdf, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  })

  return pdf.output("blob")
}
