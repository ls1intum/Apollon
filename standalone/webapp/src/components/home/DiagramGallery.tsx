import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import type { UMLDiagramType, UMLModel } from "@tumaet/apollon"
import { useNavigate } from "react-router"
import { DiagramView } from "@/types"
import { playgroundModelId } from "@/constants/playgroundDefaultDiagram"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useDiagramThumbnailWarmup } from "@/hooks/useDiagramThumbnailWarmup"
import { DiagramAPIManager } from "@/services/DiagramAPIManager"
import {
  getSharedDiagramEntries,
  removeSharedDiagramEntry,
  toggleSharedDiagramFavorite,
} from "@/utils/sharedDiagramStorage"
import {
  DiagramActionsMenu,
  DiagramCard,
  type DiagramSource,
  type RecentDiagram,
} from "./DiagramCard"
import { getDiagramTypeLabel } from "./DiagramTypeGrid"
import { SegmentedControl } from "./SegmentedControl"

const normalize = (value: string) => value.trim().toLowerCase()
const INITIAL_VISIBLE_COUNT = 9
const LOAD_MORE_STEP = 9
const LOAD_MORE_DELAY_MS = 180

type DiagramTypeFilter = "all" | UMLDiagramType
type DiagramSortBy = "alphabetical" | "dateCreated" | "lastViewed"
type DiagramOrder = "oldest" | "newest"
type DiagramViewMode = "grid" | "table"

type GalleryDiagram = RecentDiagram & {
  model: UMLModel
  source: DiagramSource
  createdAt: string
  lastViewedAt: string
}

const isDiagramEmpty = (diagram: GalleryDiagram) =>
  diagram.model.nodes.length === 0 && diagram.model.edges.length === 0

const sortByLastModifiedDesc = (a: GalleryDiagram, b: GalleryDiagram) =>
  new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime()

const parseDate = (value: string) => {
  const parsedDate = new Date(value)
  const timestamp = parsedDate.getTime()
  return Number.isNaN(timestamp) ? null : parsedDate
}

const toDateMs = (value: string) => {
  const parsedDate = parseDate(value)
  return parsedDate ? parsedDate.getTime() : null
}

const formatDate = (value: string) => {
  const parsedDate = parseDate(value)
  if (!parsedDate) {
    return "Unknown date"
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const getDiagramSortValue = (diagram: GalleryDiagram, sortBy: DiagramSortBy) => {
  if (sortBy === "dateCreated") {
    return toDateMs(diagram.createdAt) ?? Number.NEGATIVE_INFINITY
  }

  if (sortBy === "lastViewed") {
    return toDateMs(diagram.lastViewedAt) ?? Number.NEGATIVE_INFINITY
  }

  return normalize(diagram.title)
}

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

const GridViewIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
    <rect x="14" y="4" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
    <rect x="4" y="14" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
    <rect x="14" y="14" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
  </svg>
)

const TableViewIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="4" width="17" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.5 9.5H20.5M3.5 15H20.5M10 4V20" stroke="currentColor" strokeWidth="1.7" />
  </svg>
)

type DiagramGalleryProps = {
  initialSearchTerm?: string
}

export const DiagramGallery = ({
  initialSearchTerm = "",
}: DiagramGalleryProps) => {
  const navigate = useNavigate()
  const models = usePersistenceModelStore((state) => state.models)
  const toggleFavorite = usePersistenceModelStore((state) => state.toggleFavorite)
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [selectedDiagramType, setSelectedDiagramType] =
    useState<DiagramTypeFilter>("all")
  const [sortBy, setSortBy] = useState<DiagramSortBy>("lastViewed")
  const [sortOrder, setSortOrder] = useState<DiagramOrder>("newest")
  const [viewMode, setViewMode] = useState<DiagramViewMode>("grid")
  const [diagramSource, setDiagramSource] = useState<DiagramSource>("local")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const [sharedDiagrams, setSharedDiagrams] = useState<GalleryDiagram[]>([])
  const [isSharedDiagramsLoading, setIsSharedDiagramsLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isObserverActive, setIsObserverActive] = useState(true)
  const prevAllDiagramsLengthRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadTimeoutRef = useRef<number | null>(null)
  const typeMenuContainerRef = useRef<HTMLDivElement>(null)
  const sortMenuContainerRef = useRef<HTMLDivElement>(null)

  const localDiagrams = useMemo<GalleryDiagram[]>(() => {
    return Object.entries(models)
      .filter(([id]) => id !== playgroundModelId)
      .map(([id, persistentModelEntity]) => ({
        id,
        title: persistentModelEntity.model.title,
        type: persistentModelEntity.model.type,
        lastModifiedAt: persistentModelEntity.lastModifiedAt,
        favorite: persistentModelEntity.favorite ?? false,
        model: persistentModelEntity.model,
        source: "local" as const,
        createdAt: persistentModelEntity.lastModifiedAt,
        lastViewedAt: persistentModelEntity.lastModifiedAt,
      }))
      .sort(sortByLastModifiedDesc)
  }, [models])

  useEffect(() => {
    if (diagramSource !== "shared") {
      return
    }

    let isSubscribed = true

    const loadSharedDiagrams = async () => {
      setIsSharedDiagramsLoading(true)
      const entries = getSharedDiagramEntries()

      if (entries.length === 0) {
        if (isSubscribed) {
          setSharedDiagrams([])
          setIsSharedDiagramsLoading(false)
        }
        return
      }

      const staleSharedIds: string[] = []
      const diagramsById = new Map<string, GalleryDiagram>()

      await Promise.all(
        entries.map(async (entry) => {
          try {
            const storedDiagram = await DiagramAPIManager.fetchStoredDiagram(
              entry.id
            )
            if (!storedDiagram) {
              staleSharedIds.push(entry.id)
              return
            }

            diagramsById.set(entry.id, {
              id: storedDiagram.id,
              title: storedDiagram.title,
              type: storedDiagram.type,
              lastModifiedAt:
                storedDiagram.updatedAt || storedDiagram.createdAt || entry.sharedAt,
              favorite: entry.favorite ?? false,
              source: "shared",
              model: storedDiagram,
              createdAt: storedDiagram.createdAt || entry.sharedAt,
              lastViewedAt:
                storedDiagram.updatedAt ||
                storedDiagram.createdAt ||
                entry.sharedAt,
            })
          } catch {
            // Keep the id in local storage and skip this entry for now.
          }
        })
      )

      for (const staleSharedId of staleSharedIds) {
        removeSharedDiagramEntry(staleSharedId)
      }

      const orderedSharedDiagrams = entries
        .map((entry) => diagramsById.get(entry.id))
        .filter((diagram): diagram is GalleryDiagram => Boolean(diagram))
        .sort(sortByLastModifiedDesc)

      if (isSubscribed) {
        setSharedDiagrams(orderedSharedDiagrams)
        setIsSharedDiagramsLoading(false)
      }
    }

    void loadSharedDiagrams()

    return () => {
      isSubscribed = false
    }
  }, [diagramSource])

  const allDiagrams = diagramSource === "local" ? localDiagrams : sharedDiagrams
  const diagramTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(allDiagrams.map((diagram) => diagram.type))
      ).sort((firstType, secondType) =>
        getDiagramTypeLabel(firstType).localeCompare(getDiagramTypeLabel(secondType))
      ),
    [allDiagrams]
  )

  const filteredDiagrams = useMemo(() => {
    const normalizedSearchTerm = normalize(searchTerm)
    const sortedDiagrams = allDiagrams
      .filter((diagram) => {
        const matchesSearch =
          normalizedSearchTerm.length === 0 ||
          normalize(diagram.title).includes(normalizedSearchTerm)
        const matchesType =
          selectedDiagramType === "all" || diagram.type === selectedDiagramType
        const matchesFavorite = !showFavoritesOnly || diagram.favorite

        return matchesSearch && matchesType && matchesFavorite
      })
      .sort((firstDiagram, secondDiagram) => {
        if (sortBy === "alphabetical") {
          const titleComparison = String(
            getDiagramSortValue(firstDiagram, sortBy)
          ).localeCompare(String(getDiagramSortValue(secondDiagram, sortBy)))
          return sortOrder === "oldest" ? titleComparison : -titleComparison
        }

        const firstValue = Number(getDiagramSortValue(firstDiagram, sortBy))
        const secondValue = Number(getDiagramSortValue(secondDiagram, sortBy))
        const chronologicalComparison = firstValue - secondValue
        return sortOrder === "oldest"
          ? chronologicalComparison
          : -chronologicalComparison
      })

    return sortedDiagrams
  }, [allDiagrams, searchTerm, selectedDiagramType, showFavoritesOnly, sortBy, sortOrder])

  const deferredFilteredDiagrams = useDeferredValue(filteredDiagrams)
  const isPending = deferredFilteredDiagrams !== filteredDiagrams

  useEffect(() => {
    if (prevAllDiagramsLengthRef.current === 0) {
      prevAllDiagramsLengthRef.current = allDiagrams.length
      return
    }

    if (allDiagrams.length < prevAllDiagramsLengthRef.current) {
      setVisibleCount(INITIAL_VISIBLE_COUNT)
    }
    prevAllDiagramsLengthRef.current = allDiagrams.length
  }, [allDiagrams.length])

  useEffect(() => {
    if (loadTimeoutRef.current !== null) {
      window.clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }

    setIsLoadingMore(false)

    return () => {
      if (loadTimeoutRef.current !== null) {
        window.clearTimeout(loadTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (deferredFilteredDiagrams.length === 0) {
      setVisibleCount(INITIAL_VISIBLE_COUNT)
      return
    }

    setVisibleCount((current) =>
      Math.min(
        Math.max(current, INITIAL_VISIBLE_COUNT),
        deferredFilteredDiagrams.length
      )
    )
  }, [deferredFilteredDiagrams.length])

  useEffect(() => {
    if (loadTimeoutRef.current !== null) {
      window.clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }
    setIsLoadingMore(false)
    setIsObserverActive(true)
  }, [diagramSource, searchTerm, selectedDiagramType, showFavoritesOnly, sortBy, sortOrder, viewMode])

  useEffect(() => {
    if (!isTypeMenuOpen && !isSortMenuOpen) {
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const clickTarget = event.target as Node

      if (!typeMenuContainerRef.current?.contains(clickTarget)) {
        setIsTypeMenuOpen(false)
      }

      if (!sortMenuContainerRef.current?.contains(clickTarget)) {
        setIsSortMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [isTypeMenuOpen, isSortMenuOpen])

  const hasActiveFilters =
    searchTerm.trim().length > 0 || selectedDiagramType !== "all"
  const shownCountLabel = `${filteredDiagrams.length} ${
    filteredDiagrams.length === 1 ? "diagram" : "diagrams"
  }`
  const totalCountLabel = `${allDiagrams.length} ${
    allDiagrams.length === 1 ? "diagram" : "diagrams"
  }`
  const summaryCountLabel = hasActiveFilters
    ? `Showing ${shownCountLabel} of ${totalCountLabel}`
    : `Showing ${totalCountLabel}`
  const visibleDiagrams = deferredFilteredDiagrams.slice(0, visibleCount)
  const hasMoreDiagrams = deferredFilteredDiagrams.length > visibleCount
  const sortByLabel =
    sortBy === "alphabetical"
      ? "Alphabetical"
      : sortBy === "dateCreated"
      ? "Date created"
      : "Last viewed"
  const sortOrderLabel =
    sortOrder === "oldest" ? "Oldest first" : "Newest first"
  const selectedDiagramTypeLabel =
    selectedDiagramType === "all"
      ? "All diagram types"
      : getDiagramTypeLabel(selectedDiagramType)
  const controlHeightClass = "h-9"
  const controlTextClass = "text-xs font-semibold"

  const loadingThumbnailIds = useDiagramThumbnailWarmup({
    visibleDiagrams: diagramSource === "local" ? visibleDiagrams : [],
    isPending,
    isDiagramEmpty,
  })

  const handleOpenDiagram = (diagram: GalleryDiagram) => {
    if (diagram.source === "local") {
      navigate(`/local/${diagram.id}`)
      return
    }

    navigate(`/shared/${diagram.id}?view=${DiagramView.EDIT}`)
  }

  const handleToggleDiagramFavorite = (diagram: RecentDiagram) => {
    if ((diagram.source ?? "local") === "local") {
      toggleFavorite(diagram.id)
      return
    }

    toggleSharedDiagramFavorite(diagram.id)
    setSharedDiagrams((currentDiagrams) =>
      currentDiagrams.map((currentDiagram) =>
        currentDiagram.id === diagram.id
          ? { ...currentDiagram, favorite: !currentDiagram.favorite }
          : currentDiagram
      )
    )
  }

  const scrollToTypeGrid = () => {
    const target = document.getElementById("new-diagram-section")
    if (target) {
      // This depends on <main> being the scroll root on the home page.
      target.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  useEffect(() => {
    if (!hasMoreDiagrams || !isObserverActive || isLoadingMore || isPending) {
      return
    }

    const target = sentinelRef.current
    if (!target) {
      return
    }

    const scrollRoot = target.closest(".home-page-scrollbar")
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry?.isIntersecting) {
          return
        }

        setIsObserverActive(false)
        setIsLoadingMore(true)
        loadTimeoutRef.current = window.setTimeout(() => {
          setVisibleCount((current) =>
            Math.min(current + LOAD_MORE_STEP, deferredFilteredDiagrams.length)
          )
          setIsLoadingMore(false)
          setIsObserverActive(true)
        }, LOAD_MORE_DELAY_MS)
      },
      {
        root: scrollRoot,
        rootMargin: "280px 0px",
        threshold: 0.01,
      }
    )

    observer.observe(target)
    return () => {
      observer.disconnect()
    }
  }, [
    deferredFilteredDiagrams.length,
    hasMoreDiagrams,
    isLoadingMore,
    isObserverActive,
    isPending,
  ])

  return (
    <div className="rounded-xl border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-6 transition-colors duration-200">
      <div className="space-y-5">
        <div className="space-y-3">
          <label className="sr-only" htmlFor="recent-diagrams-search">
            Search diagrams
          </label>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <span
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--home-text-secondary)]"
                aria-hidden="true"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M16.5 16.5L21 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                id="recent-diagrams-search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setVisibleCount(INITIAL_VISIBLE_COUNT)
                }}
                placeholder="Search diagrams by name"
                className="h-10 w-full rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-primary)] py-2 pl-10 pr-3 text-sm text-[var(--home-text-primary)] outline-none transition-colors duration-200 placeholder:text-[var(--home-text-secondary)] focus:border-[var(--home-accent-color)]"
              />
            </div>
            <div className="flex items-center gap-2 self-start lg:self-center">
              <span className="rounded-full border border-[var(--home-border-color)] bg-[var(--home-chip-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--home-chip-text)] transition-colors duration-200">
                {summaryCountLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <SegmentedControl
              className="w-fit max-w-full self-start"
              sizeClassName={controlHeightClass}
              itemClassName={`px-3 ${controlTextClass}`}
              options={[
                { value: "local", label: "Local diagrams" },
                { value: "shared", label: "Shared diagrams" },
              ]}
              value={diagramSource}
              onChange={(nextSource) => setDiagramSource(nextSource)}
            />
            <button
              type="button"
              aria-pressed={showFavoritesOnly}
              onClick={() => {
                setShowFavoritesOnly((current) => !current)
                setVisibleCount(INITIAL_VISIBLE_COUNT)
              }}
              className={`inline-flex ${controlHeightClass} cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2 ${
                showFavoritesOnly
                  ? "border-[var(--home-favorite-border)] bg-[var(--home-favorite-bg)] text-[var(--home-favorite-star)]"
                  : "border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] text-[var(--home-text-secondary)] hover:border-[var(--home-accent-color)] hover:text-[var(--home-text-primary)]"
              }`}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill={showFavoritesOnly ? "currentColor" : "none"}
                aria-hidden="true"
              >
                <path
                  d="M12 3.7l2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3.7z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
              Favorites
            </button>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:w-auto md:flex-wrap md:items-center md:justify-end">
            <label className="sr-only" htmlFor="diagram-type-filter-button">
              Filter by diagram type
            </label>
            <div ref={typeMenuContainerRef} className="relative w-full sm:w-auto">
              <button
                id="diagram-type-filter-button"
                type="button"
                aria-haspopup="menu"
                aria-expanded={isTypeMenuOpen}
                onClick={() => {
                  setIsTypeMenuOpen((current) => !current)
                  setIsSortMenuOpen(false)
                }}
                className={`flex ${controlHeightClass} w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-[var(--home-border-color)] bg-[var(--home-bg-primary)] px-2.5 text-xs text-[var(--home-text-primary)] transition-colors duration-200 hover:border-[var(--home-accent-color)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2 sm:min-w-[170px]`}
              >
                <span className="truncate">{selectedDiagramTypeLabel}</span>
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-[var(--home-text-secondary)]"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isTypeMenuOpen && (
                <div className="absolute left-0 z-40 mt-2 w-60 rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-2 shadow-lg transition-colors duration-200">
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
                    Diagram type
                  </p>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDiagramType("all")
                        setVisibleCount(INITIAL_VISIBLE_COUNT)
                        setIsTypeMenuOpen(false)
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-200 ${
                        selectedDiagramType === "all"
                          ? "bg-[var(--home-accent-soft)] text-[var(--home-text-primary)]"
                          : "text-[var(--home-text-secondary)] hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)]"
                      }`}
                    >
                      <span>All diagram types</span>
                      {selectedDiagramType === "all" ? (
                        <span className="text-[var(--home-accent-color)]">
                          Selected
                        </span>
                      ) : null}
                    </button>
                    {diagramTypeOptions.map((diagramType) => (
                      <button
                        key={diagramType}
                        type="button"
                        onClick={() => {
                          setSelectedDiagramType(diagramType)
                          setVisibleCount(INITIAL_VISIBLE_COUNT)
                          setIsTypeMenuOpen(false)
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-200 ${
                          selectedDiagramType === diagramType
                            ? "bg-[var(--home-accent-soft)] text-[var(--home-text-primary)]"
                            : "text-[var(--home-text-secondary)] hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)]"
                        }`}
                      >
                        <span>{getDiagramTypeLabel(diagramType)}</span>
                        {selectedDiagramType === diagramType ? (
                          <span className="text-[var(--home-accent-color)]">
                            Selected
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div ref={sortMenuContainerRef} className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsSortMenuOpen((current) => !current)}
                className={`flex ${controlHeightClass} w-full cursor-pointer items-center gap-2 rounded-md border border-[var(--home-border-color)] bg-[var(--home-bg-primary)] px-2.5 text-xs text-[var(--home-text-primary)] transition-colors duration-200 hover:border-[var(--home-accent-color)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2`}
              >
                <span className="min-w-0 truncate">{sortByLabel}</span>
                <span className="hidden text-[var(--home-text-secondary)] sm:inline">
                  {sortOrderLabel}
                </span>
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-[var(--home-text-secondary)]"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isSortMenuOpen && (
                <div className="absolute left-0 z-40 mt-2 w-60 rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-2 shadow-lg transition-colors duration-200">
                  <div>
                    <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
                      Sort by
                    </p>
                    {(
                      [
                        ["alphabetical", "Alphabetical"],
                        ["dateCreated", "Date created"],
                        ["lastViewed", "Last viewed"],
                      ] as const
                    ).map(([optionValue, optionLabel]) => (
                      <button
                        key={optionValue}
                        type="button"
                        onClick={() => {
                          setSortBy(optionValue)
                          setVisibleCount(INITIAL_VISIBLE_COUNT)
                          setIsSortMenuOpen(false)
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-200 ${
                          sortBy === optionValue
                            ? "bg-[var(--home-accent-soft)] text-[var(--home-text-primary)]"
                            : "text-[var(--home-text-secondary)] hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)]"
                        }`}
                      >
                        <span>{optionLabel}</span>
                        {sortBy === optionValue ? (
                          <span className="text-[var(--home-accent-color)]">
                            Selected
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                  <div className="my-2 h-px bg-[var(--home-border-color)]" />
                  <div>
                    <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
                      Order
                    </p>
                    {(
                      [
                        ["oldest", "Oldest first"],
                        ["newest", "Newest first"],
                      ] as const
                    ).map(([optionValue, optionLabel]) => (
                      <button
                        key={optionValue}
                        type="button"
                        onClick={() => {
                          setSortOrder(optionValue)
                          setVisibleCount(INITIAL_VISIBLE_COUNT)
                          setIsSortMenuOpen(false)
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-200 ${
                          sortOrder === optionValue
                            ? "bg-[var(--home-accent-soft)] text-[var(--home-text-primary)]"
                            : "text-[var(--home-text-secondary)] hover:bg-[var(--home-bg-secondary)] hover:text-[var(--home-text-primary)]"
                        }`}
                      >
                        <span>{optionLabel}</span>
                        {sortOrder === optionValue ? (
                          <span className="text-[var(--home-accent-color)]">
                            Selected
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <SegmentedControl
              className="w-fit"
              sizeClassName={controlHeightClass}
              itemClassName="w-8 px-0"
              options={[
                { value: "grid", icon: <GridViewIcon />, ariaLabel: "Grid view" },
                { value: "table", icon: <TableViewIcon />, ariaLabel: "Table view" },
              ]}
              value={viewMode}
              onChange={(nextViewMode) => setViewMode(nextViewMode)}
            />
          </div>
        </div>

        {isSharedDiagramsLoading && diagramSource === "shared" ? (
          <div className="flex items-center justify-center rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-4 py-8 text-sm text-[var(--home-text-secondary)] transition-colors duration-200">
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[var(--home-border-color)] border-t-[var(--home-accent-color)]" />
            Loading shared diagrams...
          </div>
        ) : allDiagrams.length === 0 ? (
          <div className="flex min-h-96 flex-col items-center justify-center gap-4 text-center text-[var(--home-text-secondary)] transition-colors duration-200">
            <EmptyStateIllustration />
            <p className="text-lg font-semibold text-[var(--home-text-primary)] transition-colors duration-200">
              {diagramSource === "local"
                ? "No local diagrams yet"
                : "No shared diagrams yet"}
            </p>
            {diagramSource === "local" ? (
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-[var(--home-accent-color)] bg-[var(--home-accent-color)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2"
                onClick={scrollToTypeGrid}
              >
                Create your first diagram
              </button>
            ) : (
              <p className="max-w-md text-sm">
                Share a local diagram to see it listed here.
              </p>
            )}
          </div>
        ) : (
          <>
            {filteredDiagrams.length > 0 ? (
              <>
                {viewMode === "grid" ? (
                  <div
                    role="list"
                    className={`grid grid-cols-1 gap-4 transition-opacity duration-150 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isPending ? "opacity-50" : ""}`}
                  >
                    {visibleDiagrams.map((diagram) => (
                      <DiagramCard
                        key={diagram.id}
                        diagram={diagram}
                        showPlaceholderIcon={isDiagramEmpty(diagram)}
                        isThumbnailLoading={Boolean(loadingThumbnailIds[diagram.id])}
                        onToggleFavorite={handleToggleDiagramFavorite}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className={`overflow-hidden rounded-lg border border-[var(--home-border-color)] transition-opacity duration-150 ${isPending ? "opacity-50" : ""}`}
                  >
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-0 text-left">
                      <thead className="bg-[var(--home-bg-secondary)]">
                        <tr>
                          <th className="w-10 px-3 py-2 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
                            <span className="sr-only">Favorite</span>
                          </th>
                          <th className="px-3 py-2 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
                            Name
                          </th>
                          <th className="hidden px-3 py-2 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-secondary)] md:table-cell">
                            Type
                          </th>
                          <th className="px-3 py-2 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
                            Last viewed
                          </th>
                          <th className="hidden px-3 py-2 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-secondary)] lg:table-cell">
                            Source
                          </th>
                          <th className="px-3 py-2 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-secondary)]">
                            Action
                          </th>
                        </tr>
                      </thead>
                        <tbody>
                          {visibleDiagrams.map((diagram) => {
                            const title = diagram.title.trim() || "Untitled Diagram"
                            return (
                              <tr
                                key={diagram.id}
                                className="cursor-pointer border-t border-[var(--home-border-color)] transition-colors duration-200 hover:bg-[var(--home-accent-soft)]"
                                onClick={() => handleOpenDiagram(diagram)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault()
                                    handleOpenDiagram(diagram)
                                  }
                                }}
                                tabIndex={0}
                              >
                                <td className="px-3 py-2 align-middle">
                                  <button
                                    type="button"
                                    aria-label={
                                      diagram.favorite
                                        ? "Remove from favorites"
                                        : "Add to favorites"
                                    }
                                    className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-color)] focus-visible:outline-offset-2 ${
                                      diagram.favorite
                                        ? "border-[var(--home-favorite-border)] bg-[var(--home-favorite-bg)] text-[var(--home-favorite-star)]"
                                        : "border-[var(--home-border-color)] bg-[var(--home-bg-primary)] text-[var(--home-text-secondary)] hover:border-[var(--home-accent-color)] hover:text-[var(--home-accent-color)]"
                                    }`}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleToggleDiagramFavorite(diagram)
                                    }}
                                    onKeyDown={(event) => event.stopPropagation()}
                                  >
                                    <svg
                                      className="h-3.5 w-3.5"
                                      viewBox="0 0 24 24"
                                      fill={diagram.favorite ? "currentColor" : "none"}
                                      aria-hidden="true"
                                    >
                                      <path
                                        d="M12 3.7l2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3.7z"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                </td>
                                <td className="px-3 py-2 align-middle text-sm text-[var(--home-text-primary)]">
                                  {title}
                                </td>
                                <td className="hidden px-3 py-2 align-middle text-xs text-[var(--home-text-secondary)] md:table-cell">
                                  {getDiagramTypeLabel(diagram.type)}
                                </td>
                                <td className="px-3 py-2 align-middle text-xs text-[var(--home-text-secondary)]">
                                  {formatDate(diagram.lastViewedAt)}
                                </td>
                                <td className="hidden px-3 py-2 align-middle text-xs text-[var(--home-text-secondary)] lg:table-cell">
                                  {diagram.source === "local" ? "Local" : "Shared"}
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  <DiagramActionsMenu
                                    diagram={diagram}
                                    containerClassName="relative inline-flex items-center"
                                    menuClassName="absolute right-0 top-full z-40 mt-2 w-52 rounded-lg border border-[var(--home-border-color)] bg-[var(--home-bg-card)] p-1 shadow-lg transition-colors duration-200"
                                    stopPropagation
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-4 py-10 text-center text-sm text-[var(--home-text-secondary)] transition-colors duration-200">
                No diagrams match your search and filters.
              </div>
            )}

            {filteredDiagrams.length > 0 && (
              <div ref={sentinelRef} aria-hidden="true" className="h-0.5 w-full" />
            )}

            {isLoadingMore && (
              <div className="flex items-center justify-center pt-1 text-xs text-[var(--home-text-secondary)] transition-colors duration-200">
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[var(--home-border-color)] border-t-[var(--home-accent-color)]" />
                Loading more diagrams...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
