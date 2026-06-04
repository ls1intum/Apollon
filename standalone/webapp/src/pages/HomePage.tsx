import React, { lazy, Suspense, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router"
import { importDiagram } from "@tumaet/apollon"
import { toast } from "react-toastify"
import { log } from "@/logger"
import { HomeNavbar } from "@/components/navbar/HomeNavbar"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useModalContext } from "@/contexts"
import { DiagramGallerySkeleton } from "@/components/home/DiagramGallerySkeleton"

const DiagramGallery = lazy(() =>
  import("@/components/home/DiagramGallery").then((module) => ({
    default: module.DiagramGallery,
  }))
)

export const HomePage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const highlightSharedDiagramId =
    (location.state as { highlightSharedDiagramId?: string } | null)
      ?.highlightSharedDiagramId ?? null
  const { openModal } = useModalContext()
  const setCurrentModelId = usePersistenceModelStore(
    (state) => state.setCurrentModelId
  )
  const jsonImportRef = useRef<HTMLInputElement>(null)

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        const processedModel = importDiagram(json)
        usePersistenceModelStore.getState().createModel(processedModel)
        navigate(`/local/${processedModel.id}`, { replace: true })
      } catch (error) {
        log.error("Invalid JSON file", error as Error)
        toast.error("Failed to import diagram — invalid JSON file.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  useEffect(() => {
    setCurrentModelId(null)
  }, [setCurrentModelId])

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--home-surface-base)] text-[var(--home-text-primary)] transition-colors duration-200">
      <HomeNavbar />

      {/* Hidden file input for JSON import */}
      <input
        ref={jsonImportRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={handleJsonImport}
        aria-hidden="true"
        tabIndex={-1}
      />

      <main className="home-page-scrollbar app-scroll-y relative z-10 w-full min-h-0 flex-1 pb-24 md:pb-10">
        <div className="flex w-full flex-col gap-5 px-4 pt-5 md:px-6 md:pt-6">
          <Suspense fallback={<DiagramGallerySkeleton />}>
            <DiagramGallery
              highlightSharedDiagramId={highlightSharedDiagramId}
              onNewDiagram={() =>
                openModal("NEW_DIAGRAM", { dialogVariant: "home" })
              }
              onFromTemplate={() =>
                openModal("NEW_DIAGRAM_FROM_TEMPLATE", {
                  dialogVariant: "home",
                })
              }
              onImportJson={() => jsonImportRef.current?.click()}
            />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
