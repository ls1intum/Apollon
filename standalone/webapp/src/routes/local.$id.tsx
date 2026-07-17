import { createFileRoute } from "@tanstack/react-router"
import { ApollonLocal } from "@/pages/ApollonLocal"
import {
  LocalVersionRepository,
  setVersionRepository,
} from "@/services/versionRepository"

/** Local (offline, IndexedDB-backed) editor. `?version=<id>` previews a saved version. */
type LocalSearch = { version?: string }

export const Route = createFileRoute("/local/$id")({
  validateSearch: (search: Record<string, unknown>): LocalSearch => ({
    version: typeof search.version === "string" ? search.version : undefined,
  }),
  // Bind the version-repository adapter BEFORE anything renders so version
  // queries fired from child components never race the binding (child effects
  // run before parent effects, which made effect-time binding fragile).
  // Gated on `preload`: a hover-preload must not flip the module global under
  // a mounted editor of the other mode.
  beforeLoad: ({ preload }) => {
    if (!preload) setVersionRepository(LocalVersionRepository)
  },
  component: ApollonLocal,
})
