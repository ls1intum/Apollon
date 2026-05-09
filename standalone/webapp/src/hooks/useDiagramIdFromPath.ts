import { useLocation } from "react-router"

/**
 * Reserved top-level paths in `App.tsx`. Anything else in the first path
 * segment is treated as a diagramId. Kept in sync with `<Routes>` manually
 * because the navbar lives ABOVE `<Routes>` in the App tree, so
 * `useParams()` returns `{}` there — `useLocation().pathname` is the only
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
 * current route is one of the reserved top-level pages (or the local-only
 * `/` route).
 */
export function useDiagramIdFromPath(): string | undefined {
  const location = useLocation()
  const segment = location.pathname.split("/").filter(Boolean)[0]
  if (!segment) return undefined
  if (RESERVED_TOP_LEVEL_PATHS.has(segment)) return undefined
  return segment
}
