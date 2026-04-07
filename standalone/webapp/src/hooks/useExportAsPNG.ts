import { SVG } from "@tumaet/apollon"
import { useFileDownload } from "./useFileDownload"
import { useEditorContext } from "@/contexts"
import { log } from "@/logger"

type exportAsPNGOptions = {
  setWhiteBackground: boolean
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

    const fileToDownload = new File([pngBlob], fileName, {
      type: "image/png",
    })

    downloadFile({ file: fileToDownload, fileName })
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

    const blob = new Blob([renderedSVG.svg], { type: "image/svg+xml" })
    const blobUrl = URL.createObjectURL(blob)

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
        URL.revokeObjectURL(blobUrl)
        resolve(blob as Blob)
      })
    }

    image.onerror = (error) => {
      reject(error)
    }
    image.src = blobUrl
  })
}
