import { createFileRoute } from "@tanstack/react-router"
import { ApollonShared } from "@/pages/ApollonShared"
import {
  RemoteVersionRepository,
  setVersionRepository,
} from "@/services/versionRepository"
import type { DiagramView } from "@/types/ModalTypes"
import { isDiagramView } from "@/utils/sharedDiagramLinks"

/**
 * Collaborative (server + Yjs) editor. `?view` selects the editor mode (all
 * four `DiagramView` members, incl. COLLABORATE), `?version=<id>` previews a
 * saved version.
 */
type SharedSearch = { view?: DiagramView; version?: string }

export const Route = createFileRoute("/shared/$diagramId")({
  // Invalid `view` collapses to undefined; the page's missing-view guard then
  // toasts and redirects home.
  validateSearch: (search: Record<string, unknown>): SharedSearch => ({
    view: isDiagramView(search.view) ? search.view : undefined,
    version: typeof search.version === "string" ? search.version : undefined,
  }),
  // Bind the version-repository adapter BEFORE anything renders so version
  // queries fired from child components never race the binding (child effects
  // run before parent effects, which made effect-time binding fragile).
  // Gated on `preload`: a hover-preload must not flip the module global under
  // a mounted editor of the other mode.
  beforeLoad: ({ preload }) => {
    if (!preload) setVersionRepository(RemoteVersionRepository)
  },
  component: ApollonShared,
})
