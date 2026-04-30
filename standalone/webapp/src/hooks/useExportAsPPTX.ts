import { useEditorContext } from "@/contexts"
import {
  PptxExportSettings,
  SLIDE_DIMENSIONS_IN,
} from "@/lib/pptxExportSettings"
import { computeSlideViewport, renderSvgToSlide } from "@/utils/svgToPptx"
import { useFileDownload } from "./useFileDownload"

/**
 * Trigger a PPTX export. The returned function accepts the user-chosen
 * settings at call time (the hook itself is parameter-free). Errors are
 * propagated so the caller can render its own UI (the dialog toasts on
 * failure); programmatic callers should `try/catch` the returned promise.
 */
export const useExportAsPPTX = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  const exportAsPPTX = async (
    settings: Partial<PptxExportSettings> = {}
  ): Promise<void> => {
    if (!editor) {
      throw new Error("Editor context is not available")
    }

    const apollonSVG = await editor.exportAsSVG({ svgMode: "compat" })

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
