import type { SVG } from "@tumaet/apollon"

/** Oversample so the exported bitmap holds up when zoomed. */
const SCALE = 1.5

/** Base64-encode bytes without blowing the call stack on a large image. */
function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

/** Rasterize a rendered SVG to base64 PNG bytes for the host to write to disk. */
export async function renderSvgToPngBase64(rendered: SVG): Promise<string> {
  const { width, height } = rendered.clip
  const blob = new Blob([rendered.svg], { type: "image/svg+xml" })
  const blobUrl = URL.createObjectURL(blob)

  try {
    const image = new Image()
    image.width = width
    image.height = height
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error("the diagram SVG failed to load"))
      image.src = blobUrl
    })

    const canvas = document.createElement("canvas")
    canvas.width = width * SCALE
    canvas.height = height * SCALE
    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("no 2D canvas context")
    }
    // PNG supports transparency, but a diagram on a transparent background is
    // unreadable in most viewers.
    context.fillStyle = "white"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.scale(SCALE, SCALE)
    context.drawImage(image, 0, 0)

    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    )
    if (!png) {
      throw new Error("the diagram is too large to rasterize")
    }
    return toBase64(new Uint8Array(await png.arrayBuffer()))
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}
