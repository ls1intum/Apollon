import { useEditorContext } from "@/contexts"
import { svgToPng } from "@/utils/svgToPng"
import { useFileDownload } from "./useFileDownload"

type ExportAsPNGOptions = {
  setWhiteBackground: boolean
}

/**
 * Outcome surfaced to the navbar so it can toast a "downscaled" warning when
 * the diagram exceeded the per-export pixel budget. Failure paths still throw.
 */
export type ExportAsPNGResult = {
  clamped: boolean
  appliedScale: number
}

/**
 * Trigger a PNG export. Returned function rejects on failure so the navbar
 * can branch on `RasterTooLargeError` / `RasterTimeoutError` and toast.
 */
export const useExportAsPNG = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  const exportAsPNG = async ({
    setWhiteBackground,
  }: ExportAsPNGOptions): Promise<ExportAsPNGResult> => {
    if (!editor) {
      throw new Error("Editor context is not available")
    }

    const apollonSVG = await editor.exportAsSVG({ svgMode: "compat" })
    const { blob, clamped, appliedScale } = await svgToPng(
      apollonSVG.svg,
      apollonSVG.clip,
      {
        scale: 1.5,
        background: setWhiteBackground ? "#ffffff" : null,
      }
    )

    const fileName = `${editor.model.title || "diagram"}.png`
    const fileToDownload = new File([blob], fileName, { type: "image/png" })
    downloadFile({ file: fileToDownload, fileName })
    return { clamped, appliedScale }
  }

  return exportAsPNG
}
