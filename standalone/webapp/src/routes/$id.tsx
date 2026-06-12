import { createFileRoute, redirect } from "@tanstack/react-router"
import { ErrorPage } from "@/pages/ErrorPage"

/**
 * Legacy single-segment route (`/:id`) from the native iOS app, which linked
 * collaborative diagrams as `/<id>?view=<mode>`. We forward those to the
 * canonical `/shared/<id>` route; anything without a `?view` was never a valid
 * diagram link, so it falls through to the 404 page.
 *
 * Done as a route-level `beforeLoad` redirect (runs before render, no flash of
 * ErrorPage) rather than the old `<Navigate>` component. The target route's
 * `validateSearch` sanitises the forwarded `view`/`version`.
 */
export const Route = createFileRoute("/$id")({
  // Passthrough so `beforeLoad` sees the raw `?view`/`?version` it must forward.
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ params, search }) => {
    if (params.id && "view" in search) {
      throw redirect({
        to: "/shared/$diagramId",
        params: { diagramId: params.id },
        // Re-validated by the target route; encoding handled by the router.
        search: search as { view?: string; version?: string },
        replace: true,
      })
    }
  },
  component: ErrorPage,
})
