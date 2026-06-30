import type { SvgExportMode } from "@tumaet/apollon"
import { isPlatform } from "@ionic/react"
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"
import { useFileDownload } from "./useFileDownload"
import { useEditorContext } from "@/contexts"

const buildSvgFileName = (title: string, suffix?: string) =>
  suffix ? `${title}${suffix}.svg` : `${title}.svg`

export const useExportAsSVG = (
  svgMode: SvgExportMode = "compat",
  fileNameSuffix?: string
) => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  // Rejects on any failure (missing editor, empty export, or a mobile
  // Filesystem/Share error) instead of swallowing it, so callers — e.g. the
  // navbar's toast.promise — report a failure rather than a false success.
  const exportSVG = async () => {
    if (!editor) {
      throw new Error("Editor context is not available")
    }

    const apollonSVG = await editor.exportAsSVG({ svgMode })
    if (!apollonSVG) {
      throw new Error("Failed to export SVG")
    }

    const diagramTitle = editor.model.title || "diagram"
    const fileName = buildSvgFileName(diagramTitle, fileNameSuffix)

    if (isPlatform("ios") || isPlatform("android")) {
      await Filesystem.writeFile({
        path: fileName,
        data: apollonSVG.svg,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      })
      const fileUri = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      })
      await Share.share({
        title: "Export SVG",
        url: fileUri.uri,
        dialogTitle: "Save SVG to Files",
      })
    } else {
      const fileToDownload = new File([apollonSVG.svg], fileName, {
        type: "image/svg+xml",
      })
      downloadFile({ file: fileToDownload, fileName })
    }
  }

  return exportSVG
}
