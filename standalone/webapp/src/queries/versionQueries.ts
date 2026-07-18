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

const VERSIONS_PAGE_SIZE = 25

export type VersionListData = InfiniteData<
  ListVersionsResponse,
  string | undefined
>

/**
 * Version history, cursor-paginated ("Load older" appends a page).
 *
 * Focus refetching is OFF here and opted into by the open panel alone (see
 * {@link useVersionsQuery}). The realtime bridges — WS control events for the
 * collab backend, BroadcastChannel for the local one — are the reconciliation
 * path; a tab-focus refetch is only a safety net for events missed while the
 * socket was down, and it is worth paying for exactly when the user is looking
 * at the list.
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
    refetchOnWindowFocus: false,
  })
}

interface FlatVersionList {
  versions: PendingVersion[]
  /** Total from the last-fetched page; all pages refetch together, so they agree. */
  total: number
}

// Module-level so TanStack memoises the derived value per `data` rather than
// recomputing it on every render.
const selectFlatVersionList = (data: VersionListData): FlatVersionList => ({
  versions: data.pages.flatMap((page) => page.versions),
  total: data.pages[data.pages.length - 1]?.total ?? 0,
})

/**
 * Flattened version list for UI consumers (drawer, preview banner, pages).
 *
 * `refetchOnFocus` should be true only for the panel that actually displays
 * the list, which is mounted only while it is open. Pages that subscribe for
 * incidental reads (a restore label) leave it off, so a user who never opens
 * the panel costs nothing on tab focus — the same bargain the pre-Query code
 * struck by iterating only open drawers on `visibilitychange`.
 */
export function useVersionsQuery(
  kind: RepositoryKind,
  diagramId: string,
  opts: { refetchOnFocus?: boolean } = {}
) {
  return useInfiniteQuery({
    ...versionListQueryOptions(kind, diagramId),
    refetchOnWindowFocus: opts.refetchOnFocus ?? false,
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
