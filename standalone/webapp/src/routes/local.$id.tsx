import { createFileRoute } from "@tanstack/react-router"
import { ApollonLocal } from "@/pages/ApollonLocal"

/** Local (offline, IndexedDB-backed) editor. `?version=<id>` previews a saved version. */
type LocalSearch = { version?: string }

export const Route = createFileRoute("/local/$id")({
  validateSearch: (search: Record<string, unknown>): LocalSearch => ({
    version: typeof search.version === "string" ? search.version : undefined,
  }),
  component: ApollonLocal,
})
