import type { ReactNode } from "react"
import { render } from "@testing-library/react"
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"

interface RenderWithRouterOptions {
  /** URL seeded into memory history, e.g. `/shared/abc?view=COLLABORATE`. Default `/`. */
  initialEntry?: string
  /**
   * Route templates the `ui` mounts under — must cover every route the
   * component reads via `getRouteApi(...)` and navigates to. Default `["/"]`.
   */
  routePaths?: string[]
  /** Wraps the whole tree (e.g. context providers above the router). */
  wrapper?: (children: ReactNode) => ReactNode
}

/**
 * Renders `ui` in a real TanStack router on in-memory history. Returns
 * Testing-Library's result plus `{ router, history }` — drive navigation with
 * `history.push` and assert it via `router.state.location` (in-memory history
 * never touches `window.location`).
 */
export function renderWithRouter(
  ui: ReactNode,
  options: RenderWithRouterOptions = {}
) {
  const { initialEntry = "/", routePaths = ["/"], wrapper } = options

  const rootRoute = createRootRoute({ component: () => <Outlet /> })
  const routes = routePaths.map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      validateSearch: (search: Record<string, unknown>) => search,
      component: () => <>{ui}</>,
    })
  )
  const history = createMemoryHistory({ initialEntries: [initialEntry] })
  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history,
  })

  const tree = <RouterProvider router={router} />
  const result = render(wrapper ? <>{wrapper(tree)}</> : tree)
  return { ...result, router, history }
}
