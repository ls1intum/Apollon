import type { SvgToPngResult } from "@tumaet/apollon/export"
import { isIOS, isAndroid } from "@/utils/platform"
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
    // Lazy-load the renderer (and its inlined fonts) + the resvg wasm only on
    // export, so the editor route's bundle stays lean. Vite resolves the wasm to
    // a served asset URL; the library leaves wasm location to the host bundler
    // since `@resvg/resvg-wasm` doesn't export it portably.
    const [{ svgToPng }, { default: resvgWasmUrl }] = await Promise.all([
      import("@tumaet/apollon/export"),
      import("@resvg/resvg-wasm/index_bg.wasm?url"),
    ])
    const result = await svgToPng(apollonSVG.svg, apollonSVG.clip, {
      scale: 1.5,
      background: setWhiteBackground ? "#ffffff" : null,
      wasmInput: fetch(resvgWasmUrl),
    })
    const fileName = `${editor.model.title}.png`

    if (isIOS() || isAndroid()) {
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
