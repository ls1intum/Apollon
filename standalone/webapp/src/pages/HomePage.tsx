import {
  type ChangeEvent,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react"
import { useNavigate } from "react-router"
import { importDiagram, type UMLModel } from "@tumaet/apollon"
import { toast } from "react-toastify"
import { useModalContext } from "@/contexts/ModalContext"
import { useThemeStore } from "@/stores/useThemeStore"
import { log } from "@/logger"
import { playgroundModelId } from "@/constants/playgroundDefaultDiagram"
import { HomeDiagramSections } from "@/components/home/HomeDiagramSections"
import { HomeNavbar } from "@/components/navbar/HomeNavbar"
import { useHomeScrollSpy, type HomeAnchor } from "@/hooks/useHomeScrollSpy"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { getSharedDiagramEntries } from "@/utils/sharedDiagramStorage"

type HomeNavItem = {
  id: HomeAnchor
  label: string
  icon: ReactElement
}

const TemplateIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 5h16v14H4zM8 9h8M8 13h5M7 19h10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const RecentIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 7v5l3 2M4.7 8.8A8 8 0 1 1 4 12M4 5v4h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const NewDiagramIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V4a.5.5 0 0 1 .5-.5z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 3.5V8h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 10.5v6M9 13.5h6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const ImportDiagramIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 15V5m0 0-3.5 3.5M12 5l3.5 3.5M5 18.5h14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const OpenDiagramIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M8 4.5h8A3.5 3.5 0 0 1 19.5 8v8a3.5 3.5 0 0 1-3.5 3.5H8A3.5 3.5 0 0 1 4.5 16V8A3.5 3.5 0 0 1 8 4.5z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M10 9.5h4M10 12h4M10 14.5h2.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

const PlusIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const homeNavItems: HomeNavItem[] = [
  { id: "new", label: "New Diagram", icon: <NewDiagramIcon /> },
  { id: "template", label: "Templates", icon: <TemplateIcon /> },
  { id: "recent", label: "Recents", icon: <RecentIcon /> },
]

type TemplateItem = {
  id: "Adapter" | "Bridge" | "Command" | "Observer" | "Factory"
  category: "Structural" | "Behavioral" | "Creational"
  highlight?: "Popular" | "Recommended"
}

const templates: TemplateItem[] = [
  { id: "Adapter", category: "Structural", highlight: "Popular" },
  { id: "Bridge", category: "Structural" },
  { id: "Command", category: "Behavioral", highlight: "Recommended" },
  { id: "Observer", category: "Behavioral", highlight: "Popular" },
  { id: "Factory", category: "Creational" },
]

const heroPrimaryButtonClass =
  "h-10 inline-flex items-center justify-center gap-2 leading-5 cursor-pointer rounded-md border border-[var(--home-accent-color)] bg-[var(--home-accent-color)] px-4 py-2 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"

const heroSecondaryButtonClass =
  "h-10 inline-flex items-center justify-center gap-2 leading-5 cursor-pointer rounded-md border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--home-text-primary)] transition-colors duration-200 hover:bg-[var(--home-accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"

const DiagramGallery = lazy(() =>
  import("@/components/home/DiagramGallery").then((module) => ({
    default: module.DiagramGallery,
  }))
)

export const HomePage = () => {
  const navigate = useNavigate()
  const { openModal } = useModalContext()
  const currentTheme = useThemeStore((state) => state.currentTheme)
  const isDarkTheme = currentTheme === "dark"
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const createMenuContainerRef = useRef<HTMLDivElement>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)
  const models = usePersistenceModelStore((state) => state.models)
  const createModel = usePersistenceModelStore((state) => state.createModel)
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
  const diagramCount = sortedModelEntries.length
  const sharedDiagramCount = getSharedDiagramEntries().length
  const totalDiagramCount = diagramCount + sharedDiagramCount
  const latestDiagramId = sortedModelEntries[0]?.[0]
  const latestDiagramTitle = sortedModelEntries[0]?.[1].model.title?.trim()
  const latestDiagramLabel = latestDiagramTitle || "Untitled diagram"

  const { activeAnchor, isReady, sectionRefs, scrollToAnchor } =
    useHomeScrollSpy()
  const { contentRef, newDiagramRef, templateRef, recentRef } = sectionRefs

  const handleCreateFromTemplate = async (template: TemplateItem["id"]) => {
    try {
      const jsonModule = await import(
        `assets/diagramTemplates/${template}.json`
      )
      const sourceModel = jsonModule.default as UMLModel | undefined

      if (!sourceModel) {
        throw new Error("Selected template data not found")
      }

      const clonedModel: UMLModel =
        typeof structuredClone === "function"
          ? structuredClone(sourceModel)
          : JSON.parse(JSON.stringify(sourceModel))

      clonedModel.id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`

      usePersistenceModelStore.getState().createModel(clonedModel)
      navigate(`/local/${clonedModel.id}`)
    } catch (error) {
      log.error("Error creating diagram from template:", error as Error)
      toast.error("Failed to create diagram from template.")
    }
  }

  const appearClass = isReady
    ? "opacity-100 translate-y-0"
    : "opacity-0 translate-y-3"

  useEffect(() => {
    setCurrentModelId(null)
  }, [setCurrentModelId])

  useEffect(() => {
    if (!isCreateMenuOpen) {
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!createMenuContainerRef.current?.contains(event.target as Node)) {
        setIsCreateMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [isCreateMenuOpen])

  const handleToggleCreateMenu = () => {
    setIsCreateMenuOpen((prevState) => !prevState)
  }

  const handleCloseCreateMenu = () => {
    setIsCreateMenuOpen(false)
  }

  const handleOpenNewDiagramModal = () => {
    openModal("NEW_DIAGRAM")
    handleCloseCreateMenu()
  }

  const handleOpenTemplateModal = () => {
    openModal("NEW_DIAGRAM_FROM_TEMPLATE")
    handleCloseCreateMenu()
  }

  const handleImportFromJson = () => {
    importFileInputRef.current?.click()
    handleCloseCreateMenu()
  }

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      try {
        const json = JSON.parse(readerEvent.target?.result as string)
        const processedModel = importDiagram(json)
        createModel(processedModel)
        navigate(`/local/${processedModel.id}`)
      } catch (error) {
        log.error("Invalid JSON file", error as Error)
        toast.error("Invalid JSON diagram file.")
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--home-bg-primary)] text-[var(--home-text-primary)] transition-colors duration-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,color-mix(in_srgb,var(--home-accent-color)_20%,transparent),transparent_52%),radial-gradient(circle_at_95%_100%,color-mix(in_srgb,var(--apollon-guide-horizontal)_16%,transparent),transparent_50%)]" />
      <HomeNavbar />

      <main
        ref={contentRef}
        className="home-page-scrollbar app-scroll-y relative z-10 w-full min-h-0 flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-10 md:pt-6"
      >
        <section
          className={`relative overflow-visible rounded-2xl border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-5 transition-[opacity,transform,background-color,border-color,box-shadow] duration-700 md:p-8 ${
            isDarkTheme
              ? "shadow-[0_16px_32px_-24px_rgba(0,0,0,0.62),0_7px_14px_-10px_rgba(0,0,0,0.42)]"
              : "shadow-[0_14px_28px_-24px_rgba(24,38,52,0.18),0_6px_12px_-10px_rgba(24,38,52,0.12)]"
          } ${appearClass}`}
        >
          <div
            className={`pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--home-accent-color)_17%,transparent)_0%,transparent_52%,color-mix(in_srgb,var(--apollon-guide-horizontal)_14%,transparent)_100%)] transition-opacity duration-300 ${
              isDarkTheme ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--home-accent-color)] blur-3xl transition-opacity duration-300 ${
              isDarkTheme ? "opacity-20" : "opacity-0"
            }`}
          />
          <div
            className={`pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-[var(--apollon-guide-horizontal)] blur-3xl transition-opacity duration-300 ${
              isDarkTheme ? "opacity-14" : "opacity-0"
            }`}
          />
          <div
            className={`pointer-events-none absolute inset-0 rounded-2xl bg-[color-mix(in_srgb,var(--home-bg-secondary)_52%,transparent)] transition-opacity duration-300 ${
              isDarkTheme ? "opacity-0" : "opacity-100"
            }`}
          />

          <div className="relative space-y-4">
            <span className="inline-flex items-center rounded-full border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
              UML Workspace
            </span>

            {hasDiagrams ? (
              <>
                <h1 className="max-w-3xl text-2xl font-semibold leading-tight md:text-3xl">
                  Welcome back. Pick up your diagrams and keep building
                  momentum.
                </h1>
                <p className="max-w-2xl text-sm text-[var(--home-text-secondary)] md:text-base">
                  Create a diagram to start fresh, import a diagram JSON from
                  your local files, or open your most recent diagram{" "}
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold text-[var(--home-text-primary)] ${
                      isDarkTheme
                        ? "bg-[color-mix(in_srgb,var(--home-accent-color)_38%,#0b1320)]"
                        : "bg-[var(--home-accent-soft)]"
                    }`}
                  >
                    {latestDiagramLabel}
                  </span>{" "}
                  to continue exactly where you left off.
                </p>

                <div
                  ref={createMenuContainerRef}
                  className="relative flex flex-wrap items-center gap-3 pt-1"
                >
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isCreateMenuOpen}
                    onClick={handleToggleCreateMenu}
                    className={heroPrimaryButtonClass}
                  >
                    <PlusIcon />
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={handleImportFromJson}
                    className={heroSecondaryButtonClass}
                  >
                    <ImportDiagramIcon />
                    Import Diagram JSON
                  </button>
                  {latestDiagramId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/local/${latestDiagramId}`)}
                      className={heroSecondaryButtonClass}
                    >
                      <OpenDiagramIcon />
                      Open Most Recent Diagram
                    </button>
                  )}
                  {isCreateMenuOpen && (
                    <div className="absolute left-0 top-full z-40 mt-2 w-60 rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-1 shadow-lg transition-colors duration-200">
                      <div className="space-y-1">
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--home-text-secondary)] transition-colors duration-200 hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                          onClick={handleOpenNewDiagramModal}
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--home-accent-color)]"
                            aria-hidden="true"
                          >
                            <NewDiagramIcon />
                          </span>
                          <span className="whitespace-nowrap">
                            Create New Diagram
                          </span>
                        </button>
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--home-text-secondary)] transition-colors duration-200 hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                          onClick={handleOpenTemplateModal}
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--home-accent-color)]"
                            aria-hidden="true"
                          >
                            <TemplateIcon />
                          </span>
                          <span className="whitespace-nowrap">
                            Start from Template
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="inline-flex rounded-full border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-2.5 py-1 text-[var(--home-text-secondary)]">
                    Local: {diagramCount}
                  </span>
                  <span className="inline-flex rounded-full border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-2.5 py-1 text-[var(--home-text-secondary)]">
                    Shared: {sharedDiagramCount}
                  </span>
                  <span className="inline-flex rounded-full border border-[var(--home-border-color)] bg-[var(--home-chip-bg)] px-2.5 py-1 font-semibold text-[var(--home-chip-text)]">
                    Total: {totalDiagramCount}
                  </span>
                </div>
              </>
            ) : (
              <>
                <h1 className="max-w-3xl text-2xl font-semibold leading-tight md:text-4xl">
                  Model architecture clearly, review it faster, and keep your
                  team aligned.
                </h1>
                <p className="max-w-2xl text-sm text-[var(--home-text-secondary)] md:text-base">
                  Apollon gives you fast diagram creation, template starters,
                  and recent context so you can move from idea to design
                  decisions without friction.
                </p>

                <div
                  ref={createMenuContainerRef}
                  className="relative flex flex-wrap items-center gap-3 pt-1"
                >
                  <button
                    type="button"
                    onClick={() => scrollToAnchor("new")}
                    className={heroPrimaryButtonClass}
                  >
                    Create New Diagram
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToAnchor("template")}
                    className={heroSecondaryButtonClass}
                  >
                    Start from Template
                  </button>
                </div>
              </>
            )}
          </div>

          <input
            ref={importFileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFileChange}
          />
        </section>

        {!hasDiagrams ? (
          <>
            <section
              className={`relative mt-4 hidden rounded-xl border border-[var(--home-border-color)] bg-[var(--home-bg-primary)]/90 p-2 backdrop-blur transition-[opacity,transform,background-color,border-color] duration-700 md:sticky md:top-0 md:z-20 md:mt-5 md:block md:p-2.5 ${appearClass}`}
              style={{ transitionDelay: "80ms" }}
            >
              <div className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(90deg,color-mix(in_srgb,var(--home-accent-color)_10%,transparent),transparent_35%,color-mix(in_srgb,var(--apollon-guide-horizontal)_8%,transparent))]" />
              <ul className="relative z-10 grid grid-cols-3 gap-2">
                {homeNavItems.map((item) => {
                  const isActive = activeAnchor === item.id
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => scrollToAnchor(item.id)}
                        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2 ${
                          isActive
                            ? "border-[var(--home-accent-color)] bg-[var(--home-accent-color)] text-white"
                            : "border-transparent text-[var(--home-text-secondary)] hover:border-[var(--home-accent-color)] hover:bg-[var(--home-accent-color)] hover:text-white"
                        }`}
                      >
                        {item.icon}
                        <span className="hidden sm:inline">{item.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>

            <HomeDiagramSections
              appearClass={appearClass}
              newDiagramRef={newDiagramRef}
              recentRef={recentRef}
              newDiagramIcon={<NewDiagramIcon />}
              recentIcon={<RecentIcon />}
            >
              <section
                ref={templateRef}
                className={`mt-10 scroll-mt-28 space-y-4 transition-[opacity,transform,color] duration-700 ${appearClass}`}
                style={{ transitionDelay: "170ms" }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
                  <span className="text-[var(--home-accent-color)]">
                    <TemplateIcon />
                  </span>
                  Accelerate Setup
                </div>
                <h2 className="text-xl font-semibold">
                  2. Start from Template
                </h2>
                <p className="text-sm text-[var(--home-text-secondary)]">
                  Pick a proven pattern and start editing immediately.
                </p>
                <div className="relative rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-6 transition-colors duration-200">
                  <div className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_85%_10%,color-mix(in_srgb,var(--apollon-guide-horizontal)_12%,transparent),transparent_55%)]" />
                  <div className="relative z-10 grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() =>
                          void handleCreateFromTemplate(template.id)
                        }
                        className="group flex cursor-pointer flex-col items-start gap-2 rounded-md border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] p-4 text-left transition-colors duration-200 hover:border-[var(--home-accent-color)] hover:bg-[var(--home-accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="inline-flex rounded-full border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-2 py-0.5 text-xs text-[var(--home-text-secondary)] transition-colors duration-200 group-hover:border-[var(--home-border-color)] group-hover:bg-[var(--home-bg-secondary)] group-hover:text-[var(--home-text-secondary)]">
                            {template.category}
                          </span>
                          {template.highlight && (
                            <span className="rounded-full border border-[var(--home-accent-color)] bg-[var(--home-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--home-accent-color)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              {template.highlight}
                            </span>
                          )}
                        </div>
                        <p className="text-base font-semibold text-[var(--home-text-primary)] transition-colors duration-200">
                          {template.id}
                        </p>
                        <p className="text-sm text-[var(--home-text-secondary)] transition-colors duration-200">
                          Create diagram from the {template.id} pattern
                          template.
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </HomeDiagramSections>
          </>
        ) : (
          <section
            className={`mt-7 space-y-4 transition-[opacity,transform] duration-700 ${appearClass}`}
            style={{ transitionDelay: "80ms" }}
          >
            <div className="flex items-center gap-2 text-base font-semibold text-[var(--home-text-secondary)] md:text-lg">
              <span className="text-[var(--home-accent-color)]">
                <RecentIcon />
              </span>
              <span className="text-[var(--home-text-primary)]">
                Recent Diagrams
              </span>
            </div>
            <Suspense
              fallback={
                <div className="text-sm text-[var(--home-text-secondary)]">
                  Loading diagrams...
                </div>
              }
            >
              <DiagramGallery />
            </Suspense>
          </section>
        )}
      </main>

      {!hasDiagrams && (
        <nav
          aria-label="Page sections"
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--home-border-color)] bg-[var(--home-bg-primary)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur transition-colors duration-200 md:hidden"
        >
          <ul className="grid grid-cols-3 gap-2">
            {homeNavItems.map((item) => {
              const isActive = activeAnchor === item.id
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => scrollToAnchor(item.id)}
                    className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2 ${
                      isActive
                        ? "border-[var(--home-accent-color)] bg-[var(--home-accent-color)] text-white"
                        : "border-transparent text-[var(--home-text-secondary)] hover:border-[var(--home-accent-color)] hover:bg-[var(--home-accent-color)] hover:text-white"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </div>
  )
}
