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
   * Route templates the `ui` is mounted under — each renders `ui`. Must cover
   * every route the component reads via `getRouteApi(...)` AND every route it
   * navigates to (so `navigate({ to })` resolves). Default `["/"]`.
   */
  routePaths?: string[]
  /** Wraps the whole tree (e.g. context providers that must sit above the router). */
  wrapper?: (children: ReactNode) => ReactNode
}

/**
 * Mounts a component inside a real TanStack Router driven by an in-memory
 * history — the test-harness replacement for react-router's `<MemoryRouter>`.
 *
 * Each `routePaths` entry becomes a child route rendering the same `ui`, so a
 * component that reads `getRouteApi("/shared/$diagramId").useParams()` resolves
 * as long as the matching template is listed and the seeded URL matches it.
 * `validateSearch` is a zero-dep passthrough so `useSearch` returns the seeded
 * query object (mirrors production's function validators).
 *
 * Returns Testing-Library's result plus `{ router, history }`: drive navigation
 * with `history.push("/...")` and assert it with `router.state.location` (an
 * in-memory history never touches `window.location`).
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
