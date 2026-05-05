import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useEditorContext } from "@/contexts"
import { ApollonEditor } from "@tumaet/apollon"
import React, { useEffect, useRef } from "react"
import { useParams } from "react-router"
import { log } from "@/logger"
import { normalizeThumbnailSvg } from "@/utils/thumbnailSvg"
import { ErrorPage } from "./ErrorPage"

const THUMBNAIL_DEBOUNCE_MS = 2000

export const ApollonLocal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const thumbnailExportTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const thumbnailExportSequenceRef = useRef(0)
  const isThumbnailExportCanceledRef = useRef(false)
  const { setEditor } = useEditorContext()
  const { id: diagramId } = useParams()
  const diagram = usePersistenceModelStore((store) =>
    diagramId ? store.models[diagramId] : null
  )
  const setCurrentModelId = usePersistenceModelStore(
    (store) => store.setCurrentModelId
  )
  const updateModel = usePersistenceModelStore((store) => store.updateModel)
  const setThumbnail = usePersistenceModelStore((store) => store.setThumbnail)

  useEffect(() => {
    if (!containerRef.current || !diagram) return
    isThumbnailExportCanceledRef.current = false
    setCurrentModelId(diagram.id)

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
          if (
            sequence !== thumbnailExportSequenceRef.current ||
            isThumbnailExportCanceledRef.current
          ) {
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
      isThumbnailExportCanceledRef.current = true
      thumbnailExportSequenceRef.current += 1
      if (thumbnailExportTimeoutRef.current) {
        clearTimeout(thumbnailExportTimeoutRef.current)
        thumbnailExportTimeoutRef.current = null
      }

      log.debug("Cleaning up Apollon instance")
      instance.destroy()
      setCurrentModelId(null)
      setEditor(undefined)
    }
  }, [diagram?.id, setCurrentModelId, setEditor, setThumbnail, updateModel])

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
