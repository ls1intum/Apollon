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
 * Yjs ↔ Query contract for the shared-editor diagram body
 * ========================================================
 * The seed query is a ONE-SHOT loader: its first successful response is what
 * `new ApollonEditor({ model })` mounts with. From that moment on, the Yjs
 * document (via `WebSocketManager`) is the source of truth for the canvas —
 * the cache entry must never be refreshed behind the editor's back.
 *
 * - `staleTime: Infinity` — never refetched while the page is mounted; a
 *   `refetchInterval`/focus refetch here would clobber live collab state.
 * - `gcTime: 0` — dropped the moment the page unmounts, so re-joining the
 *   same room always re-fetches (peers may have committed new state). One
 *   extra GET on remount is cheap; seeding a stale body is a correctness bug.
 *
 * The only legitimate post-mount body fetches are the two imperative HEAD
 * reads (peer VERSION_RESTORED, preview-exit after a restore). Those go
 * through {@link diagramHeadQueryOptions} — a separate cache key — so they can
 * never change the seed's `data` identity and remount the editor stack.
 */
export function diagramSeedQueryOptions(diagramId: string) {
  return queryOptions({
    queryKey: diagramKeys.seed(diagramId),
    queryFn: ({ signal }): Promise<Diagram> =>
      DiagramApiClient.fetchDiagram(diagramId, { signal }),
    staleTime: Infinity,
    gcTime: 0,
    // A failed seed redirects the user home; retry once for transient network
    // flakes but don't sit on the loading overlay through a full backoff run.
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
 * Latest-HEAD fetch for imperative `editor.model = …` assignments. Always hits
 * the network (`staleTime: 0`) and never lingers (`gcTime: 0`).
 *
 * `reason` is part of the key so each caller owns its own cancellation scope:
 * `cancelQueries` matches by key, so sharing one would let one caller's
 * cleanup abort the other's in-flight fetch. Cancel with
 * `queryClient.cancelQueries({ queryKey: diagramKeys.head(id, reason) })` —
 * callers must swallow the resulting {@link CancelledError} via
 * {@link isQueryCancellation}.
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
