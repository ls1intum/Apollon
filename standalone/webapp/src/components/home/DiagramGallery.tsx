import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { UMLDiagramType, UMLModel } from "@tumaet/apollon"
import { Button } from "@tumaet/ui/components/button"
import { DiagramGallerySkeleton } from "@/components/home/DiagramGallerySkeleton"
import { DiagramView } from "@/types"
import { playgroundModelId } from "@/constants/playgroundDefaultDiagram"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useDiagramThumbnailWarmup } from "@/hooks/useDiagramThumbnailWarmup"
import { useThumbnailViewportPriority } from "@/hooks/useThumbnailViewportPriority"
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
  DiagramCard,
  type DiagramSource,
  type RecentDiagram,
} from "./DiagramCard"
import type { HomeChrome } from "./useHomeChrome"

const normalize = (value: string) => value.trim().toLowerCase()
const INITIAL_VISIBLE_COUNT = 9
const LOAD_MORE_STEP = 9

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

const getDiagramSortValue = (
  diagram: GalleryDiagram,
  sortBy: HomeChrome["sort"]["field"]
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

type DiagramGalleryProps = {
  /** Shared refinement state — owned by HomePage, read here. */
  chrome: HomeChrome
  highlightSharedDiagramId?: string | null
  /** Reports the filtered result total up for the band's search-island count. */
  onCountChange?: (count: number) => void
  /**
   * Reports the diagram types actually present in the loaded data up for the
   * band's Refine "Type" block — matching the old Type filter's option list.
   */
  onTypeOptionsChange?: (types: readonly UMLDiagramType[]) => void
}

export const DiagramGallery = ({
  chrome,
  highlightSharedDiagramId = null,
  onCountChange,
  onTypeOptionsChange,
}: DiagramGalleryProps) => {
  const models = usePersistenceModelStore((state) => state.models)
  const toggleFavorite = usePersistenceModelStore(
    (state) => state.toggleFavorite
  )

  // Refinement inputs read from the shared chrome (band + gallery share one
  // source of truth). Local-only here: the heavy data + pagination concerns.
  const searchTerm = chrome.searchTerm
  const selectedDiagramType = chrome.type
  const sortBy = chrome.sort.field
  const sortOrder = chrome.sort.order
  const diagramSource = chrome.source as DiagramSourceFilter
  const showFavoritesOnly = chrome.favoritesOnly

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
    () => Array.from(new Set(allDiagrams.map((diagram) => diagram.type))),
    [allDiagrams]
  )

  // Report the present-type list up so the band's Refine "Type" block offers
  // only the types actually present in the loaded data.
  useEffect(() => {
    onTypeOptionsChange?.(diagramTypeOptions)
  }, [diagramTypeOptions, onTypeOptionsChange])

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

  // Report the filtered result total up for the band's search-island count.
  useEffect(() => {
    onCountChange?.(filteredDiagrams.length)
  }, [filteredDiagrams.length, onCountChange])

  const deferredFilteredDiagrams = useDeferredValue(filteredDiagrams)
  const isPending = deferredFilteredDiagrams !== filteredDiagrams

  // Reset pagination to the first page whenever a refinement narrows the list,
  // so the user always lands at the top of the freshly-filtered results. (The
  // old toolbar did this inline on every control change.)
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT)
  }, [
    searchTerm,
    selectedDiagramType,
    showFavoritesOnly,
    sortBy,
    sortOrder,
    diagramSource,
  ])

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

  const isAllDiagramSource = diagramSource === "all"

  useEffect(() => {
    if (!highlightSharedDiagramId) return
    chrome.setSource("shared")
    setHighlightedDiagramId(highlightSharedDiagramId)
    const timer = window.setTimeout(() => setHighlightedDiagramId(null), 2400)
    return () => window.clearTimeout(timer)
    // chrome.setSource is a stable setter; depend only on the highlight id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightSharedDiagramId])

  const thumbnailViewportPriority = useThumbnailViewportPriority()
  const loadingThumbnailIds = useDiagramThumbnailWarmup({
    visibleDiagrams,
    isPending,
    isDiagramEmpty,
    viewportPriority: thumbnailViewportPriority,
  })

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
      <div className="space-y-6">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setSharedReloadKey((current) => current + 1)}
                  >
                    Try again
                  </Button>
                )}
            </div>
          </div>
        ) : (
          <>
            {filteredDiagrams.length > 0 ? (
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
                      // Same conditions that drove the old preview booleans,
                      // collapsed to one bounded axis (expired › placeholder ›
                      // loading › thumbnail). The container finalizes loading vs
                      // thumbnail against the actual thumbnail data.
                      previewState={
                        diagram.isExpired
                          ? "expired"
                          : isDiagramEmpty(diagram)
                            ? "placeholder"
                            : loadingThumbnailIds[diagram.id]
                              ? "loading"
                              : "thumbnail"
                      }
                      showSourceBadge={isAllDiagramSource}
                      isHighlighted={diagram.id === highlightedDiagramId}
                      onToggleFavorite={handleToggleDiagramFavorite}
                      onSharedDiagramRemoved={handleRemoveSharedDiagram}
                      onSharedDiagramViewChange={handleSharedDiagramViewChange}
                      observeViewport={thumbnailViewportPriority.observe}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[480px] flex-col items-center justify-center gap-6 text-center transition-colors duration-200">
                <EmptyStateIllustration />
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-lg font-semibold text-foreground transition-colors duration-200">
                    No matches
                  </p>
                  <p className="max-w-xs text-center text-sm text-muted-foreground">
                    No diagrams match your search and filters.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={chrome.resetAll}
                  >
                    Clear filters
                  </Button>
                </div>
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
