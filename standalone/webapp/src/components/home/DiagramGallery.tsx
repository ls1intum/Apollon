import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Plus, Upload } from "lucide-react"
import { DiagramGallerySkeleton } from "@/components/home/DiagramGallerySkeleton"
import type { UMLDiagramType, UMLModel } from "@tumaet/apollon"
import { Link, useNavigate } from "@tanstack/react-router"
import { DiagramView } from "@/types"
import { playgroundModelId } from "@/constants/playgroundDefaultDiagram"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useDiagramThumbnailWarmup } from "@/hooks/useDiagramThumbnailWarmup"
import { DiagramApiClient } from "@/services/DiagramApiClient"
import {
  clearSharedDiagramExpiredState,
  getSharedDiagramEntries,
  markSharedDiagramExpired,
  removeSharedDiagramEntry,
  subscribeToSharedDiagramChange,
  toggleSharedDiagramFavorite,
} from "@/utils/sharedDiagramStorage"
import {
  sharedDiagramRoute,
  getSharedDiagramViewBadge,
} from "@/utils/sharedDiagramLinks"
import {
  DiagramActionsMenu,
  DiagramCard,
  type DiagramSource,
  type RecentDiagram,
} from "./DiagramCard"
import { getDiagramTypeLabel } from "./diagramTypeMeta"
import { DropdownFilterMenu } from "./DropdownFilterMenu"
import { Button } from "@tumaet/ui/components/button"
import { Badge } from "@tumaet/ui/components/badge"
import { Tabs, TabsList, TabsTrigger } from "@tumaet/ui/components/tabs"

const normalize = (value: string) => value.trim().toLowerCase()
const INITIAL_VISIBLE_COUNT = 9
const LOAD_MORE_STEP = 9

type DiagramTypeFilter = "all" | UMLDiagramType
type DiagramSortBy = "alphabetical" | "dateCreated" | "lastModified"
type DiagramOrder = "oldest" | "newest"
type DiagramViewMode = "grid" | "table"
type DiagramSourceFilter = "all" | DiagramSource

type GalleryDiagram = RecentDiagram & {
  model: UMLModel
  source: DiagramSource
  createdAt: string
  isExpired?: boolean
  expiredAt?: string
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

  if (sortBy === "lastModified") {
    return toDateMs(diagram.lastModifiedAt) ?? Number.NEGATIVE_INFINITY
  }

  return normalize(diagram.title)
}

const compareExpiredLast = (
  firstDiagram: GalleryDiagram,
  secondDiagram: GalleryDiagram
) => {
  const firstExpired = Boolean(firstDiagram.isExpired)
  const secondExpired = Boolean(secondDiagram.isExpired)

  if (firstExpired === secondExpired) {
    return 0
  }

  return firstExpired ? 1 : -1
}

const EmptyStateIllustration = () => (
  <svg
    className="h-36 w-36 text-border transition-colors duration-200"
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
  onNewDiagram?: () => void
  onImportJson?: () => void
}

type TabOption<T extends string> = {
  value: T
  label?: ReactNode
  icon?: ReactNode
  ariaLabel: string
}

const diagramSourceOptions = [
  {
    value: "all",
    label: (
      <>
        <span className="sm:hidden">All</span>
        <span className="hidden sm:inline">All diagrams</span>
      </>
    ),
    ariaLabel: "All diagrams",
  },
  {
    value: "local",
    label: (
      <>
        <span className="sm:hidden">Local</span>
        <span className="hidden sm:inline">Local diagrams</span>
      </>
    ),
    ariaLabel: "Local diagrams",
  },
  {
    value: "shared",
    label: (
      <>
        <span className="sm:hidden">Shared</span>
        <span className="hidden sm:inline">Shared diagrams</span>
      </>
    ),
    ariaLabel: "Shared diagrams",
  },
] satisfies readonly TabOption<DiagramSourceFilter>[]

const viewModeOptions = [
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
] satisfies readonly TabOption<DiagramViewMode>[]

export const DiagramGallery = ({
  initialSearchTerm = "",
  highlightSharedDiagramId = null,
  onNewDiagram,
  onImportJson,
}: DiagramGalleryProps) => {
  const navigate = useNavigate()
  const models = usePersistenceModelStore((state) => state.models)
  const toggleFavorite = usePersistenceModelStore(
    (state) => state.toggleFavorite
  )
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [selectedDiagramType, setSelectedDiagramType] =
    useState<DiagramTypeFilter>("all")
  const [sortBy, setSortBy] = useState<DiagramSortBy>("lastModified")
  const [sortOrder, setSortOrder] = useState<DiagramOrder>("newest")
  const [viewMode, setViewMode] = useState<DiagramViewMode>("grid")
  const [diagramSource, setDiagramSource] = useState<DiagramSourceFilter>("all")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [typeMenuAnchorEl, setTypeMenuAnchorEl] =
    useState<null | HTMLButtonElement>(null)
  const [sortMenuAnchorEl, setSortMenuAnchorEl] =
    useState<null | HTMLButtonElement>(null)
  const [sharedDiagrams, setSharedDiagrams] = useState<GalleryDiagram[]>([])
  const [sharedDiagramsStatus, setSharedDiagramsStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle")
  const [sharedReloadKey, setSharedReloadKey] = useState(0)
  const hasLoadedSharedRef = useRef(false)
  // Refetch only when the shared entry-id set changes, not on metadata writes.
  const sharedEntrySignatureRef = useRef<string | null>(null)
  const isSharedPending =
    diagramSource === "shared" &&
    (sharedDiagramsStatus === "idle" || sharedDiagramsStatus === "loading")
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)
  const [highlightedDiagramId, setHighlightedDiagramId] = useState<
    string | null
  >(null)
  const [prevVisibleCount, setPrevVisibleCount] = useState(
    INITIAL_VISIBLE_COUNT
  )
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
      }))
      .sort(sortByLastModifiedDesc)
  }, [models])

  useEffect(() => {
    const computeSignature = () =>
      getSharedDiagramEntries()
        .map((entry) => entry.id)
        .join("|")

    sharedEntrySignatureRef.current ??= computeSignature()

    return subscribeToSharedDiagramChange(() => {
      const nextSignature = computeSignature()
      if (nextSignature === sharedEntrySignatureRef.current) {
        return
      }
      sharedEntrySignatureRef.current = nextSignature
      setSharedReloadKey((current) => current + 1)
    })
  }, [])

  useEffect(() => {
    if (diagramSource !== "shared" && diagramSource !== "all") {
      return
    }

    let isSubscribed = true

    const loadSharedDiagrams = async () => {
      const entries = getSharedDiagramEntries()

      if (entries.length === 0) {
        if (isSubscribed) {
          setSharedDiagrams([])
          setSharedDiagramsStatus("done")
          hasLoadedSharedRef.current = true
        }
        return
      }

      if (isSubscribed && !hasLoadedSharedRef.current) {
        setSharedDiagramsStatus("loading")
      }

      const diagramsById = new Map<string, GalleryDiagram>()
      let networkErrorCount = 0

      await Promise.all(
        entries.map(async (entry) => {
          try {
            const storedDiagram = await DiagramApiClient.fetchStoredDiagram(
              entry.id
            )
            if (!storedDiagram) {
              const expiredAt = entry.expiredAt ?? new Date().toISOString()
              markSharedDiagramExpired(entry.id, expiredAt)
              diagramsById.set(entry.id, {
                id: entry.id,
                title: "Expired diagram",
                type: "ClassDiagram",
                lastModifiedAt: entry.sharedAt,
                favorite: entry.favorite ?? false,
                source: "shared",
                model: { nodes: [], edges: [] } as unknown as UMLModel,
                createdAt: entry.sharedAt,
                lastSharedView: entry.lastSharedView,
                isExpired: true,
                expiredAt,
              })
              return
            }

            if (entry.expiredAt) {
              clearSharedDiagramExpiredState(entry.id)
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
              expiredAt: undefined,
            })
          } catch {
            networkErrorCount++
          }
        })
      )

      const orderedSharedDiagrams = entries
        .map((entry) => diagramsById.get(entry.id))
        .filter((diagram): diagram is GalleryDiagram => Boolean(diagram))
        .sort((firstDiagram, secondDiagram) => {
          const expiredComparison = compareExpiredLast(
            firstDiagram,
            secondDiagram
          )
          if (expiredComparison !== 0) {
            return expiredComparison
          }

          return sortByLastModifiedDesc(firstDiagram, secondDiagram)
        })

      if (isSubscribed) {
        setSharedDiagrams(orderedSharedDiagrams)
        setSharedDiagramsStatus(
          networkErrorCount > 0 && orderedSharedDiagrams.length === 0
            ? "error"
            : "done"
        )
        hasLoadedSharedRef.current = true
      }
    }

    void loadSharedDiagrams()

    return () => {
      isSubscribed = false
    }
  }, [diagramSource, sharedReloadKey])

  const allDiagrams = useMemo<GalleryDiagram[]>(() => {
    if (diagramSource === "local") {
      return localDiagrams
    }

    if (diagramSource === "shared") {
      return sharedDiagrams
    }

    return [...localDiagrams, ...sharedDiagrams].sort(sortByLastModifiedDesc)
  }, [diagramSource, localDiagrams, sharedDiagrams])
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
        const expiredComparison = compareExpiredLast(
          firstDiagram,
          secondDiagram
        )
        if (expiredComparison !== 0) {
          return expiredComparison
        }

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
  const visibleDiagrams = deferredFilteredDiagrams.slice(0, clampedVisibleCount)
  const hasMoreDiagrams = deferredFilteredDiagrams.length > clampedVisibleCount

  // Track the previous visible count in state, updated after commit (not during
  // render), so the entrance-animation baseline stays correct under
  // StrictMode/concurrent renders and `prevVisibleCount` is a pure render read.
  useEffect(() => {
    setPrevVisibleCount(clampedVisibleCount)
  }, [clampedVisibleCount])

  const sortByLabel =
    sortBy === "alphabetical"
      ? "Alphabetical"
      : sortBy === "dateCreated"
        ? "Date created"
        : "Last modified"
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
  const isAllDiagramSource = diagramSource === "all"

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

  const diagramNav = (diagram: GalleryDiagram) =>
    diagram.source === "local"
      ? ({ to: "/local/$id", params: { id: diagram.id } } as const)
      : sharedDiagramRoute(
          diagram.id,
          diagram.lastSharedView ?? DiagramView.EDIT
        )

  const handleOpenDiagram = (diagram: GalleryDiagram) => {
    navigate(diagramNav(diagram))
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
    // Sync signature before the write so the event doesn't refetch needlessly.
    removeSharedDiagramEntry(diagramId)
    sharedEntrySignatureRef.current = getSharedDiagramEntries()
      .map((entry) => entry.id)
      .join("|")
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
        {/* ── Page heading ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--home-text-primary)" }}
          >
            Your diagrams
          </h1>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={onImportJson}
              className="w-full sm:w-auto"
            >
              <Upload className="size-4" aria-hidden="true" /> Import
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onNewDiagram}
              className="col-span-2 w-full sm:col-span-1 sm:w-auto"
            >
              <Plus className="size-4" aria-hidden="true" /> New diagram
            </Button>
          </div>
        </div>

        {/* ── Search row ── */}
        <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <span
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
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
              type="search"
              aria-label="Search diagrams by name"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setVisibleCount(INITIAL_VISIBLE_COUNT)
              }}
              placeholder="Search by name..."
              className="h-9 w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-8 text-xs text-foreground outline-none transition-colors duration-200 placeholder:text-muted-foreground focus:border-ring"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("")
                  setVisibleCount(INITIAL_VISIBLE_COUNT)
                }}
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
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
          <span className="self-start text-[12px] font-normal text-muted-foreground select-none md:self-auto">
            {diagramCountLabel}
          </span>
        </div>

        <div className="grid w-full gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:max-w-[620px] lg:grid-cols-[auto_auto] lg:justify-start">
            <Tabs
              className="w-full sm:max-w-full lg:w-fit"
              value={diagramSource}
              onValueChange={(value) => {
                setDiagramSource(value as DiagramSourceFilter)
                setVisibleCount(INITIAL_VISIBLE_COUNT)
              }}
            >
              <TabsList
                className={`w-full gap-[2px] rounded-lg bg-card p-[2px] lg:w-fit ${controlHeightClass}`}
              >
                {diagramSourceOptions.map((option) => (
                  <TabsTrigger
                    key={option.value}
                    value={option.value}
                    aria-label={option.ariaLabel}
                    className={`min-w-0 flex-1 px-2 leading-4 text-muted-foreground sm:px-3 lg:flex-none ${controlTextClass} data-active:bg-primary data-active:text-primary-foreground dark:data-active:bg-primary dark:data-active:text-primary-foreground`}
                  >
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <button
              type="button"
              onClick={() => {
                setShowFavoritesOnly((current) => !current)
                setVisibleCount(INITIAL_VISIBLE_COUNT)
              }}
              aria-pressed={showFavoritesOnly}
              className={`flex ${controlHeightClass} w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 px-3 text-xs font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 sm:w-auto sm:justify-start ${
                showFavoritesOnly
                  ? "bg-accent-hover text-[var(--home-favorite-star)]"
                  : "bg-card text-muted-foreground hover:bg-accent-hover hover:text-[var(--home-favorite-star)]"
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
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:w-auto lg:grid-cols-[176px_220px_auto]">
            <DropdownFilterMenu
              buttonId="diagram-type-filter-button"
              menuId="diagram-type-filter-menu"
              anchorEl={typeMenuAnchorEl}
              onClose={closeTypeMenu}
              onToggle={(event) => {
                // Read currentTarget before the updater; React nulls it after.
                const trigger = event.currentTarget
                closeSortMenu()
                setTypeMenuAnchorEl((currentAnchor) =>
                  currentAnchor ? null : trigger
                )
              }}
              anchorHorizontal="left"
              triggerClassName={`flex ${controlHeightClass} min-w-0 w-full cursor-pointer items-center justify-between gap-2 rounded-md border-0 px-2.5 text-xs transition-all duration-200 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                isTypeMenuOpen
                  ? "bg-accent-hover text-accent-strong"
                  : "bg-card text-muted-foreground hover:bg-accent-hover hover:text-accent-strong"
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
                // Read currentTarget before the updater; React nulls it after.
                const trigger = event.currentTarget
                closeTypeMenu()
                setSortMenuAnchorEl((currentAnchor) =>
                  currentAnchor ? null : trigger
                )
              }}
              triggerClassName={`flex ${controlHeightClass} min-w-0 w-full cursor-pointer items-center gap-2 rounded-md border-0 px-2.5 text-xs transition-all duration-200 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                isSortMenuOpen
                  ? "bg-accent-hover text-accent-strong"
                  : "bg-card text-muted-foreground hover:bg-accent-hover hover:text-accent-strong"
              }`}
              triggerContent={
                <>
                  <span className="min-w-0 truncate">{sortByLabel}</span>
                  <span className="hidden text-muted-foreground md:inline">
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
                      ["lastModified", "Last modified"],
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
            <div className="justify-self-start sm:justify-self-end">
              <Tabs
                className="w-fit"
                value={viewMode}
                onValueChange={(value) => setViewMode(value as DiagramViewMode)}
              >
                <TabsList
                  className={`w-fit gap-[2px] rounded-lg bg-card p-[2px] ${controlHeightClass}`}
                >
                  {viewModeOptions.map((option) => (
                    <TabsTrigger
                      key={option.value}
                      value={option.value}
                      aria-label={option.ariaLabel}
                      className="w-8 flex-none px-0 text-muted-foreground data-active:bg-primary data-active:text-primary-foreground dark:data-active:bg-primary dark:data-active:text-primary-foreground"
                    >
                      {option.icon}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {isSharedPending ? (
          <DiagramGallerySkeleton
            count={Math.max(getSharedDiagramEntries().length, 1)}
          />
        ) : allDiagrams.length === 0 ? (
          <div className="flex min-h-[480px] flex-col items-center justify-center gap-6 text-center transition-colors duration-200">
            <EmptyStateIllustration />
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-lg font-semibold text-foreground transition-colors duration-200">
                {diagramSource === "all"
                  ? "No diagrams yet"
                  : diagramSource === "local"
                    ? "No local diagrams yet"
                    : sharedDiagramsStatus === "error"
                      ? "Server unavailable"
                      : "No shared diagrams yet"}
              </p>
              <p className="max-w-xs text-center text-sm text-muted-foreground">
                {diagramSource === "shared" ? (
                  sharedDiagramsStatus === "error" ? (
                    "Could not reach the server. Check your connection and try again."
                  ) : (
                    "Share a local diagram to see it listed here."
                  )
                ) : (
                  <>
                    Use{" "}
                    <strong className="text-foreground">
                      &quot;New diagram&quot;
                    </strong>{" "}
                    to create a diagram, or{" "}
                    <strong className="text-foreground">
                      &quot;Import&quot;
                    </strong>{" "}
                    to add an existing one.
                  </>
                )}
              </p>
              {diagramSource === "shared" &&
                sharedDiagramsStatus === "error" && (
                  <button
                    type="button"
                    onClick={() => setSharedReloadKey((current) => current + 1)}
                    className="mt-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors duration-200 hover:bg-accent-hover"
                  >
                    Try again
                  </button>
                )}
            </div>
          </div>
        ) : (
          <>
            {filteredDiagrams.length > 0 ? (
              <>
                {viewMode === "grid" ? (
                  <div
                    role="list"
                    className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] justify-start gap-4 md:grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] md:gap-6 xl:grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))]"
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
                          showSourceBadge={isAllDiagramSource}
                          isHighlighted={diagram.id === highlightedDiagramId}
                          isExpired={diagram.isExpired}
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
                  <div className="overflow-hidden rounded-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-0 text-left">
                        <thead className="bg-surface-alt">
                          <tr>
                            <th className="w-10 px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-foreground">
                              <span className="sr-only">Favorite</span>
                            </th>
                            <th className="w-[26%] px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-foreground">
                              Name
                            </th>
                            <th className="hidden px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-foreground md:table-cell">
                              Type
                            </th>
                            <th className="hidden px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-foreground md:table-cell">
                              Created
                            </th>
                            <th className="px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-foreground">
                              Last modified
                            </th>
                            <th className="hidden px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-foreground lg:table-cell">
                              Source
                            </th>
                            <th className="px-3 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-foreground">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleDiagrams.map((diagram) => {
                            const isUntitled = !diagram.title.trim()
                            const title =
                              diagram.title.trim() || "Untitled diagram"
                            const titleClass = isUntitled
                              ? "truncate italic text-[var(--home-text-muted)]"
                              : "truncate"
                            return (
                              <tr
                                key={diagram.id}
                                className={`bg-card transition-colors duration-200 odd:bg-card even:bg-surface-alt ${diagram.isExpired ? "cursor-default opacity-50" : "cursor-pointer odd:hover:bg-accent-soft even:hover:bg-accent-soft"}`}
                                // Mouse convenience only — clicking anywhere on
                                // the row opens it. Keyboard/cmd-click go through
                                // the focusable name link in the first cell, so
                                // the row itself isn't a second tab stop.
                                onClick={() =>
                                  !diagram.isExpired &&
                                  handleOpenDiagram(diagram)
                                }
                              >
                                <td className="px-3 py-3 align-middle">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={
                                      diagram.favorite
                                        ? "Remove from favorites"
                                        : "Add to favorites"
                                    }
                                    className="home-card-icon-button size-[30px]"
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
                                      className="size-[18px]"
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
                                  </Button>
                                </td>
                                <td className="w-[26%] px-3 py-3 align-middle text-sm text-foreground">
                                  {diagram.isExpired ? (
                                    <span className={titleClass}>{title}</span>
                                  ) : (
                                    <Link
                                      {...diagramNav(diagram)}
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                      className={`${titleClass} hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2`}
                                    >
                                      {title}
                                    </Link>
                                  )}
                                </td>
                                <td className="hidden px-3 py-3 align-middle text-xs text-muted-foreground md:table-cell">
                                  <Badge
                                    className="h-auto rounded border-0 px-2 py-0.5 text-[10px] font-medium"
                                    style={{
                                      background: "var(--home-tag-type-bg)",
                                      color: "var(--home-tag-type-text)",
                                    }}
                                  >
                                    {getDiagramTypeLabel(diagram.type)}
                                  </Badge>
                                </td>
                                <td className="hidden px-3 py-3 align-middle text-xs text-muted-foreground md:table-cell">
                                  {formatDate(diagram.createdAt)}
                                </td>
                                <td className="px-3 py-3 align-middle text-xs text-muted-foreground">
                                  {formatDate(diagram.lastModifiedAt)}
                                </td>
                                <td className="hidden px-3 py-3 align-middle lg:table-cell">
                                  <div className="flex flex-wrap items-center gap-1">
                                    <Badge
                                      className="h-auto rounded border-0 px-2 py-0.5 text-[10px] font-semibold"
                                      style={
                                        diagram.source === "shared"
                                          ? {
                                              background:
                                                "var(--home-tag-shared-bg)",
                                              color:
                                                "var(--home-tag-shared-text)",
                                            }
                                          : {
                                              background:
                                                "var(--home-tag-local-bg)",
                                              color:
                                                "var(--home-tag-local-text)",
                                            }
                                      }
                                    >
                                      {diagram.source === "shared"
                                        ? "Shared"
                                        : "Local"}
                                    </Badge>
                                    {diagram.source === "shared" && (
                                      <Badge
                                        className="h-auto rounded border-0 px-2 py-0.5 text-[10px] font-medium"
                                        style={{
                                          background: "var(--home-tag-type-bg)",
                                          color: "var(--home-tag-type-text)",
                                        }}
                                      >
                                        {getSharedDiagramViewBadge(
                                          diagram.lastSharedView
                                        )}
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3 align-middle">
                                  <DiagramActionsMenu
                                    diagram={diagram}
                                    isExpired={diagram.isExpired}
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
                                    menuClassName="z-40 w-52 rounded-lg border border-border-subtle bg-card p-1 shadow-sm transition-colors duration-200"
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
              <div className="rounded-lg border border-dashed border-border bg-muted px-4 py-10 text-center text-sm text-muted-foreground transition-colors duration-200">
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
