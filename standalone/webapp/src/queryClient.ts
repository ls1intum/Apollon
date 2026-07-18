import { QueryCache, QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/services/DiagramApiClient"
import { log } from "@/logger"

/**
 * App-wide QueryClient. TanStack Query owns request/response server state
 * (diagram seed fetch, version history, version bodies); it does NOT own the
 * live collaborative document — Yjs over `WebSocketManager` is the source of
 * truth for the mounted editor. Keep that boundary: never mirror Yjs state
 * into the query cache, and never drive editor content from a background
 * refetch. The editor seed is not a query at all — see `hooks/useDiagramSeed`.
 *
 * - `refetchOnWindowFocus` is off globally: the WS control channel already
 *   pushes version/diagram changes, and a focus refetch of the diagram seed
 *   would fight the Yjs document. The versions list opts back in per-query.
 * - 4xx responses are contract errors, not transport hiccups — never retried.
 *   Transport/5xx failures retry twice.
 */
export const queryClient = new QueryClient({
  // Cache-level, not observer-level: a query two components read would log twice.
  queryCache: new QueryCache({
    onError: (error, query) =>
      log.warn(
        "Query failed",
        JSON.stringify(query.queryKey),
        error instanceof Error ? error.message : String(error)
      ),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
