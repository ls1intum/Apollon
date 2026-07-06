import { SVG } from "@tumaet/apollon"

export function convertRenderedSVGToPNG(
  renderedSVG: SVG,
  whiteBackground: boolean
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { width, height } = renderedSVG.clip

    const blob = new Blob([renderedSVG.svg], { type: "image/svg+xml" })
    const blobUrl = URL.createObjectURL(blob)

    const image = new Image()
    image.width = width
    image.height = height
    image.src = blobUrl

    image.onload = () => {
      const canvas = document.createElement("canvas")
      const scale = 1.5 // Adjust scale if necessary
      canvas.width = width * scale
      canvas.height = height * scale

      const context = canvas.getContext("2d")!

      if (whiteBackground) {
        context.fillStyle = "white"
        context.fillRect(0, 0, canvas.width, canvas.height)
      }

      context.scale(scale, scale)
      context.drawImage(image, 0, 0)

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(blobUrl) // Cleanup the blob URL
        resolve(blob as Blob)
      })
    }

    image.onerror = (error) => {
      reject(error)
    }
  })
}
