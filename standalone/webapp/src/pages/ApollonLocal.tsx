import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useEditorContext } from "@/contexts"
import { ApollonEditor } from "@tumaet/apollon/react"
import React, { useEffect, useRef } from "react"
import { useLocation, useParams } from "react-router"
import { log } from "@/logger"
import { normalizeThumbnailSvg } from "@/utils/thumbnailSvg"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
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
  const location = useLocation()
  const locationRef = useRef(location)
  const diagram = usePersistenceModelStore((store) =>
    diagramId ? store.models[diagramId] : null
  )
  const setCurrentModelId = usePersistenceModelStore(
    (store) => store.setCurrentModelId
  )
  const updateModel = usePersistenceModelStore((store) => store.updateModel)
  const setThumbnail = usePersistenceModelStore((store) => store.setThumbnail)

  useDocumentTitle(diagram?.model.title)

  useEffect(() => {
    locationRef.current = location
  })

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

    // E2E seam (dev builds only — `import.meta.env.DEV` is statically false in
    // production, so this is dead-code-eliminated from the shipped bundle).
    // Exposes the imperative editor so Playwright can drive API surfaces that
    // have no UI affordance, e.g. `setElementHighlights`.
    if (import.meta.env.DEV) {
      ;(window as Window & { apollonEditor?: ApollonEditor }).apollonEditor =
        instance
    }

    return () => {
      isThumbnailExportCanceledRef.current = true
      thumbnailExportSequenceRef.current += 1
      if (import.meta.env.DEV) {
        delete (window as Window & { apollonEditor?: ApollonEditor })
          .apollonEditor
      }
      if (thumbnailExportTimeoutRef.current) {
        clearTimeout(thumbnailExportTimeoutRef.current)
        thumbnailExportTimeoutRef.current = null
      }

      log.debug("Cleaning up Apollon instance")
      instance.destroy()
      const isTransitioningToAnotherLocalDiagram = /^\/local\//.test(
        locationRef.current.pathname
      )
      if (
        !isTransitioningToAnotherLocalDiagram &&
        usePersistenceModelStore.getState().currentModelId === diagram.id
      ) {
        setCurrentModelId(null)
        setEditor(undefined)
      }
    }
  }, [diagram?.id, setCurrentModelId, setEditor, setThumbnail, updateModel])

  if (!diagramId || !diagram) {
    return <ErrorPage message="Diagram not found." buttonLabel="All diagrams" />
  }

  return (
    <div
      style={{ display: "flex", flexGrow: 1, height: "100%" }}
      ref={containerRef}
    />
  )
}
