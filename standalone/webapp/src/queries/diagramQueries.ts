import {
  queryOptions,
  useQuery,
  CancelledError,
  type QueryClient,
} from "@tanstack/react-query"
import { DiagramApiClient } from "@/services/DiagramApiClient"
import type { Diagram } from "@/types"
import { diagramKeys } from "./keys"

/**
 * One-shot editor seed: the first response is what `new ApollonEditor({ model })`
 * mounts with, and Yjs owns the canvas from then on.
 *
 * - `staleTime: Infinity` — a background refetch would clobber live collab state.
 * - `gcTime: 0` — re-joining a room re-fetches. One extra GET is cheaper than
 *   seeding the editor with a body peers have already moved past.
 *
 * Post-mount HEAD reads belong on {@link diagramHeadQueryOptions}, never here.
 */
export function diagramSeedQueryOptions(diagramId: string) {
  return queryOptions({
    queryKey: diagramKeys.seed(diagramId),
    queryFn: ({ signal }): Promise<Diagram> =>
      DiagramApiClient.fetchDiagram(diagramId, { signal }),
    staleTime: Infinity,
    gcTime: 0,
    // A failed seed redirects home; don't sit on the overlay through a full
    // backoff run, but absorb one transient blip.
    retry: 1,
  })
}

export function useDiagramSeedQuery(
  diagramId: string,
  opts: { enabled?: boolean } = {}
) {
  return useQuery({
    ...diagramSeedQueryOptions(diagramId),
    enabled: opts.enabled ?? true,
  })
}

export type HeadFetchReason = "peer-restore" | "preview-exit"

/**
 * Latest HEAD, for imperative `editor.model = …` assignments. Separate from the
 * seed: writing a fresh body into the seed entry would change its `data`
 * identity and rebuild the editor + WebSocket + autosaver from the page's
 * mount effect.
 *
 * `reason` is in the key because `cancelQueries` matches by key, and each
 * caller's cleanup must only abort its own request. Callers swallow the
 * resulting {@link CancelledError} via {@link isQueryCancellation}.
 */
export function diagramHeadQueryOptions(
  diagramId: string,
  reason: HeadFetchReason
) {
  return queryOptions({
    queryKey: diagramKeys.head(diagramId, reason),
    queryFn: ({ signal }): Promise<Diagram> =>
      DiagramApiClient.fetchDiagram(diagramId, { signal }),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  })
}

export function fetchFreshDiagram(
  queryClient: QueryClient,
  diagramId: string,
  reason: HeadFetchReason
): Promise<Diagram> {
  return queryClient.fetchQuery(diagramHeadQueryOptions(diagramId, reason))
}

/** True for rejections caused by `cancelQueries` / fetch abortion. */
export function isQueryCancellation(err: unknown): boolean {
  return (
    err instanceof CancelledError ||
    (err instanceof DOMException && err.name === "AbortError")
  )
}
