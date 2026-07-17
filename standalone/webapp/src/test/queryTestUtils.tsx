import type { ReactElement, ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"

/**
 * Per-test QueryClient: no retries (a failing queryFn should fail the test
 * immediately, not after backoff), infinite gcTime (v5 garbage collection
 * uses timers that fight fake-timer tests), and no focus refetching.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  })
}

interface WithQueryOptions {
  queryClient?: QueryClient
}

/** Wrap arbitrary UI in a fresh (or provided) QueryClientProvider. */
export function wrapWithQueryClient(
  ui: ReactNode,
  opts: WithQueryOptions = {}
): { element: ReactElement; queryClient: QueryClient } {
  const queryClient = opts.queryClient ?? createTestQueryClient()
  return {
    element: (
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    ),
    queryClient,
  }
}

/** `render` with an isolated QueryClient; returns the client for assertions. */
export function renderWithQuery(ui: ReactElement, opts: WithQueryOptions = {}) {
  const { element, queryClient } = wrapWithQueryClient(ui, opts)
  return { ...render(element), queryClient }
}
