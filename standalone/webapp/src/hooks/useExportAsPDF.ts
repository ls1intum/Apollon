import { useEditorContext } from "@/contexts"
import { preProcessSvgForPdf } from "@/utils/preProcessSvgForPdf"
import { registerInterFonts } from "@/utils/registerInterFonts"
import { useFileDownload } from "./useFileDownload"

/**
 * Trigger a PDF export. Apollon's compat-mode SVG is rendered straight to a
 * vector PDF via svg2pdf.js (yWorks) on top of jsPDF. Vector PDF eliminates
 * the canvas-size cap that broke raster-PDF on complex diagrams (issue #667),
 * produces a smaller file, and stays sharp at any zoom.
 *
 * `jspdf` and `svg2pdf.js` are lazy-loaded — neither is needed until the user
 * clicks Export → PDF, mirroring the PPTX hook's lazy `pptxgenjs` import.
 *
 * For very large diagrams we clamp the PDF MediaBox to 14,400 pt (200") per
 * side: svg2pdf.js refuses bigger pages (yWorks/svg2pdf.js#213) and PDF 1.x
 * historically tops out there. The diagram is *logically* scaled into the
 * smaller MediaBox; output is still vector so viewers zoom freely with no
 * quality loss.
 *
 * Errors are propagated so `NavbarFile` can render a toast.
 */

/** svg2pdf.js MediaBox ceiling (yWorks/svg2pdf.js#213). */
const PDF_MAX_DIMENSION_PT = 14_400

function parseSvgOrThrow(svg: string): SVGElement {
  // DOMParser does not throw on malformed XML — it returns a document whose
  // root is `<parsererror>`. Detect that explicitly so callers see a real
  // error instead of svg2pdf silently emitting garbage.
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Failed to parse exported SVG for PDF rendering.")
  }
  return doc.documentElement as unknown as SVGElement
}

export const useExportAsPDF = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  const exportAsPDF = async (): Promise<void> => {
    if (!editor) {
      throw new Error("Editor context is not available")
    }

    const { svg, clip } = await editor.exportAsSVG({ svgMode: "compat" })
    const { width: srcWidth, height: srcHeight } = clip

    if (srcWidth <= 0 || srcHeight <= 0) {
      throw new Error(
        `Diagram has zero or negative dimensions (${srcWidth}x${srcHeight}).`
      )
    }

    // Scale the PDF page down (preserving aspect ratio) so neither side
    // exceeds the svg2pdf.js / PDF 1.x MediaBox limit.
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

    // Register Inter with jsPDF *before* svg2pdf walks the SVG. Without this
    // svg2pdf falls back to the built-in Helvetica which only has 400/700
    // weights — and silently drops every <text> at weights 500/600 and the
    // «Stereotype» tspans. See utils/registerInterFonts.ts for the full
    // rationale.
    await registerInterFonts(pdf)

    const svgEl = parseSvgOrThrow(svg)
    preProcessSvgForPdf(svgEl)
    await svg2pdf(svgEl, pdf, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    })

    const fileName =
      (editor.getDiagramMetadata().diagramTitle ||
        editor.model.title ||
        "diagram") + ".pdf"
    const blob = pdf.output("blob")
    downloadFile({
      file: new File([blob], fileName, { type: "application/pdf" }),
      fileName,
    })
  }

  return exportAsPDF
}
