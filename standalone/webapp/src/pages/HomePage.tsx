import React, {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useNavigate, useLocation } from "react-router"
import { importDiagram } from "@tumaet/apollon"
import { toast } from "react-toastify"
import { log } from "@/logger"
import { playgroundModelId } from "@/constants/playgroundDefaultDiagram"
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
  const models = usePersistenceModelStore((state) => state.models)
  const setCurrentModelId = usePersistenceModelStore(
    (state) => state.setCurrentModelId
  )
  const sortedModelEntries = useMemo(
    () =>
      Object.entries(models)
        .filter(([id]) => id !== playgroundModelId)
        .sort(
          ([, first], [, second]) =>
            new Date(second.lastModifiedAt).getTime() -
            new Date(first.lastModifiedAt).getTime()
        ),
    [models]
  )
  const hasDiagrams = sortedModelEntries.length > 0

  const contentRef = useRef<HTMLElement>(null)

  // Track whether the banner has scrolled out of view inside <main>
  const bannerRef = useRef<HTMLDivElement>(null)
  const [isBannerHidden, setIsBannerHidden] = useState(false)

  useEffect(() => {
    if (!hasDiagrams) return
    const el = bannerRef.current
    const scrollRoot = contentRef.current
    if (!el || !scrollRoot) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsBannerHidden(!entry.isIntersecting)
      },
      // root = the <main> scroll container; fire as soon as 1px leaves the top
      { root: scrollRoot, threshold: 0, rootMargin: "0px 0px 0px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasDiagrams])

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

  const diagramCount = sortedModelEntries.length

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--home-surface-base)] text-[var(--home-text-primary)] transition-colors duration-200">
      <HomeNavbar
        showQuickActions={hasDiagrams && isBannerHidden}
        onNewDiagram={() => openModal("NEW_DIAGRAM")}
        onFromTemplate={() => openModal("NEW_DIAGRAM_FROM_TEMPLATE")}
        onImportJson={() => jsonImportRef.current?.click()}
      />

      {/* Hidden file input for JSON import — lives outside scroll so it persists */}
      <input
        ref={jsonImportRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={handleJsonImport}
        aria-hidden="true"
        tabIndex={-1}
      />

      <main
        ref={contentRef}
        className="home-page-scrollbar app-scroll-y relative z-10 w-full min-h-0 flex-1 pb-24 md:pb-10"
      >
        {!hasDiagrams ? (
          // Landing shell for new users — intentionally minimal/unstyled.
          // The previous design has been removed; this is a blank slate to be
          // rebuilt on the dashboard design system.
          <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <p>No diagrams yet.</p>
            <button type="button" onClick={() => openModal("NEW_DIAGRAM")}>
              New diagram
            </button>
          </div>
        ) : (
          <>
            {/* Banner — inside the scroll container so it scrolls away */}
            <div
              ref={bannerRef}
              className="recent-diagrams-font border-b border-[var(--home-border-default)] px-4 py-6 md:px-8 md:py-8"
              style={{ backgroundColor: "var(--home-accent-base)" }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: title + count */}
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold leading-tight tracking-tight text-white md:text-3xl">
                    My Diagrams
                  </h1>
                  <p className="mt-1.5 text-xs text-white/50">
                    {diagramCount} {diagramCount === 1 ? "diagram" : "diagrams"}
                  </p>
                </div>

                {/* Right: action buttons */}
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-label="Create diagram from template"
                    onClick={() => openModal("NEW_DIAGRAM_FROM_TEMPLATE")}
                    className="home-on-accent-btn home-on-accent-btn--ghost flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
                  >
                    <svg
                      className="h-3.5 w-3.5 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3 9h18M9 21V9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    From template
                  </button>

                  <button
                    type="button"
                    aria-label="Import diagram from JSON file"
                    onClick={() => jsonImportRef.current?.click()}
                    className="home-on-accent-btn home-on-accent-btn--ghost flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
                  >
                    <svg
                      className="h-3.5 w-3.5 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path
                        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points="17 8 12 3 7 8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="12"
                        y1="3"
                        x2="12"
                        y2="15"
                        strokeLinecap="round"
                      />
                    </svg>
                    Import JSON
                  </button>

                  <button
                    type="button"
                    aria-label="Create a new blank diagram"
                    onClick={() => openModal("NEW_DIAGRAM")}
                    className="home-on-accent-btn flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
                  >
                    <svg
                      className="h-3.5 w-3.5 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 5v14M5 12h14"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    New diagram
                  </button>
                </div>
              </div>
            </div>

            {/* Gallery */}
            <div className="px-4 pt-5 md:px-6 md:pt-6">
              <Suspense fallback={<DiagramGallerySkeleton />}>
                <DiagramGallery
                  highlightSharedDiagramId={highlightSharedDiagramId}
                />
              </Suspense>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
