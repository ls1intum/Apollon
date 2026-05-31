import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { DiagramGallerySkeleton } from "@/components/home/DiagramGallerySkeleton"
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
  buildSharedDiagramPath,
  getSharedDiagramViewBadge,
} from "@/utils/sharedDiagramLinks"
import {
  DiagramActionsMenu,
  DiagramCard,
  type DiagramSource,
  type RecentDiagram,
} from "./DiagramCard"
import { getDiagramTypeLabel } from "./diagramTypeMeta"
import { SegmentedControl } from "./SegmentedControl"
import { DropdownFilterMenu } from "./DropdownFilterMenu"

const normalize = (value: string) => value.trim().toLowerCase()
const INITIAL_VISIBLE_COUNT = 9
const LOAD_MORE_STEP = 9

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

const getDiagramSortValue = (
  diagram: GalleryDiagram,
  sortBy: DiagramSortBy
) => {
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
    className="h-36 w-36 text-[var(--home-border-default)] transition-colors duration-200"
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
    <rect
      x="4"
      y="4"
      width="6"
      height="6"
      rx="1.4"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <rect
      x="14"
      y="4"
      width="6"
      height="6"
      rx="1.4"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <rect
      x="4"
      y="14"
      width="6"
      height="6"
      rx="1.4"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <rect
      x="14"
      y="14"
      width="6"
      height="6"
      rx="1.4"
      stroke="currentColor"
      strokeWidth="1.7"
    />
  </svg>
)

const TableViewIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect
      x="3.5"
      y="4"
      width="17"
      height="16"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="M3.5 9.5H20.5M3.5 15H20.5M10 4V20"
      stroke="currentColor"
      strokeWidth="1.7"
    />
  </svg>
)

type DiagramGalleryProps = {
  initialSearchTerm?: string
  highlightSharedDiagramId?: string | null
}

export const DiagramGallery = ({
  initialSearchTerm = "",
  highlightSharedDiagramId = null,
}: DiagramGalleryProps) => {
  const navigate = useNavigate()
  const models = usePersistenceModelStore((state) => state.models)
  const toggleFavorite = usePersistenceModelStore(
    (state) => state.toggleFavorite
  )
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [selectedDiagramType, setSelectedDiagramType] =
    useState<DiagramTypeFilter>("all")
  const [sortBy, setSortBy] = useState<DiagramSortBy>("lastViewed")
  const [sortOrder, setSortOrder] = useState<DiagramOrder>("newest")
  const [viewMode, setViewMode] = useState<DiagramViewMode>("grid")
  const [diagramSource, setDiagramSource] = useState<DiagramSource>("local")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [typeMenuAnchorEl, setTypeMenuAnchorEl] =
    useState<null | HTMLButtonElement>(null)
  const [sortMenuAnchorEl, setSortMenuAnchorEl] =
    useState<null | HTMLButtonElement>(null)
  const [sharedDiagrams, setSharedDiagrams] = useState<GalleryDiagram[]>([])
  const [isSharedDiagramsFetching, setIsSharedDiagramsFetching] =
    useState(false)
  const hasLoadedSharedOnceRef = useRef(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)
  const [highlightedDiagramId, setHighlightedDiagramId] = useState<
    string | null
  >(null)
  const prevVisibleCountRef = useRef(INITIAL_VISIBLE_COUNT)
  const sentinelRef = useRef<HTMLDivElement>(null)

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
        createdAt:
          persistentModelEntity.createdAt ??
          persistentModelEntity.lastModifiedAt,
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
      const entries = getSharedDiagramEntries()

      if (entries.length === 0) {
        if (isSubscribed) {
          setSharedDiagrams([])
          setIsSharedDiagramsFetching(false)
          hasLoadedSharedOnceRef.current = true
        }
        return
      }

      if (isSubscribed) {
        setIsSharedDiagramsFetching(true)
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
                storedDiagram.updatedAt ||
                storedDiagram.createdAt ||
                entry.sharedAt,
              favorite: entry.favorite ?? false,
              source: "shared",
              model: storedDiagram,
              createdAt: storedDiagram.createdAt || entry.sharedAt,
              lastSharedView: entry.lastSharedView,
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
        setIsSharedDiagramsFetching(false)
        hasLoadedSharedOnceRef.current = true
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
      Array.from(new Set(allDiagrams.map((diagram) => diagram.type))).sort(
        (firstType, secondType) =>
          getDiagramTypeLabel(firstType).localeCompare(
            getDiagramTypeLabel(secondType)
          )
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
  }, [
    allDiagrams,
    searchTerm,
    selectedDiagramType,
    showFavoritesOnly,
    sortBy,
    sortOrder,
  ])

  const deferredFilteredDiagrams = useDeferredValue(filteredDiagrams)
  const isPending = deferredFilteredDiagrams !== filteredDiagrams

  // Clamp visibleCount to the actual list length so it never drifts out of
  // bounds when filters change or diagrams are deleted.
  const clampedVisibleCount = Math.min(
    Math.max(visibleCount, INITIAL_VISIBLE_COUNT),
    Math.max(deferredFilteredDiagrams.length, INITIAL_VISIBLE_COUNT)
  )
  const prevVisibleCount = prevVisibleCountRef.current
  const visibleDiagrams = deferredFilteredDiagrams.slice(0, clampedVisibleCount)
  const hasMoreDiagrams = deferredFilteredDiagrams.length > clampedVisibleCount

  // Track the previous visible count after commit (not during render) so the
  // entrance-animation baseline stays correct under StrictMode/concurrent renders.
  useEffect(() => {
    prevVisibleCountRef.current = clampedVisibleCount
  }, [clampedVisibleCount])

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
  const isTypeMenuOpen = Boolean(typeMenuAnchorEl)
  const isSortMenuOpen = Boolean(sortMenuAnchorEl)
  const diagramCountLabel = showFavoritesOnly
    ? `${filteredDiagrams.length} favorites`
    : `${filteredDiagrams.length} diagrams`

  const closeTypeMenu = () => {
    setTypeMenuAnchorEl(null)
  }

  const closeSortMenu = () => {
    setSortMenuAnchorEl(null)
  }

  useEffect(() => {
    if (!highlightSharedDiagramId) return
    setDiagramSource("shared")
    setHighlightedDiagramId(highlightSharedDiagramId)
    const timer = window.setTimeout(() => setHighlightedDiagramId(null), 2400)
    return () => window.clearTimeout(timer)
  }, [highlightSharedDiagramId])

  const loadingThumbnailIds = useDiagramThumbnailWarmup({
    visibleDiagrams,
    isPending,
    isDiagramEmpty,
  })

  const handleOpenDiagram = (diagram: GalleryDiagram) => {
    if (diagram.source === "local") {
      navigate(`/local/${diagram.id}`)
      return
    }

    navigate(
      buildSharedDiagramPath(
        diagram.id,
        diagram.lastSharedView ?? DiagramView.EDIT
      )
    )
  }

  const handleToggleDiagramFavorite = useCallback(
    (diagram: RecentDiagram) => {
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
    },
    [toggleFavorite]
  )

  const handleRemoveSharedDiagram = useCallback((diagramId: string) => {
    setSharedDiagrams((currentDiagrams) =>
      currentDiagrams.filter((diagram) => diagram.id !== diagramId)
    )
  }, [])

  const handleSharedDiagramViewChange = useCallback(
    (diagramId: string, view: DiagramView) => {
      setSharedDiagrams((currentDiagrams) =>
        currentDiagrams.map((diagram) =>
          diagram.id === diagramId
            ? { ...diagram, lastSharedView: view }
            : diagram
        )
      )
    },
    []
  )

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
    if (!hasMoreDiagrams || isPending) {
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

        setVisibleCount((current) =>
          Math.min(current + LOAD_MORE_STEP, deferredFilteredDiagrams.length)
        )
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
  }, [deferredFilteredDiagrams.length, hasMoreDiagrams, isPending])

  return (
    <div className="w-full transition-colors duration-200">
      <div className="space-y-6 recent-diagrams-font">
        <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <span
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--home-text-secondary)]"
              aria-hidden="true"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
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
              placeholder="Search by name..."
              className="h-9 w-full rounded-md border border-[var(--home-border-default)] bg-[var(--home-surface-base)] py-1.5 pl-8 pr-8 text-xs text-[var(--home-text-primary)] outline-none transition-colors duration-200 placeholder:text-[var(--home-text-secondary)] focus:border-[var(--home-accent-ring)]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("")
                  setVisibleCount(INITIAL_VISIBLE_COUNT)
                }}
                className="absolute inset-y-0 right-2 flex items-center text-[var(--home-text-secondary)] hover:text-[var(--home-text-primary)]"
                aria-label="Clear search"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M18 6 6 18M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
          <span className="self-start text-[12px] font-normal text-[var(--home-text-secondary)] select-none md:self-auto">
            {diagramCountLabel}
          </span>
        </div>

        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <SegmentedControl
              className="w-full sm:w-fit sm:max-w-full"
              sizeClassName={controlHeightClass}
              itemClassName={`px-3.5 ${controlTextClass}`}
              options={[
                { value: "local", label: "Local diagrams" },
                { value: "shared", label: "Shared diagrams" },
              ]}
              value={diagramSource}
              onChange={(nextSource) => {
                setDiagramSource(nextSource)
                setVisibleCount(INITIAL_VISIBLE_COUNT)
              }}
            />
            <button
              type="button"
              onClick={() => {
                setShowFavoritesOnly((current) => !current)
                setVisibleCount(INITIAL_VISIBLE_COUNT)
              }}
              aria-pressed={showFavoritesOnly}
              className={`flex ${controlHeightClass} w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 px-3 text-xs font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2 sm:w-fit sm:justify-start ${
                showFavoritesOnly
                  ? "bg-[var(--home-surface-raised-hover)] text-[var(--home-favorite-star)]"
                  : "bg-[var(--home-surface-raised)] text-[var(--home-text-secondary)] hover:bg-[var(--home-surface-raised-hover)] hover:text-[var(--home-favorite-star)]"
              }`}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill={showFavoritesOnly ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  d="M12 3.7l2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3.7z"
                  strokeLinejoin="round"
                />
              </svg>
              Favorites
            </button>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-nowrap lg:items-center">
            <DropdownFilterMenu
              buttonId="diagram-type-filter-button"
              menuId="diagram-type-filter-menu"
              anchorEl={typeMenuAnchorEl}
              onClose={closeTypeMenu}
              onToggle={(event) => {
                closeSortMenu()
                setTypeMenuAnchorEl((currentAnchor) =>
                  currentAnchor ? null : event.currentTarget
                )
              }}
              anchorHorizontal="left"
              triggerClassName={`flex ${controlHeightClass} min-w-0 w-full cursor-pointer items-center justify-between gap-2 rounded-md border-0 px-2.5 text-xs transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2 sm:w-44 ${
                isTypeMenuOpen
                  ? "bg-[var(--home-surface-raised-hover)] text-[var(--home-accent-strong)]"
                  : "bg-[var(--home-surface-raised)] text-[var(--home-text-secondary)] hover:bg-[var(--home-surface-raised-hover)] hover:text-[var(--home-accent-strong)]"
              }`}
              triggerContent={
                <span className="truncate">{selectedDiagramTypeLabel}</span>
              }
              sections={[
                {
                  title: "Diagram type",
                  items: [
                    {
                      key: "all",
                      label: "All diagram types",
                      selected: selectedDiagramType === "all",
                      onSelect: () => {
                        setSelectedDiagramType("all")
                        setVisibleCount(INITIAL_VISIBLE_COUNT)
                        closeTypeMenu()
                      },
                    },
                    ...diagramTypeOptions.map((diagramType) => ({
                      key: diagramType,
                      label: getDiagramTypeLabel(diagramType),
                      selected: selectedDiagramType === diagramType,
                      onSelect: () => {
                        setSelectedDiagramType(diagramType)
                        setVisibleCount(INITIAL_VISIBLE_COUNT)
                        closeTypeMenu()
                      },
                    })),
                  ],
                },
              ]}
            />
            <DropdownFilterMenu
              buttonId="diagram-sort-menu-button"
              menuId="diagram-sort-menu"
              anchorEl={sortMenuAnchorEl}
              onClose={closeSortMenu}
              onToggle={(event) => {
                closeTypeMenu()
                setSortMenuAnchorEl((currentAnchor) =>
                  currentAnchor ? null : event.currentTarget
                )
              }}
              triggerClassName={`flex ${controlHeightClass} min-w-0 w-full cursor-pointer items-center gap-2 rounded-md border-0 px-2.5 text-xs transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2 sm:w-auto ${
                isSortMenuOpen
                  ? "bg-[var(--home-surface-raised-hover)] text-[var(--home-accent-strong)]"
                  : "bg-[var(--home-surface-raised)] text-[var(--home-text-secondary)] hover:bg-[var(--home-surface-raised-hover)] hover:text-[var(--home-accent-strong)]"
              }`}
              triggerContent={
                <>
                  <span className="min-w-0 truncate">{sortByLabel}</span>
                  <span className="hidden text-[var(--home-text-secondary)] sm:inline">
                    {sortOrderLabel}
                  </span>
                </>
              }
              sections={[
                {
                  title: "Sort by",
                  items: (
                    [
                      ["alphabetical", "Alphabetical"],
                      ["dateCreated", "Date created"],
                      ["lastViewed", "Last viewed"],
                    ] as const
                  ).map(([optionValue, optionLabel]) => ({
                    key: optionValue,
                    label: optionLabel,
                    selected: sortBy === optionValue,
                    onSelect: () => {
                      setSortBy(optionValue)
                      setVisibleCount(INITIAL_VISIBLE_COUNT)
                      closeSortMenu()
                    },
                  })),
                },
                {
                  title: "Order",
                  items: (
                    [
                      ["oldest", "Oldest first"],
                      ["newest", "Newest first"],
                    ] as const
                  ).map(([optionValue, optionLabel]) => ({
                    key: optionValue,
                    label: optionLabel,
                    selected: sortOrder === optionValue,
                    onSelect: () => {
                      setSortOrder(optionValue)
                      setVisibleCount(INITIAL_VISIBLE_COUNT)
                      closeSortMenu()
                    },
                  })),
                },
              ]}
            />
            <div className="sm:col-span-2 lg:col-span-1 lg:justify-self-end">
              <SegmentedControl
                className="w-fit"
                sizeClassName={controlHeightClass}
                itemClassName="w-8 px-0"
                options={[
                  {
                    value: "grid",
                    icon: <GridViewIcon />,
                    ariaLabel: "Grid view",
                  },
                  {
                    value: "table",
                    icon: <TableViewIcon />,
                    ariaLabel: "Table view",
                  },
                ]}
                value={viewMode}
                onChange={(nextViewMode) => setViewMode(nextViewMode)}
              />
            </div>
          </div>
        </div>

        {isSharedDiagramsFetching && !hasLoadedSharedOnceRef.current ? (
          <DiagramGallerySkeleton
            count={Math.max(getSharedDiagramEntries().length, 1)}
          />
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
                className="cursor-pointer rounded-lg border border-[var(--home-accent-ring)] bg-[var(--home-accent-ring)] px-4 py-2 text-sm font-medium text-[var(--home-text-on-badge)] transition-colors duration-200 hover:bg-[var(--home-surface-raised-active)] hover:border-[var(--home-surface-raised-active)] focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2"
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
                    className="grid grid-cols-[repeat(auto-fill,260px)] gap-6 justify-center md:grid-cols-[repeat(auto-fill,280px)] lg:gap-8 xl:grid-cols-[repeat(auto-fill,300px)]"
                  >
                    {visibleDiagrams.map((diagram, index) => (
                      <div
                        key={diagram.id}
                        className={
                          index >= prevVisibleCount
                            ? "gallery-card-enter"
                            : undefined
                        }
                      >
                        <DiagramCard
                          diagram={diagram}
                          showPlaceholderIcon={isDiagramEmpty(diagram)}
                          isThumbnailLoading={Boolean(
                            loadingThumbnailIds[diagram.id]
                          )}
                          isHighlighted={diagram.id === highlightedDiagramId}
                          onToggleFavorite={handleToggleDiagramFavorite}
                          onSharedDiagramRemoved={handleRemoveSharedDiagram}
                          onSharedDiagramViewChange={
                            handleSharedDiagramViewChange
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[4px]">
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-0 text-left">
                        <thead className="bg-[var(--home-surface-row-alt)]">
                          <tr>
                            <th className="w-10 px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-primary)]">
                              <span className="sr-only">Favorite</span>
                            </th>
                            <th className="w-[26%] px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-primary)]">
                              Name
                            </th>
                            <th className="hidden px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-primary)] md:table-cell">
                              Type
                            </th>
                            <th className="hidden px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-primary)] md:table-cell">
                              Created
                            </th>
                            <th className="px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-primary)]">
                              Last viewed
                            </th>
                            <th className="hidden px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-primary)] lg:table-cell">
                              Source
                            </th>
                            <th className="px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-[var(--home-text-primary)]">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleDiagrams.map((diagram) => {
                            const title =
                              diagram.title.trim() || "Untitled Diagram"
                            return (
                              <tr
                                key={diagram.id}
                                className="cursor-pointer bg-[var(--home-surface-raised)] transition-colors duration-200 odd:bg-[var(--home-surface-raised)] odd:hover:bg-[var(--home-accent-soft)] even:bg-[var(--home-surface-row-alt)] even:hover:bg-[var(--home-accent-soft)]"
                                onClick={() => handleOpenDiagram(diagram)}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault()
                                    handleOpenDiagram(diagram)
                                  }
                                }}
                                tabIndex={0}
                              >
                                <td className="px-3 py-3 align-middle">
                                  <button
                                    type="button"
                                    aria-label={
                                      diagram.favorite
                                        ? "Remove from favorites"
                                        : "Add to favorites"
                                    }
                                    className="home-card-icon-button flex h-[30px] w-[30px] cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2"
                                    style={{
                                      color: diagram.favorite
                                        ? "var(--home-favorite-star)"
                                        : "var(--home-text-muted)",
                                      ["--icon-hover-color" as string]:
                                        "var(--home-text-strong)",
                                      ["--icon-active-color" as string]:
                                        "var(--home-favorite-star)",
                                      ["--icon-hover-bg" as string]:
                                        "color-mix(in srgb, var(--home-text-primary) 10%, transparent)",
                                    }}
                                    data-active={
                                      diagram.favorite ? "true" : "false"
                                    }
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleToggleDiagramFavorite(diagram)
                                    }}
                                    onKeyDown={(event) =>
                                      event.stopPropagation()
                                    }
                                  >
                                    <svg
                                      className="h-[18px] w-[18px]"
                                      viewBox="0 0 24 24"
                                      fill={
                                        diagram.favorite
                                          ? "currentColor"
                                          : "none"
                                      }
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
                                <td className="w-[26%] px-3 py-3 align-middle text-sm text-[var(--home-text-primary)]">
                                  <div className="flex min-w-0 flex-col gap-1">
                                    <span className="truncate">{title}</span>
                                    {diagram.source === "shared" && (
                                      <span className="w-fit rounded bg-[var(--home-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--home-accent-base)]">
                                        {getSharedDiagramViewBadge(
                                          diagram.lastSharedView
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="hidden px-3 py-3 align-middle text-xs text-[var(--home-text-secondary)] md:table-cell">
                                  {getDiagramTypeLabel(diagram.type)}
                                </td>
                                <td className="hidden px-3 py-3 align-middle text-xs text-[var(--home-text-secondary)] md:table-cell">
                                  {formatDate(diagram.createdAt)}
                                </td>
                                <td className="px-3 py-3 align-middle text-xs text-[var(--home-text-secondary)]">
                                  {formatDate(diagram.lastViewedAt)}
                                </td>
                                <td className="hidden px-3 py-3 align-middle text-xs text-[var(--home-text-secondary)] lg:table-cell">
                                  {diagram.source === "local"
                                    ? "Local"
                                    : getSharedDiagramViewBadge(
                                        diagram.lastSharedView
                                      )}
                                </td>
                                <td className="px-3 py-3 align-middle">
                                  <DiagramActionsMenu
                                    diagram={diagram}
                                    containerClassName="relative inline-flex items-center"
                                    triggerClassName="cursor-pointer rounded-md p-1 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
                                    triggerStyle={{
                                      outlineColor: "var(--home-accent-ring)",
                                      color: "var(--home-text-secondary)",
                                      ["--icon-hover-color" as string]:
                                        "var(--home-text-strong)",
                                      ["--icon-active-color" as string]:
                                        "var(--home-text-strong)",
                                      ["--icon-hover-bg" as string]:
                                        "color-mix(in srgb, var(--home-text-primary) 10%, transparent)",
                                    }}
                                    menuClassName="z-40 w-52 rounded-lg border-0 bg-[var(--home-surface-raised)] p-1 shadow-2xl transition-colors duration-200"
                                    menuStyle={{
                                      boxShadow:
                                        "0 16px 36px var(--home-shadow-overlay)",
                                    }}
                                    stopPropagation
                                    onSharedDiagramRemoved={
                                      handleRemoveSharedDiagram
                                    }
                                    onSharedDiagramViewChange={
                                      handleSharedDiagramViewChange
                                    }
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
              <div className="rounded-lg border border-dashed border-[var(--home-border-default)] bg-[var(--home-surface-sunken)] px-4 py-10 text-center text-sm text-[var(--home-text-secondary)] transition-colors duration-200">
                No diagrams match your search and filters.
              </div>
            )}

            {filteredDiagrams.length > 0 && (
              <div
                ref={sentinelRef}
                aria-hidden="true"
                className="h-0.5 w-full"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
