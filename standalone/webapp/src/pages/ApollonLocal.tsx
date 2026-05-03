import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useEditorContext } from "@/contexts"
import { ApollonEditor } from "@tumaet/apollon"
import React, { useEffect, useRef } from "react"
import { useParams } from "react-router"
import { log } from "@/logger"
import { ErrorPage } from "./ErrorPage"

const THUMBNAIL_MAX_WIDTH = 400
const THUMBNAIL_MAX_HEIGHT = 300
const THUMBNAIL_DEBOUNCE_MS = 2000

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

const normalizeThumbnailSvg = (
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

export const ApollonLocal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const thumbnailExportTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const thumbnailExportSequenceRef = useRef(0)
  const { setEditor } = useEditorContext()
  const { id: diagramId } = useParams()
  const diagram = usePersistenceModelStore((store) =>
    diagramId ? store.models[diagramId] : null
  )
  const updateModel = usePersistenceModelStore((store) => store.updateModel)
  const setThumbnail = usePersistenceModelStore((store) => store.setThumbnail)

  useEffect(() => {
    if (!containerRef.current || !diagram) return

    const instance = new ApollonEditor(containerRef.current, {
      model: diagram.model,
    })

    instance.subscribeToModelChange((model) => {
      updateModel(model)
      if (thumbnailExportTimeoutRef.current) {
        clearTimeout(thumbnailExportTimeoutRef.current)
      }

      const sequence = ++thumbnailExportSequenceRef.current
      thumbnailExportTimeoutRef.current = setTimeout(async () => {
        try {
          const exportedSvg = await instance.exportAsSVG({ svgMode: "compat" })
          if (sequence !== thumbnailExportSequenceRef.current) {
            return
          }

          const normalizedSvg = normalizeThumbnailSvg(
            exportedSvg.svg,
            exportedSvg.clip.width,
            exportedSvg.clip.height
          )

          setThumbnail(model.id, normalizedSvg)
        } catch (error) {
          log.error("Failed to generate diagram thumbnail", error as Error)
        }
      }, THUMBNAIL_DEBOUNCE_MS)
    })

    setEditor(instance)

    return () => {
      if (thumbnailExportTimeoutRef.current) {
        clearTimeout(thumbnailExportTimeoutRef.current)
        thumbnailExportTimeoutRef.current = null
      }

      log.debug("Cleaning up Apollon instance")
      instance.destroy()
      setEditor(undefined)
    }
  }, [diagram?.id, setEditor, setThumbnail, updateModel])

  if (!diagramId || !diagram) {
    return <ErrorPage message="Diagram not found." buttonLabel="Back to Home" />
  }

  return (
    <div
      style={{ display: "flex", flexGrow: 1, height: "100%" }}
      ref={containerRef}
    />
  )
}
