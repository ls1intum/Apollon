import type { UMLModel } from "@tumaet/apollon"

const THUMBNAIL_MAX_WIDTH = 400
const THUMBNAIL_MAX_HEIGHT = 300

const parseSvgDimension = (value: string | null): number | null => {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

const getDimensionsFromViewBox = (
  viewBox: string | null
): { width: number; height: number } | null => {
  if (!viewBox) return null
  const parts = viewBox
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number.parseFloat(part))

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null
  }

  const width = parts[2]
  const height = parts[3]
  if (width <= 0 || height <= 0) {
    return null
  }

  return { width, height }
}

export const normalizeThumbnailSvg = (
  svgString: string,
  fallbackWidth?: number,
  fallbackHeight?: number
): string => {
  const parser = new DOMParser()
  const parsedDocument = parser.parseFromString(svgString, "image/svg+xml")
  const parseError = parsedDocument.querySelector("parsererror")
  const svgElement = parsedDocument.documentElement

  if (parseError || !svgElement || svgElement.tagName.toLowerCase() !== "svg") {
    return svgString
  }

  const widthAttribute = parseSvgDimension(svgElement.getAttribute("width"))
  const heightAttribute = parseSvgDimension(svgElement.getAttribute("height"))
  const viewBoxDimensions = getDimensionsFromViewBox(
    svgElement.getAttribute("viewBox")
  )

  const sourceWidth =
    widthAttribute ??
    viewBoxDimensions?.width ??
    fallbackWidth ??
    THUMBNAIL_MAX_WIDTH
  const sourceHeight =
    heightAttribute ??
    viewBoxDimensions?.height ??
    fallbackHeight ??
    THUMBNAIL_MAX_HEIGHT

  const scale = Math.min(
    1,
    THUMBNAIL_MAX_WIDTH / sourceWidth,
    THUMBNAIL_MAX_HEIGHT / sourceHeight
  )
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale))
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale))

  svgElement.setAttribute("width", `${targetWidth}`)
  svgElement.setAttribute("height", `${targetHeight}`)

  return new XMLSerializer().serializeToString(svgElement)
}

export const renderThumbnailSvgFromModel = async (
  model: UMLModel
): Promise<string> => {
  const { ApollonEditor } = await import("@tumaet/apollon")
  const mountNode = document.createElement("div")
  mountNode.style.position = "fixed"
  mountNode.style.left = "-10000px"
  mountNode.style.top = "0"
  mountNode.style.width = `${THUMBNAIL_MAX_WIDTH}px`
  mountNode.style.height = `${THUMBNAIL_MAX_HEIGHT}px`
  mountNode.style.opacity = "0"
  mountNode.style.pointerEvents = "none"
  // The offscreen editor we mount to grab a thumbnail contains focusable controls
  // (buttons, inputs). `aria-hidden` alone leaves that subtree keyboard-reachable,
  // which is both an a11y bug (aria-hidden must not contain focusable content) and
  // wrong for a non-interactive render scratchpad. `inert` removes it from the a11y
  // tree AND makes every descendant unfocusable.
  mountNode.setAttribute("aria-hidden", "true")
  mountNode.inert = true
  document.body.appendChild(mountNode)

  let instance: InstanceType<typeof ApollonEditor> | undefined
  try {
    instance = new ApollonEditor(mountNode, { model })
    const exportedSvg = await instance.exportAsSVG({ svgMode: "compat" })
    return normalizeThumbnailSvg(
      exportedSvg.svg,
      exportedSvg.clip.width,
      exportedSvg.clip.height
    )
  } finally {
    instance?.destroy()
    mountNode.remove()
  }
}
