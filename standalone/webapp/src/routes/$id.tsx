import { createFileRoute, redirect } from "@tanstack/react-router"
import { ErrorPage } from "@/pages/ErrorPage"
import { DiagramView } from "@/types/ModalTypes"

/**
 * Legacy single-segment route (`/:id`) from the native iOS app, which linked
 * collaborative diagrams as `/<id>?view=<mode>`. We forward those to the
 * canonical `/shared/<id>` route; anything without a `?view` was never a valid
 * diagram link, so it falls through to the 404 page.
 *
 * A `beforeLoad` redirect runs before render, so there's no flash of ErrorPage.
 * The target route's `validateSearch` re-sanitises the forwarded view/version.
 */
export const Route = createFileRoute("/$id")({
  // Passthrough so `beforeLoad` sees the raw `?view`/`?version` it must forward.
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ params, search }) => {
    if ("view" in search) {
      throw redirect({
        to: "/shared/$diagramId",
        params: { diagramId: params.id },
        search: {
          view: search.view as DiagramView | undefined,
          version: search.version as string | undefined,
        },
        replace: true,
      })
    }
  },
  component: ErrorPage,
})
