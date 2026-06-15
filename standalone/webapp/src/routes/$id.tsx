import { createFileRoute, redirect } from "@tanstack/react-router"
import { ErrorPage } from "@/pages/ErrorPage"
import type { DiagramView } from "@/types/ModalTypes"
import { isDiagramView } from "@/utils/sharedDiagramLinks"

/**
 * Legacy single-segment route (`/:id`) from the native iOS app, which linked
 * collaborative diagrams as `/<id>?view=<mode>`. A `beforeLoad` redirect
 * forwards those to the canonical `/shared/<id>` (before render, so no flash of
 * ErrorPage); anything without a valid `?view` falls through to the 404 page.
 */
type LegacySearch = { view?: DiagramView; version?: string }

export const Route = createFileRoute("/$id")({
  validateSearch: (search: Record<string, unknown>): LegacySearch => ({
    view: isDiagramView(search.view) ? search.view : undefined,
    version: typeof search.version === "string" ? search.version : undefined,
  }),
  beforeLoad: ({ params, search }) => {
    if (search.view) {
      throw redirect({
        to: "/shared/$diagramId",
        params: { diagramId: params.id },
        search,
        replace: true,
      })
    }
  },
  component: ErrorPage,
})
