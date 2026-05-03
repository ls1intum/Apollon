import { useMemo, type ReactElement } from "react"
import { useNavigate } from "react-router"
import type { UMLModel } from "@tumaet/apollon"
import { toast } from "react-toastify"
import { useThemeStore } from "@/stores/useThemeStore"
import { log } from "@/logger"
import { DeferredHomeStats } from "@/components/home/DeferredHomeStats"
import { HomeDiagramSections } from "@/components/home/HomeDiagramSections"
import { HomeNavbar } from "@/components/navbar/HomeNavbar"
import { useHomeScrollSpy, type HomeAnchor } from "@/hooks/useHomeScrollSpy"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"

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

export const HomePage = () => {
  const navigate = useNavigate()
  const currentTheme = useThemeStore((state) => state.currentTheme)
  const isDarkTheme = currentTheme === "dark"

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

  const activeLabel = useMemo(
    () =>
      homeNavItems.find((item) => item.id === activeAnchor)?.label ??
      "New Diagram",
    [activeAnchor]
  )

  const appearClass = isReady
    ? "opacity-100 translate-y-0"
    : "opacity-0 translate-y-3"

  return (
    <div className="relative h-full overflow-hidden bg-[var(--home-bg-primary)] text-[var(--home-text-primary)] transition-colors duration-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,color-mix(in_srgb,var(--home-accent-color)_20%,transparent),transparent_52%),radial-gradient(circle_at_95%_100%,color-mix(in_srgb,var(--apollon-guide-horizontal)_16%,transparent),transparent_50%)]" />
      <HomeNavbar />

      <main
        ref={contentRef}
        className="home-page-scrollbar relative z-10 mx-auto h-[calc(100%-72px)] overflow-y-auto px-4 pb-24 pt-4 md:px-6 md:pb-10 md:pt-6"
      >
        <section
          className={`relative overflow-hidden rounded-2xl border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-5 transition-[opacity,transform,background-color,border-color,box-shadow] duration-700 md:p-8 ${
            isDarkTheme
              ? "shadow-[0_16px_32px_-24px_rgba(0,0,0,0.62),0_7px_14px_-10px_rgba(0,0,0,0.42)]"
              : "shadow-[0_14px_28px_-24px_rgba(24,38,52,0.18),0_6px_12px_-10px_rgba(24,38,52,0.12)]"
          } ${appearClass}`}
        >
          <div
            className={`pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--home-accent-color)_17%,transparent)_0%,transparent_52%,color-mix(in_srgb,var(--apollon-guide-horizontal)_14%,transparent)_100%)] transition-opacity duration-300 ${
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
            className={`pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--home-bg-secondary)_52%,transparent)] transition-opacity duration-300 ${
              isDarkTheme ? "opacity-0" : "opacity-100"
            }`}
          />

          <div className="relative space-y-4">
            <span className="inline-flex items-center rounded-full border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
              UML Workspace
            </span>
            <h1 className="max-w-3xl text-2xl font-semibold leading-tight md:text-4xl">
              Model architecture clearly, review it faster, and keep your team
              aligned.
            </h1>
            <p className="max-w-2xl text-sm text-[var(--home-text-secondary)] md:text-base">
              Apollon gives you fast diagram creation, template starters, and
              recent context so you can move from idea to design decisions
              without friction.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => scrollToAnchor("new")}
                className="cursor-pointer rounded-md border border-[var(--home-accent-color)] bg-[var(--home-accent-color)] px-4 py-2 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
              >
                Create New Diagram
              </button>
              <button
                type="button"
                onClick={() => scrollToAnchor("template")}
                className="cursor-pointer rounded-md border border-[var(--home-border-color)] bg-[var(--home-bg-primary)] px-4 py-2 text-sm font-semibold text-[var(--home-text-primary)] transition-colors duration-200 hover:bg-[var(--home-accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
              >
                Browse Templates
              </button>
              <span className="text-xs text-[var(--home-text-secondary)]">
                Currently viewing: {activeLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <DeferredHomeStats />
            </div>
          </div>
        </section>

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
            <h2 className="text-xl font-semibold">2. Start from Template</h2>
            <div className="relative rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-6 transition-colors duration-200">
              <div className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_85%_10%,color-mix(in_srgb,var(--apollon-guide-horizontal)_12%,transparent),transparent_55%)]" />
              <div className="relative z-10 grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => void handleCreateFromTemplate(template.id)}
                    className="group flex cursor-pointer flex-col items-start gap-2 rounded-md border border-[var(--home-border-color)] bg-[var(--home-bg-primary)] p-4 text-left transition-colors duration-200 hover:border-[var(--home-accent-color)] hover:bg-[var(--home-accent-color)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="inline-flex rounded-full border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-2 py-0.5 text-xs text-[var(--home-text-secondary)] transition-colors duration-200 group-hover:border-white/30 group-hover:bg-white/20 group-hover:text-white">
                        {template.category}
                      </span>
                      {template.highlight && (
                        <span className="rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          {template.highlight}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold text-[var(--home-text-primary)] transition-colors duration-200 group-hover:text-white">
                      {template.id}
                    </p>
                    <p className="text-sm text-[var(--home-text-secondary)] transition-colors duration-200 group-hover:text-white/90">
                      Create diagram from the {template.id} pattern template.
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </HomeDiagramSections>
      </main>

      <nav
        aria-label="Page sections"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--home-border-color)] bg-[var(--home-bg-primary)]/95 px-2 py-2 backdrop-blur transition-colors duration-200 md:hidden"
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
    </div>
  )
}
