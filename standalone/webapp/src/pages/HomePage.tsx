import React, { lazy, Suspense, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "@tanstack/react-router"
import { importDiagram } from "@tumaet/apollon"
import { toast } from "react-toastify"
import { log } from "@/logger"
import { HomeNavbar } from "@/components/navbar/HomeNavbar"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useModalContext } from "@/contexts"
import { DiagramGallerySkeleton } from "@/components/home/DiagramGallerySkeleton"
import { Capacitor } from "@capacitor/core"
import { HomeFooter } from "@/components/home/HomeFooter"
import { pruneExpiredSharedDiagrams } from "@/utils/sharedDiagramStorage"
import { readHighlightSharedDiagramId } from "@/lib/navProvenance"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"

const DiagramGallery = lazy(() =>
  import("@/components/home/DiagramGallery").then((module) => ({
    default: module.DiagramGallery,
  }))
)

export const HomePage = () => {
  useDocumentTitle("Your diagrams")
  const isNative = Capacitor.isNativePlatform()
  const navigate = useNavigate()
  const location = useLocation()
  const highlightSharedDiagramId =
    readHighlightSharedDiagramId(location.state) ?? null
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
        if (!processedModel?.id) {
          throw new Error("Imported diagram has no id")
        }
        usePersistenceModelStore.getState().createModel(processedModel)
        navigate({
          to: "/local/$id",
          params: { id: processedModel.id },
          replace: true,
        })
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

  useEffect(() => {
    pruneExpiredSharedDiagrams()
  }, [])

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--home-surface-base)] text-[var(--home-text-primary)] transition-colors duration-200">
      <HomeNavbar />

      {/* Off-screen file input the Import button triggers programmatically. */}
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
        <div className="home-content-x mx-auto flex w-full max-w-[1536px] flex-col gap-6 pt-5 md:pt-6">
          <Suspense fallback={<DiagramGallerySkeleton />}>
            <DiagramGallery
              highlightSharedDiagramId={highlightSharedDiagramId}
              onNewDiagram={() =>
                openModal("NEW_DIAGRAM", { dialogVariant: "home" })
              }
              onImportJson={() => jsonImportRef.current?.click()}
            />
          </Suspense>
        </div>
      </main>

      {/* Web only: native (Capacitor) surfaces these links via the navbar menu
          instead, and on mobile web the footer is hidden in favor of it. */}
      {!isNative && <HomeFooter className="hidden md:flex" />}
    </div>
  )
}
