import { useDeferredValue, useMemo, useState } from "react"
import type { UMLDiagramType } from "@tumaet/apollon"
import { playgroundModelId } from "@/constants/playgroundDefaultDiagram"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useRecentDiagramFilters } from "@/hooks/useRecentDiagramFilters"
import { getDiagramTypeLabel } from "./DiagramTypeGrid"
import { DiagramCard, type RecentDiagram } from "./DiagramCard"

const normalize = (value: string) => value.trim().toLowerCase()
const INITIAL_VISIBLE_COUNT = 24
const LOAD_MORE_STEP = 24

const sortByLastModifiedDesc = (a: RecentDiagram, b: RecentDiagram) =>
  new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime()

const EmptyStateIllustration = () => (
  <svg
    className="h-36 w-36 text-[var(--home-border-color)] transition-colors duration-200"
    viewBox="0 0 180 180"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="20"
      y="24"
      width="140"
      height="124"
      rx="10"
      stroke="currentColor"
      strokeWidth="4"
      strokeDasharray="8 8"
    />
    <rect
      x="42"
      y="52"
      width="46"
      height="32"
      rx="4"
      stroke="currentColor"
      strokeWidth="3"
    />
    <rect
      x="96"
      y="52"
      width="42"
      height="14"
      rx="4"
      fill="currentColor"
      fillOpacity="0.25"
    />
    <rect
      x="96"
      y="74"
      width="30"
      height="10"
      rx="4"
      fill="currentColor"
      fillOpacity="0.2"
    />
    <line
      x1="42"
      y1="103"
      x2="138"
      y2="103"
      stroke="currentColor"
      strokeWidth="3"
    />
    <line
      x1="42"
      y1="118"
      x2="120"
      y2="118"
      stroke="currentColor"
      strokeWidth="3"
    />
  </svg>
)

type DiagramGalleryProps = {
  initialSearchTerm?: string
}

export const DiagramGallery = ({
  initialSearchTerm = "",
}: DiagramGalleryProps) => {
  const models = usePersistenceModelStore((state) => state.models)
  const { searchTerm, selectedTypes, setSearch, toggleTypeFilter } =
    useRecentDiagramFilters(initialSearchTerm)

  const allDiagrams = useMemo<RecentDiagram[]>(() => {
    return Object.entries(models)
      .filter(([id]) => id !== playgroundModelId)
      .map(([id, persistentModelEntity]) => ({
        id,
        title: persistentModelEntity.model.title,
        type: persistentModelEntity.model.type,
        lastModifiedAt: persistentModelEntity.lastModifiedAt,
      }))
      .sort(sortByLastModifiedDesc)
  }, [models])

  const diagramTypes = useMemo<UMLDiagramType[]>(() => {
    return Array.from(new Set(allDiagrams.map((diagram) => diagram.type))).sort(
      (first, second) =>
        getDiagramTypeLabel(first).localeCompare(getDiagramTypeLabel(second))
    )
  }, [allDiagrams])

  const filteredDiagrams = useMemo(() => {
    const normalizedSearchTerm = normalize(searchTerm)

    return allDiagrams.filter((diagram) => {
      const matchesSearch =
        normalizedSearchTerm.length === 0 ||
        normalize(diagram.title).includes(normalizedSearchTerm)
      const matchesType =
        selectedTypes.length === 0 || selectedTypes.includes(diagram.type)
      return matchesSearch && matchesType
    })
  }, [allDiagrams, searchTerm, selectedTypes])

  const deferredFilteredDiagrams = useDeferredValue(filteredDiagrams)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)
  const isPending = deferredFilteredDiagrams !== filteredDiagrams

  const hasActiveFilters =
    searchTerm.trim().length > 0 || selectedTypes.length > 0
  const countLabel = hasActiveFilters
    ? `${filteredDiagrams.length}/${allDiagrams.length}`
    : `${allDiagrams.length}`
  const visibleDiagrams = deferredFilteredDiagrams.slice(0, visibleCount)
  const hasMoreDiagrams = deferredFilteredDiagrams.length > visibleCount

  const scrollToTypeGrid = () => {
    const target = document.getElementById("new-diagram-section")
    if (target) {
      // This depends on <main> being the scroll root on the home page.
      target.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="rounded-xl border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-6 transition-colors duration-200">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--home-text-primary)] transition-colors duration-200">
            Recent Diagrams
          </h3>
          <span className="rounded-full border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-2.5 py-1 text-xs font-semibold text-[var(--home-text-secondary)] transition-colors duration-200">
            {countLabel}
          </span>
        </div>

        <div>
          <label className="sr-only" htmlFor="recent-diagrams-search">
            Search recent diagrams
          </label>
          <input
            id="recent-diagrams-search"
            value={searchTerm}
            onChange={(event) => {
              setSearch(event.target.value)
              setVisibleCount(INITIAL_VISIBLE_COUNT)
            }}
            placeholder="Search recent diagrams by title..."
            className="w-full rounded-md border border-[var(--home-border-color)] bg-[var(--home-bg-primary)] px-3 py-2 text-sm text-[var(--home-text-primary)] outline-none transition-colors duration-200 placeholder:text-[var(--home-text-secondary)] focus:border-[var(--home-accent-color)]"
          />
        </div>

        {allDiagrams.length === 0 ? (
          <div className="flex min-h-96 flex-col items-center justify-center gap-4 text-center text-[var(--home-text-secondary)] transition-colors duration-200">
            <EmptyStateIllustration />
            <p className="text-lg font-semibold text-[var(--home-text-primary)] transition-colors duration-200">
              No diagrams yet
            </p>
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-[var(--home-accent-color)] bg-[var(--home-accent-color)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
              onClick={scrollToTypeGrid}
            >
              Create your first diagram
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {diagramTypes.map((type) => {
                const isActive = selectedTypes.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2 ${
                      isActive
                        ? "border-[var(--home-accent-color)] bg-[var(--home-accent-soft)] text-[var(--home-accent-color)] shadow-[inset_0_0_0_1px_var(--home-accent-color)]"
                        : "border-[var(--home-border-color)] bg-[var(--home-bg-primary)] text-[var(--home-text-secondary)] hover:border-[var(--home-accent-color)] hover:bg-[var(--home-accent-color)] hover:text-white"
                    }`}
                    onClick={() => {
                      toggleTypeFilter(type)
                      setVisibleCount(INITIAL_VISIBLE_COUNT)
                    }}
                  >
                    {getDiagramTypeLabel(type)}
                  </button>
                )
              })}
            </div>

            {filteredDiagrams.length > 0 ? (
              <div
                role="list"
                className={`grid grid-cols-1 gap-4 transition-opacity duration-150 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isPending ? "opacity-50" : ""}`}
              >
                {visibleDiagrams.map((diagram, index) => (
                  <DiagramCard
                    key={diagram.id}
                    diagram={diagram}
                    isMostRecent={index === 0}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-4 py-10 text-center text-sm text-[var(--home-text-secondary)] transition-colors duration-200">
                No diagrams match your search and filters.
              </div>
            )}

            {filteredDiagrams.length > 0 && hasMoreDiagrams && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((current) => current + LOAD_MORE_STEP)
                  }
                  className="cursor-pointer rounded-md border border-[var(--home-border-color)] bg-[var(--home-bg-primary)] px-4 py-2 text-sm font-medium text-[var(--home-text-primary)] transition-colors duration-200 hover:bg-[var(--home-accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
