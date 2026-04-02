import type { SvgExportMode } from "@tumaet/apollon"
import { useFileDownload } from "./useFileDownload"
import { useEditorContext } from "@/contexts"
import { log } from "@/logger"

const buildSvgFileName = (title: string, suffix?: string) =>
  suffix ? `${title}${suffix}.svg` : `${title}.svg`

export const useExportAsSVG = (
  svgMode: SvgExportMode = "web",
  fileNameSuffix?: string
) => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  const exportSVG = async () => {
    if (!editor) {
      log.error("Failed to export SVG: editor is not available")
      return
    }

    const apollonSVG = await editor.exportAsSVG({ svgMode })

    if (!apollonSVG) {
      log.error("Failed to export SVG")
      return
    }

    const diagramTitle = editor?.model.title || "diagram"
    const fileName = buildSvgFileName(diagramTitle, fileNameSuffix)

    const fileToDownload = new File([apollonSVG.svg], fileName, {
      type: "image/svg+xml",
    })

    downloadFile({ file: fileToDownload, fileName })
  }

  return exportSVG
}
