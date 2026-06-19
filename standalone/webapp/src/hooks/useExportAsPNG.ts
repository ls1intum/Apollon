import { svgToPng, type SvgToPngResult } from "@tumaet/apollon/export"
// Vite resolves the resvg wasm to a served asset URL; the library renders the
// PNG but leaves wasm location to the host bundler (it isn't portably exported).
import resvgWasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url"
import { isPlatform } from "@ionic/react"
import { Filesystem, Directory } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"
import { useFileDownload } from "./useFileDownload"
import { useEditorContext } from "@/contexts"

type exportAsPNGOptions = {
  setWhiteBackground: boolean
  shareAfterExport?: boolean
}

/**
 * Export the diagram as PNG. Rasterisation runs through the library's
 * resvg-based `svgToPng`, which bypasses the browser canvas-area cap that made
 * large diagrams silently produce a 0-byte file (#667). Errors propagate so the
 * caller can surface them; the result reports whether the diagram was
 * downscaled to fit the pixel budget.
 */
export const useExportAsPNG = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  const exportAsPNG = async ({
    setWhiteBackground,
  }: exportAsPNGOptions): Promise<SvgToPngResult> => {
    if (!editor) {
      throw new Error("Editor context is not available")
    }

    const apollonSVG = await editor.exportAsSVG({ svgMode: "compat" })
    const result = await svgToPng(apollonSVG.svg, apollonSVG.clip, {
      scale: 1.5,
      background: setWhiteBackground ? "#ffffff" : null,
      wasmInput: fetch(resvgWasmUrl),
    })
    const fileName = `${editor.model.title}.png`

    if (isPlatform("ios") || isPlatform("android")) {
      const base64String = await blobToBase64(result.blob)
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
        title: "Export PNG",
        url: fileUri.uri,
        dialogTitle: "Save PNG to Files",
      })
    } else {
      const fileToDownload = new File([result.blob], fileName, {
        type: "image/png",
      })
      downloadFile({ file: fileToDownload, fileName })
    }

    return result
  }

  return exportAsPNG
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
