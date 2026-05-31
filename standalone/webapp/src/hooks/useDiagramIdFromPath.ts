import { useLocation } from "react-router"

/**
 * Reserved top-level paths in `App.tsx`. Kept in sync with `<Routes>`
 * manually because the navbar lives ABOVE `<Routes>` in the App tree, so
 * `useParams()` returns `{}` there - `useLocation().pathname` is the only
 * router-aware source of the URL we have at navbar depth.
 */
const RESERVED_TOP_LEVEL_PATHS: ReadonlySet<string> = new Set([
  "playground",
  "imprint",
  "privacy",
  "legal",
])

/**
 * Returns the diagramId derived from the URL, or `undefined` when the
 * current route is one of the reserved top-level pages (or `/`).
 *
 * Supported URL shapes:
 * - `/shared/:id`
 * - `/local/:id`
 * - legacy `/:id`
 */
export function useDiagramIdFromPath(): string | undefined {
  const location = useLocation()
  const segments = location.pathname.split("/").filter(Boolean)
  const head = segments[0]
  if (!head) return undefined
  if (RESERVED_TOP_LEVEL_PATHS.has(head)) return undefined

  if (head === "shared" || head === "local") {
    return segments[1] || undefined
  }

  return head
}
