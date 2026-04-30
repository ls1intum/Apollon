import { useEditorContext } from "@/contexts"
import { log } from "@/logger"
import { useFileDownload } from "./useFileDownload"
import { renderSvgToSlide, slideSizeFromClip } from "@/utils/svgToPptx"

/**
 * Export the current diagram as a PPTX where every shape, line, and text label
 * is its own animatable PowerPoint object.
 *
 * Flow:
 *  1. Reuse the existing compat-mode SVG export (CSS-vars resolved, arrowheads
 *     inlined, markers stripped).
 *  2. Lazy-load `pptxgenjs` so users who never export PPTX pay no bundle cost.
 *  3. Match the slide canvas exactly to the diagram clip — no scaling, no
 *     letterboxing.
 *  4. Walk the SVG tree and emit one `<p:sp>` per visible element via
 *     `renderSvgToSlide`.
 */
export const useExportAsPPTX = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  const exportAsPPTX = async () => {
    if (!editor) {
      log.error("Editor context is not available")
      return
    }

    const apollonSVG = await editor.exportAsSVG({ svgMode: "compat" })
    if (!apollonSVG) {
      log.error("Failed to export SVG for PPTX conversion")
      return
    }

    const PptxGenJS = (await import("pptxgenjs")).default
    const pres = new PptxGenJS()
    pres.title =
      editor.getDiagramMetadata().diagramTitle ||
      editor.model.title ||
      "Apollon Diagram"
    pres.author = "Apollon"

    const layoutSize = slideSizeFromClip(apollonSVG.clip)
    pres.defineLayout({
      name: "APOLLON_DIAGRAM",
      width: Math.max(layoutSize.width, 1),
      height: Math.max(layoutSize.height, 1),
    })
    pres.layout = "APOLLON_DIAGRAM"

    const slide = pres.addSlide()
    renderSvgToSlide(apollonSVG.svg, apollonSVG.clip, pres, slide, {
      background: "FFFFFF",
    })

    const fileName = `${editor.model.title || "diagram"}.pptx`
    const blob = (await pres.write({ outputType: "blob" })) as Blob
    const file = new File([blob], fileName, {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    })
    downloadFile({ file, fileName })
  }

  return exportAsPPTX
}
