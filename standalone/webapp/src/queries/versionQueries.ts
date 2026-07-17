import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query"
import {
  getVersionRepository,
  type ListVersionsResponse,
  type RepositoryKind,
} from "@/services/versionRepository"
import type { Diagram, PendingVersion } from "@/types"
import { versionKeys } from "./keys"

export const VERSIONS_PAGE_SIZE = 25

export type VersionListData = InfiniteData<
  ListVersionsResponse,
  string | undefined
>

/**
 * Version history, cursor-paginated ("Load older" appends a page).
 *
 * `staleTime: 0` + `refetchOnWindowFocus` reconciles the list whenever the
 * user returns to the tab, which is the only catch-up path while the control
 * channel is down. A closed drawer costs nothing: an unmounted query has no
 * observer to refetch for.
 */
export function versionListQueryOptions(
  kind: RepositoryKind,
  diagramId: string
) {
  return infiniteQueryOptions({
    queryKey: versionKeys.list(kind, diagramId),
    queryFn: ({ pageParam, signal }) =>
      getVersionRepository(kind).list(diagramId, {
        limit: VERSIONS_PAGE_SIZE,
        before: pageParam,
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

interface FlatVersionList {
  versions: PendingVersion[]
  /** Server-reported total across all pages (freshest page wins). */
  total: number
}

// Module-level so TanStack memoises the derived value per `data` rather than
// recomputing it on every render.
const selectFlatVersionList = (data: VersionListData): FlatVersionList => ({
  versions: data.pages.flatMap((page) => page.versions),
  total: data.pages[data.pages.length - 1]?.total ?? 0,
})

/** Flattened version list for UI consumers (drawer, preview banner, pages). */
export function useVersionsQuery(kind: RepositoryKind, diagramId: string) {
  return useInfiniteQuery({
    ...versionListQueryOptions(kind, diagramId),
    select: selectFlatVersionList,
  })
}

/**
 * A snapshot body never changes, so one fetch serves thumbnails, preview
 * entry, and the drawer's dirty-check baseline alike.
 */
export function versionBodyQueryOptions(
  kind: RepositoryKind,
  diagramId: string,
  versionId: string
) {
  return queryOptions({
    queryKey: versionKeys.body(kind, diagramId, versionId),
    queryFn: ({ signal }): Promise<Diagram> =>
      getVersionRepository(kind).getBody(diagramId, versionId, { signal }),
    staleTime: Infinity,
  })
}

/**
 * Lazily fetched version body. `enabled` is the caller's interest gate — e.g.
 * the thumbnail's IntersectionObserver — so an off-screen row never requests.
 */
export function useVersionBodyQuery(
  kind: RepositoryKind,
  diagramId: string,
  versionId: string,
  opts: { enabled?: boolean } = {}
) {
  return useQuery({
    ...versionBodyQueryOptions(kind, diagramId, versionId),
    enabled: opts.enabled ?? true,
  })
}

/** Imperative body read through the shared cache (preview entry, baselines). */
export function fetchVersionBody(
  queryClient: QueryClient,
  kind: RepositoryKind,
  diagramId: string,
  versionId: string
): Promise<Diagram> {
  return queryClient.fetchQuery(
    versionBodyQueryOptions(kind, diagramId, versionId)
  )
}

/**
 * Warm the version list from the editor pages so the drawer and banner open
 * onto data, and post-restore snackbar labels resolve without a round-trip.
 */
export function prefetchVersions(
  queryClient: QueryClient,
  kind: RepositoryKind,
  diagramId: string
): Promise<void> {
  return queryClient.prefetchInfiniteQuery(
    versionListQueryOptions(kind, diagramId)
  )
}

/** Synchronous cached-list read (name lookups, event-bridge dedup checks). */
export function getCachedVersions(
  queryClient: QueryClient,
  kind: RepositoryKind,
  diagramId: string
): PendingVersion[] | undefined {
  const data = queryClient.getQueryData<VersionListData>(
    versionKeys.list(kind, diagramId)
  )
  return data?.pages.flatMap((page) => page.versions)
}
