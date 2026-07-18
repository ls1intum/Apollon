import { createFileRoute } from "@tanstack/react-router"
import { ApollonShared } from "@/pages/ApollonShared"
import { VersionRepositoryProvider } from "@/contexts/VersionRepositoryContext"
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
  // The route is what makes this the remote backend, so it declares the kind
  // the version hooks resolve their adapter and cache keys from.
  component: () => (
    <VersionRepositoryProvider kind="remote">
      <ApollonShared />
    </VersionRepositoryProvider>
  ),
})
