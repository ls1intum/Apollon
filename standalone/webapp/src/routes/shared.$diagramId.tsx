import { createFileRoute } from "@tanstack/react-router"
import { ApollonWithConnection } from "@/pages/ApollonWithConnection"
import { DiagramView } from "@/types/ModalTypes"

/**
 * Collaborative (server + Yjs) editor. `?view` selects the editor mode (all
 * four `DiagramView` members, incl. COLLABORATE), `?version=<id>` previews a
 * saved version.
 */
type SharedSearch = { view?: DiagramView; version?: string }

const isDiagramView = (value: unknown): value is DiagramView =>
  typeof value === "string" &&
  (Object.values(DiagramView) as string[]).includes(value)

export const Route = createFileRoute("/shared/$diagramId")({
  // Zero-dependency typed search; invalid `view` collapses to undefined and the
  // page's existing missing-view guard handles it (toast + redirect home).
  validateSearch: (search: Record<string, unknown>): SharedSearch => ({
    view: isDiagramView(search.view) ? search.view : undefined,
    version: typeof search.version === "string" ? search.version : undefined,
  }),
  component: ApollonWithConnection,
})
