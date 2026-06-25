import { useCallback, useMemo, useState } from "react"
import type { UMLDiagramType } from "@tumaet/apollon"
import { getDiagramTypeLabel } from "./diagramTypeMeta"

/**
 * Shared home-chrome refinement state — the single source of truth for the
 * Home Island Band's search / favorites / source / type / sort controls.
 *
 * It is lifted out of `DiagramGallery` VERBATIM (same option lists, same field
 * names, same defaults) so Phase 3 can drop it in: `DiagramGallery` keeps its
 * heavy data-loading concerns (models, shared fetch, infinite scroll) and reads
 * its refinement state from this hook instead of its own `useState` cluster.
 *
 * Nothing here touches the editor, the router, or any store — it is pure UI
 * state + derived chip metadata, so the band can mount in isolation (Storybook)
 * with no providers.
 */

/** Source filter — mirrors `DiagramSourceFilter` in DiagramGallery. */
export type HomeSource = "all" | "local" | "shared"

/** Type filter — `"all"` or any concrete UML diagram type. */
export type HomeTypeFilter = "all" | UMLDiagramType

/** Sort field — mirrors `DiagramSortBy` in DiagramGallery. */
export type HomeSortField = "alphabetical" | "dateCreated" | "lastModified"

/** Sort order — mirrors `DiagramOrder` in DiagramGallery. */
export type HomeSortOrder = "oldest" | "newest"

export type HomeSort = {
  field: HomeSortField
  order: HomeSortOrder
}

/** Default sort = "Last modified · Newest first" (DiagramGallery's default). */
export const DEFAULT_HOME_SORT: HomeSort = {
  field: "lastModified",
  order: "newest",
}

/** Source options for the Refine block — labels match DiagramGallery's tabs. */
export const HOME_SOURCE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "local", label: "Local" },
  { value: "shared", label: "Shared" },
] satisfies readonly { value: HomeSource; label: string }[]

/** Sort-field options for the Refine block (DiagramGallery's "Sort by"). */
export const HOME_SORT_FIELD_OPTIONS = [
  { value: "alphabetical", label: "Alphabetical" },
  { value: "dateCreated", label: "Date created" },
  { value: "lastModified", label: "Last modified" },
] satisfies readonly { value: HomeSortField; label: string }[]

/** Sort-order options for the Refine block (DiagramGallery's "Order"). */
export const HOME_SORT_ORDER_OPTIONS = [
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
] satisfies readonly { value: HomeSortOrder; label: string }[]

const sourceLabel = (source: HomeSource) =>
  HOME_SOURCE_OPTIONS.find((option) => option.value === source)?.label ?? source

const sortFieldLabel = (field: HomeSortField) =>
  HOME_SORT_FIELD_OPTIONS.find((option) => option.value === field)?.label ??
  field

const sortOrderLabel = (order: HomeSortOrder) =>
  HOME_SORT_ORDER_OPTIONS.find((option) => option.value === order)?.label ??
  order

/**
 * The kinds of refinement a chip can represent. `clear` resets that one facet
 * back to its default; the band renders one removable chip per active item.
 */
export type RefinementKind = "favorites" | "source" | "type" | "sort"

export type ActiveRefinement = {
  /** Stable key for React lists + tests. */
  key: RefinementKind
  /** Human-readable chip text (e.g. "Shared", "Class Diagram", "A → Z"). */
  label: string
  /** Resets just this facet to its default. */
  clear: () => void
}

export type HomeChrome = {
  searchTerm: string
  setSearchTerm: (value: string) => void

  favoritesOnly: boolean
  setFavoritesOnly: (value: boolean) => void
  toggleFavoritesOnly: () => void

  source: HomeSource
  setSource: (value: HomeSource) => void

  type: HomeTypeFilter
  setType: (value: HomeTypeFilter) => void

  sort: HomeSort
  setSort: (value: HomeSort) => void
  setSortField: (field: HomeSortField) => void
  setSortOrder: (order: HomeSortOrder) => void

  /** Reset every refinement (search included) to its default. */
  resetAll: () => void

  /**
   * One entry per ACTIVE refinement (source≠all, type≠all, non-default sort,
   * favorites on) — drives the removable chip line. Search is deliberately NOT
   * a chip (it has its own visible field), matching the brief.
   */
  activeRefinements: ActiveRefinement[]

  /**
   * Count of active refinements that live in the Refine popover (source, type,
   * sort) — drives the Refine button's count Badge. Favorites is the band/pill
   * star, so it is excluded here even though it still earns a chip.
   */
  refineCount: number
}

const isDefaultSort = (sort: HomeSort) =>
  sort.field === DEFAULT_HOME_SORT.field &&
  sort.order === DEFAULT_HOME_SORT.order

export function useHomeChrome(initialSearchTerm = ""): HomeChrome {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [source, setSource] = useState<HomeSource>("all")
  const [type, setType] = useState<HomeTypeFilter>("all")
  const [sort, setSort] = useState<HomeSort>(DEFAULT_HOME_SORT)

  const toggleFavoritesOnly = useCallback(
    () => setFavoritesOnly((current) => !current),
    []
  )

  const setSortField = useCallback(
    (field: HomeSortField) => setSort((current) => ({ ...current, field })),
    []
  )

  const setSortOrder = useCallback(
    (order: HomeSortOrder) => setSort((current) => ({ ...current, order })),
    []
  )

  const resetAll = useCallback(() => {
    setSearchTerm("")
    setFavoritesOnly(false)
    setSource("all")
    setType("all")
    setSort(DEFAULT_HOME_SORT)
  }, [])

  const activeRefinements = useMemo<ActiveRefinement[]>(() => {
    const chips: ActiveRefinement[] = []

    if (favoritesOnly) {
      chips.push({
        key: "favorites",
        label: "Favorites",
        clear: () => setFavoritesOnly(false),
      })
    }

    if (source !== "all") {
      chips.push({
        key: "source",
        label: sourceLabel(source),
        clear: () => setSource("all"),
      })
    }

    if (type !== "all") {
      chips.push({
        key: "type",
        label: getDiagramTypeLabel(type),
        clear: () => setType("all"),
      })
    }

    if (!isDefaultSort(sort)) {
      chips.push({
        key: "sort",
        label: `${sortFieldLabel(sort.field)} · ${sortOrderLabel(sort.order)}`,
        clear: () => setSort(DEFAULT_HOME_SORT),
      })
    }

    return chips
  }, [favoritesOnly, source, type, sort])

  // Refine button badge counts only the popover-housed facets.
  const refineCount = useMemo(
    () =>
      (source !== "all" ? 1 : 0) +
      (type !== "all" ? 1 : 0) +
      (isDefaultSort(sort) ? 0 : 1),
    [source, type, sort]
  )

  return {
    searchTerm,
    setSearchTerm,
    favoritesOnly,
    setFavoritesOnly,
    toggleFavoritesOnly,
    source,
    setSource,
    type,
    setType,
    sort,
    setSort,
    setSortField,
    setSortOrder,
    resetAll,
    activeRefinements,
    refineCount,
  }
}
