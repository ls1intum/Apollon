import { useEditorContext } from "@/contexts"
import { jsPDF } from "jspdf"
import { log } from "@/logger"
import { isPlatform } from "@ionic/react"
import { Filesystem, Directory } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"
import { useFileDownload } from "./useFileDownload"

export const useExportAsPDF = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  const exportAsPDF = async () => {
    if (!editor) return

    const ApollonSVG = await editor.exportAsSVG({ svgMode: "compat" })
    const { clip } = ApollonSVG
    const width = clip.width
    const height = clip.height

    const blob = new Blob([ApollonSVG.svg], {
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

      const diagramTitle = editor.getDiagramMetadata().diagramTitle || "diagram"
      const fileName = `${diagramTitle}.pdf`

      if (isPlatform("ios") || isPlatform("android")) {
        const pdfBlob = pdf.output("blob") as Blob
        blobToBase64(pdfBlob)
          .then(async (base64String) => {
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

            log.debug("PDF export initiated on iOS")
          })
          .catch((error) => {
            log.error("Failed to export PDF on iOS", error as Error)
          })
      } else {
        const pdfBlob = pdf.output("blob") as Blob
        const fileToDownload = new File([pdfBlob], fileName, {
          type: "application/pdf",
        })
        downloadFile({ file: fileToDownload, fileName })
      }

      URL.revokeObjectURL(url)
    }

    img.onerror = (e) => {
      log.error("Failed to load SVG image", e as unknown as Error)
    }

    img.src = url
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
