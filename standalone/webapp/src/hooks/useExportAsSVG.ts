import { useFileDownload } from "./useFileDownload"
import { useEditorContext } from "@/contexts"
import { log } from "@/logger"
import { exportClassDiagramAsFlatSvg, UMLDiagramType } from "@tumaet/apollon"

export const useExportAsSVG = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  const exportSVG = async () => {
    if (!editor) {
      log.error("Failed to export SVG: editor is not available")
      return
    }

    // Previous exporter (kept for quick rollback):
    // const apollonSVG = await editor.exportAsSVG()
    const apollonSVG =
      editor.model.type === UMLDiagramType.ClassDiagram
        ? exportClassDiagramAsFlatSvg(editor.model)
        : await editor.exportAsSVG()

    if (!apollonSVG) {
      log.error("Failed to export SVG")
      return
    }

    const diagramTitle = editor?.model.title || "diagram"
    const fileName = `${diagramTitle}.svg`

    const fileToDownload = new File([apollonSVG.svg], fileName, {
      type: "image/svg+xml",
    })

    downloadFile({ file: fileToDownload, fileName })
  }

  return exportSVG
}
