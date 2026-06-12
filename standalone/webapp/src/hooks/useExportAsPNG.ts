import { SVG } from "@tumaet/apollon/react"
import { useFileDownload } from "./useFileDownload"
import { useEditorContext } from "@/contexts"
import { log } from "@/logger"
import { isPlatform } from "@ionic/react"
import { Filesystem, Directory } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"

type exportAsPNGOptions = {
  setWhiteBackground: boolean
  shareAfterExport?: boolean
}

export const useExportAsPNG = () => {
  const { editor } = useEditorContext()
  const downloadFile = useFileDownload()

  const exportAsPNG = async ({ setWhiteBackground }: exportAsPNGOptions) => {
    if (!editor) {
      log.error("Editor context is not available")
      return
    }

    const apollonSVG: SVG = await editor.exportAsSVG({ svgMode: "compat" })

    const pngBlob = await convertRenderedSVGToPNG(
      apollonSVG,
      setWhiteBackground
    )
    const fileName = `${editor.model.title}.png`

    if (isPlatform("ios") || isPlatform("android")) {
      try {
        // Convert blob to base64
        const base64String = await blobToBase64(pngBlob)

        // Save PNG to cache - Capacitor will handle base64 data properly
        await Filesystem.writeFile({
          path: fileName,
          data: base64String,
          directory: Directory.Cache,
        })

        // Get the file URI
        const fileUri = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        })

        // Always open share sheet on iOS to allow saving to Files
        await Share.share({
          title: "Export PNG",
          url: fileUri.uri,
          dialogTitle: "Save PNG to Files",
        })

        log.debug("PNG export initiated on iOS")
      } catch (error) {
        log.error("Failed to export PNG on iOS", error as Error)
      }
    } else {
      // Web download
      const fileToDownload = new File([pngBlob], fileName, {
        type: "image/png",
      })

      downloadFile({ file: fileToDownload, fileName })
    }
  }

  return exportAsPNG
}

function convertRenderedSVGToPNG(
  renderedSVG: SVG,
  whiteBackground: boolean
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { width, height } = renderedSVG.clip
    const margin = 0
    const scale = 1.5

    const canvasWidth = width * scale + margin * 2
    const canvasHeight = height * scale + margin * 2

    // Use data URL instead of blob URL for iOS compatibility
    const svgString = encodeURIComponent(renderedSVG.svg)
    const dataUrl = `data:image/svg+xml,${svgString}`

    const image = new Image()
    image.width = width
    image.height = height

    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = canvasWidth
      canvas.height = canvasHeight

      const context = canvas.getContext("2d")!

      if (whiteBackground) {
        context.fillStyle = "white"
        context.fillRect(0, 0, canvasWidth, canvasHeight)
      }

      context.scale(scale, scale)
      context.drawImage(image, margin, margin)

      canvas.toBlob((blob) => {
        resolve(blob as Blob)
      })
    }

    image.onerror = (error) => {
      reject(error)
    }
    image.src = dataUrl
  })
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
