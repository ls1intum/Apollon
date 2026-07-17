import type { ReactElement, ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { VersionRepositoryProvider } from "@/contexts/VersionRepositoryContext"
import type { RepositoryKind } from "@/services/versionRepository"

/**
 * Per-test QueryClient: no retries (a failing queryFn should fail the test
 * immediately, not after backoff) and no gc timers to fight fake timers.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  })
}

interface WithQueryOptions {
  queryClient?: QueryClient
  /**
   * Backend the versioning UI under test talks to. Mirrors what the editor
   * routes provide in production; omit for non-versioning components.
   */
  repositoryKind?: RepositoryKind
}

/** Wrap UI in a fresh (or provided) query client + repository kind. */
export function wrapWithQueryClient(
  ui: ReactNode,
  opts: WithQueryOptions = {}
): { element: ReactElement; queryClient: QueryClient } {
  const queryClient = opts.queryClient ?? createTestQueryClient()
  const kind = opts.repositoryKind ?? "remote"
  return {
    element: (
      <QueryClientProvider client={queryClient}>
        <VersionRepositoryProvider kind={kind}>{ui}</VersionRepositoryProvider>
      </QueryClientProvider>
    ),
    queryClient,
  }
}

/** `render` with an isolated QueryClient; returns the client for assertions. */
export function renderWithQuery(ui: ReactElement, opts: WithQueryOptions = {}) {
  const { element, queryClient } = wrapWithQueryClient(ui, opts)
  return { ...render(element), queryClient }
}
