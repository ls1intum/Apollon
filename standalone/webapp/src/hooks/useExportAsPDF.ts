import { useEditorContext } from "@/contexts"
import { jsPDF } from "jspdf"
import { log } from "@/logger"
import { backendURL } from "@/constants"
import { useFileDownload } from "./useFileDownload"

type ExportPDFOptions = {
  /**
   * If true, use server-side conversion (requires server to be running).
   * Default is false (client-side conversion using jsPDF).
   */
  serverSide?: boolean
}

/**
 * Hook to export the current diagram as PDF.
 *
 * Supports two modes:
 * 1. Client-side (default): Uses jsPDF to create PDF directly in the browser
 * 2. Server-side: Sends SVG to the server for conversion using pdfmake
 *
 * Server-side conversion may produce better quality PDFs with proper vector graphics.
 */
export const useExportAsPDF = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  const exportAsPDF = async (options?: ExportPDFOptions) => {
    if (!editor) return

    const apollonSVG = await editor.exportAsSVG()
    const { clip } = apollonSVG
    const width = clip.width
    const height = clip.height

    const fileName = editor.getDiagramMetadata().diagramTitle || "diagram"

    if (options?.serverSide) {
      // Server-side conversion
      try {
        const response = await fetch(`${backendURL}/api/converter/pdf`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            svg: apollonSVG.svg,
            width,
            height,
          }),
        })

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`)
        }

        const pdfBlob = await response.blob()
        const file = new File([pdfBlob], `${fileName}.pdf`, {
          type: "application/pdf",
        })

        downloadFile({ file, fileName: `${fileName}.pdf` })
        log.debug("PDF exported via server-side conversion")
      } catch (error) {
        log.error("Server-side PDF export failed:", error as Error)
        // Fall back to client-side export
        log.debug("Falling back to client-side PDF export")
        await exportClientSide(apollonSVG.svg, width, height, fileName)
      }
    } else {
      // Client-side conversion
      await exportClientSide(apollonSVG.svg, width, height, fileName)
    }
  }

  return exportAsPDF
}

/**
 * Client-side PDF export using jsPDF.
 * Converts SVG to PNG first, then embeds in PDF.
 */
async function exportClientSide(
  svg: string,
  width: number,
  height: number,
  fileName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], {
      type: "image/svg+xml;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)

    const img = new Image()
    img.onload = () => {
      const scale = 2

      const canvas = document.createElement("canvas")
      canvas.width = width * scale
      canvas.height = height * scale

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        log.error("Could not get canvas context")
        URL.revokeObjectURL(url)
        reject(new Error("Could not get canvas context"))
        return
      }

      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.drawImage(img, 0, 0, width, height)

      const pngData = canvas.toDataURL("image/png")

      const pdf = new jsPDF({
        orientation: width > height ? "l" : "p",
        unit: "pt",
        format: [width, height],
        compress: true,
        precision: 2,
      })

      pdf.addImage(pngData, "PNG", 0, 0, width, height)
      pdf.save(`${fileName}.pdf`)

      URL.revokeObjectURL(url)
      log.debug("PDF exported via client-side conversion")
      resolve()
    }

    img.onerror = (e) => {
      log.error("Failed to load SVG image", e as unknown as Error)
      URL.revokeObjectURL(url)
      reject(e)
    }

    img.src = url
  })
}
