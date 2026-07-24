import type { ReactElement, ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { VersionRepositoryProvider } from "@/contexts/VersionRepositoryContext"
import type { RepositoryKind } from "@/services/versionRepository"

/** Per-test QueryClient: no retries, so a failing queryFn fails the test now. */
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

/**
 * Wrap UI in a fresh query client + the versioning backend kind the editor
 * routes supply in production. `kind` defaults to "remote"; pass "local" for
 * the IndexedDB path.
 */
export function wrapWithQueryClient(
  ui: ReactNode,
  kind: RepositoryKind = "remote"
): ReactElement {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <VersionRepositoryProvider kind={kind}>{ui}</VersionRepositoryProvider>
    </QueryClientProvider>
  )
}

/** `render` under a fresh query client + repository kind. */
export function renderWithQuery(ui: ReactElement, kind?: RepositoryKind) {
  return render(wrapWithQueryClient(ui, kind))
}
