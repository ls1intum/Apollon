import { isIOS, isAndroid } from "@/utils/platform"
import { Filesystem, Directory } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"
import { useEditorContext } from "@/contexts"
import { useFileDownload } from "./useFileDownload"

/**
 * Export the diagram as a vector PDF via the library's `svgToPdf` (svg2pdf.js +
 * jsPDF). Replaces the old path that rasterised onto a canvas and embedded a
 * PNG — that inherited the canvas-area cap (#667) and produced a blurry file.
 * Errors propagate so the caller can surface them.
 */
export const useExportAsPDF = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  const exportAsPDF = async (): Promise<void> => {
    if (!editor) {
      throw new Error("Editor context is not available")
    }

    const { svg, clip } = await editor.exportAsSVG({ svgMode: "compat" })
    // Lazy-load the renderer (jspdf/svg2pdf + inlined fonts) only on export, so
    // the editor route's bundle stays lean.
    const { svgToPdf } = await import("@tumaet/apollon/export")
    const title = editor.getDiagramMetadata().diagramTitle || "diagram"
    const blob = await svgToPdf(svg, clip, { title })
    const fileName = `${title}.pdf`

    if (isIOS() || isAndroid()) {
      const base64String = await blobToBase64(blob)
      await Filesystem.writeFile({
        path: fileName,
        data: base64String,
        directory: Directory.Cache,
      })
      const fileUri = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      })
      await Share.share({
        title: "Export PDF",
        url: fileUri.uri,
        dialogTitle: "Save PDF to Files",
      })
    } else {
      const fileToDownload = new File([blob], fileName, {
        type: "application/pdf",
      })
      downloadFile({ file: fileToDownload, fileName })
    }
  }

  return exportAsPDF
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1]
      resolve(base64String)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
