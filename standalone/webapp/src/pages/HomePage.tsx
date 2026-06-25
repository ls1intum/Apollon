import React, { lazy, Suspense, useEffect, useMemo, useRef } from "react"
import { useNavigate, useLocation } from "@tanstack/react-router"
import { importDiagram, type UMLDiagramType } from "@tumaet/apollon"
import { toast } from "react-toastify"
import { log } from "@/logger"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useModalContext } from "@/contexts"
import { DiagramGallerySkeleton } from "@/components/home/DiagramGallerySkeleton"
import { HomeHeaderRow } from "@/components/home/HomeHeaderRow"
import { HomeNewFab } from "@/components/home/HomeNewFab"
import { useHomeChrome } from "@/components/home/useHomeChrome"
import { getDiagramTypeLabel } from "@/components/home/diagramTypeMeta"
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
  const navigate = useNavigate()
  const location = useLocation()
  const highlightSharedDiagramId =
    readHighlightSharedDiagramId(location.state) ?? null
  const { openModal } = useModalContext()
  const setCurrentModelId = usePersistenceModelStore(
    (state) => state.setCurrentModelId
  )
  const jsonImportRef = useRef<HTMLInputElement>(null)

  // The single source of truth for the band's search / favorites / source /
  // type / sort controls. Passed to BOTH the band and the gallery so they share
  // one refinement state.
  const chrome = useHomeChrome()

  const openNewDiagram = () =>
    openModal("NEW_DIAGRAM", { dialogVariant: "home" })
  const triggerJsonImport = () => jsonImportRef.current?.click()

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

  // `count` (filtered result total) and `typeOptions` (the diagram types that are
  // actually present) are derived from the gallery's async-loaded data — local +
  // shared — so the gallery reports them up for the band to render. Memoize the
  // setters so they don't re-trigger the gallery's report effects each render.
  const [count, setCount] = React.useState(0)
  const [presentTypes, setPresentTypes] = React.useState<
    readonly UMLDiagramType[]
  >([])
  const typeOptions = useMemo(
    () =>
      [...presentTypes].sort((firstType, secondType) =>
        getDiagramTypeLabel(firstType).localeCompare(
          getDiagramTypeLabel(secondType)
        )
      ),
    [presentTypes]
  )

  return (
    <div className="home-canvas-bg relative flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground transition-colors duration-200">
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
          <HomeHeaderRow
            chrome={chrome}
            count={count}
            typeOptions={typeOptions}
            onNewDiagram={openNewDiagram}
            onImportJson={triggerJsonImport}
          />
          <Suspense fallback={<DiagramGallerySkeleton />}>
            <DiagramGallery
              chrome={chrome}
              highlightSharedDiagramId={highlightSharedDiagramId}
              onCountChange={setCount}
              onTypeOptionsChange={setPresentTypes}
            />
          </Suspense>
        </div>
      </main>

      <HomeNewFab onNewDiagram={openNewDiagram} />
    </div>
  )
}
