import type { SvgExportMode } from "@tumaet/apollon"
import { useFileDownload } from "./useFileDownload"
import { useEditorContext } from "@/contexts"
import { log } from "@/logger"
import { isPlatform } from "@ionic/react"
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"

const buildSvgFileName = (title: string, suffix?: string) =>
  suffix ? `${title}${suffix}.svg` : `${title}.svg`

export const useExportAsSVG = (
  svgMode: SvgExportMode = "compat",
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

    if (isPlatform("ios") || isPlatform("android")) {
      try {
        // Save SVG to temporary location first
        await Filesystem.writeFile({
          path: fileName,
          data: apollonSVG.svg,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        })

        // Get the file URI
        const fileUri = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        })

        // Always open share sheet on iOS to allow saving to Files
        await Share.share({
          title: "Export SVG",
          url: fileUri.uri,
          dialogTitle: "Save SVG to Files",
        })

        log.debug("SVG export initiated on iOS")
      } catch (error) {
        log.error("Failed to export SVG on iOS", error as Error)
      }
    } else {
      // Web download
      const fileToDownload = new File([apollonSVG.svg], fileName, {
        type: "image/svg+xml",
      })

      downloadFile({ file: fileToDownload, fileName })
    }
  }

  return exportSVG
}
