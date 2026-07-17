import { useState } from "react"
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
  type VersionRepository,
} from "@/services/versionRepository"
import type { Diagram, PendingVersion } from "@/types"
import { versionKeys, type RepositoryKind } from "./keys"

export const VERSIONS_PAGE_SIZE = 25

export type VersionListData = InfiniteData<
  ListVersionsResponse,
  string | undefined
>

/**
 * Version history list, cursor-paginated ("Load older" appends a page).
 *
 * - `staleTime: 0` + `refetchOnWindowFocus: true`: the list must reconcile
 *   whenever the user returns to the tab — this replaces the old
 *   `versionStoreBootstrap` visibilitychange handler. Because a query only
 *   refetches while a consumer is mounted, a closed drawer costs nothing
 *   (parity with the old "only refetch open drawers" loop).
 * - The repository adapter is captured at options-build time (bound by the
 *   editor route's `beforeLoad`), so the key's `kind` and the `queryFn`'s
 *   backend can never disagree.
 */
export function versionListQueryOptions(
  repo: VersionRepository,
  diagramId: string
) {
  // `repo` IS represented in the key — `versionKeys.list` embeds
  // `repo.kind`, and the adapter registry holds one instance per kind.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  return infiniteQueryOptions({
    queryKey: versionKeys.list(repo.kind, diagramId),
    queryFn: ({ pageParam, signal }) =>
      repo.list(diagramId, {
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

// Module-level so the select identity is stable and TanStack memoises the
// derived value per structural-shared `data` instead of per render.
const selectFlatVersionList = (data: VersionListData): FlatVersionList => ({
  versions: data.pages.flatMap((page) => page.versions),
  total: data.pages[data.pages.length - 1]?.total ?? 0,
})

/**
 * Snapshot the bound repository adapter for this component's lifetime.
 *
 * The registry is a module global that the editor routes rebind in
 * `beforeLoad` — which runs while the OUTGOING page is still mounted. Reading
 * it on every render would let a `/local/:id → /shared/:id` navigation re-key
 * the outgoing page's queries onto the incoming adapter (a local id fetched
 * over REST). A mount-time snapshot pins each mounted consumer to the adapter
 * it was rendered under, and keeps render pure.
 */
export function useBoundRepository(): VersionRepository {
  const [repo] = useState(getVersionRepository)
  return repo
}

/** Flattened version list for UI consumers (drawer, preview banner, pages). */
export function useVersionsQuery(diagramId: string) {
  const repo = useBoundRepository()
  return useInfiniteQuery({
    ...versionListQueryOptions(repo, diagramId),
    select: selectFlatVersionList,
  })
}

/**
 * Immutable version body. `staleTime: Infinity` — a snapshot never changes, so
 * one fetch serves thumbnails, preview entry, and the drawer's dirty-check
 * baseline alike (they all share this key).
 */
export function versionBodyQueryOptions(
  repo: VersionRepository,
  diagramId: string,
  versionId: string
) {
  // `repo` IS represented in the key — `versionKeys.body` embeds
  // `repo.kind`, and the adapter registry holds one instance per kind.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  return queryOptions({
    queryKey: versionKeys.body(repo.kind, diagramId, versionId),
    queryFn: ({ signal }): Promise<Diagram> =>
      repo.getBody(diagramId, versionId, { signal }),
    staleTime: Infinity,
  })
}

/**
 * Lazily fetched version body. `enabled` is the visibility/interest gate —
 * e.g. the thumbnail's IntersectionObserver — replacing hand-rolled
 * `cancelled` flags: an off-screen row simply never starts the request.
 */
export function useVersionBodyQuery(
  diagramId: string,
  versionId: string,
  opts: { enabled?: boolean } = {}
) {
  const repo = useBoundRepository()
  return useQuery({
    ...versionBodyQueryOptions(repo, diagramId, versionId),
    enabled: opts.enabled ?? true,
  })
}

/**
 * Imperative body read through the shared cache (preview entry, dirty-check
 * baselines). Takes the adapter explicitly — callers hold the one their UI is
 * bound to (see {@link useBoundRepository}), so an in-flight navigation can't
 * redirect the read to the other backend.
 */
export function fetchVersionBody(
  queryClient: QueryClient,
  repo: VersionRepository,
  diagramId: string,
  versionId: string
): Promise<Diagram> {
  return queryClient.fetchQuery(
    versionBodyQueryOptions(repo, diagramId, versionId)
  )
}

/**
 * Warm the version list from the editor pages so the drawer/banner open onto
 * data instead of a skeleton, and post-restore snackbar labels resolve.
 */
export function prefetchVersions(
  queryClient: QueryClient,
  repo: VersionRepository,
  diagramId: string
): Promise<void> {
  return queryClient.prefetchInfiniteQuery(
    versionListQueryOptions(repo, diagramId)
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
