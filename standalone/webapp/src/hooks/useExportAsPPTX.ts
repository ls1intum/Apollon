import { useEditorContext } from "@/contexts"
import { log } from "@/logger"
import { useFileDownload } from "./useFileDownload"
import { computeSlideViewport, renderSvgToSlide } from "@/utils/svgToPptx"
import {
  PptxExportSettings,
  SLIDE_DIMENSIONS_IN,
} from "@/lib/pptxExportSettings"

/**
 * Trigger a PPTX export. The hook itself takes no parameters; the returned
 * function accepts the user-chosen settings (filename, slide size, font,
 * background) at call time. Smart defaults are applied for any setting the
 * caller omits — useful for programmatic exports that bypass the dialog.
 */
export const useExportAsPPTX = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  const exportAsPPTX = async (
    settings: Partial<PptxExportSettings> = {}
  ) => {
    if (!editor) {
      log.error("Editor context is not available")
      return
    }

    const apollonSVG = await editor.exportAsSVG({ svgMode: "compat" })
    if (!apollonSVG) {
      log.error("Failed to export SVG for PPTX conversion")
      return
    }

    const slideSize = settings.slideSize ?? "fit"
    const diagramFit = settings.diagramFit ?? "shrink"
    const fontFace = settings.fontFace ?? "auto"
    const background = settings.background ?? "white"
    const fileName =
      (settings.fileName?.trim() || editor.model.title || "diagram") + ".pptx"

    const slideCanvas =
      slideSize === "fit" ? undefined : SLIDE_DIMENSIONS_IN[slideSize]
    const viewport = computeSlideViewport(
      apollonSVG.clip,
      slideCanvas,
      diagramFit
    )

    const PptxGenJS = (await import("pptxgenjs")).default
    const pres = new PptxGenJS()
    pres.title =
      editor.getDiagramMetadata().diagramTitle ||
      editor.model.title ||
      "Apollon Diagram"
    pres.author = "Apollon"

    pres.defineLayout({
      name: "APOLLON_DIAGRAM",
      width: viewport.slideWidth,
      height: viewport.slideHeight,
    })
    pres.layout = "APOLLON_DIAGRAM"

    const slide = pres.addSlide()
    renderSvgToSlide(apollonSVG.svg, apollonSVG.clip, pres, slide, {
      background: background === "white" ? "FFFFFF" : null,
      fontFace: fontFace === "auto" ? undefined : fontFace,
      viewport,
    })

    const blob = (await pres.write({ outputType: "blob" })) as Blob
    const file = new File([blob], fileName, {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    })
    downloadFile({ file, fileName })
  }

  return exportAsPPTX
}
