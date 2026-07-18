import { createFileRoute } from "@tanstack/react-router"
import { ApollonLocal } from "@/pages/ApollonLocal"
import { VersionRepositoryProvider } from "@/contexts/VersionRepositoryContext"

/** Local (offline, IndexedDB-backed) editor. `?version=<id>` previews a saved version. */
type LocalSearch = { version?: string }

export const Route = createFileRoute("/local/$id")({
  validateSearch: (search: Record<string, unknown>): LocalSearch => ({
    version: typeof search.version === "string" ? search.version : undefined,
  }),
  // The route is what makes this the local backend, so it declares the kind
  // the version hooks resolve their adapter and cache keys from.
  component: () => (
    <VersionRepositoryProvider kind="local">
      <ApollonLocal />
    </VersionRepositoryProvider>
  ),
})
