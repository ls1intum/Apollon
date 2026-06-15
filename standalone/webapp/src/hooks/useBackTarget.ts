import { useLocation } from "@tanstack/react-router"
import {
  ALL_DIAGRAMS_LABEL,
  BACK_TO_DIAGRAM_LABEL,
  isRestorableEditorPath,
  readNavFrom,
} from "@/lib/navProvenance"

/** A typed `<Link>` destination (route + any params/search) plus its label. */
export type BackTarget = { label: string } & (
  | { to: "/local/$id"; params: { id: string }; search: { version?: string } }
  | { to: "/playground" }
  | { to: "/" }
)

/**
 * Resolves the back affordance for a chrome page (legal, 404). When the user
 * arrived from an editor route we stamped the origin in router state, so we send
 * them back to that exact diagram; otherwise we fall back to the dashboard.
 *
 * Always returns a <Link> target — NEVER navigate(-1)/history.go. Deep links,
 * new tabs, bookmarks, external referrers and 404-by-typo all have an empty or
 * off-site history stack, so popping history would strand the user or leave the
 * app. A real link also keeps cmd/middle-click and native edge-swipe coherent.
 *
 * Router state does not survive a hard reload of a chrome route, so a reloaded
 * legal page degrades to "All diagrams" → "/". Accepted: the diagram data is
 * safe in the store; only the one-tap return shortcut is lost.
 */
export const useBackTarget = (): BackTarget => {
  const from = readNavFrom(useLocation().state)
  if (isRestorableEditorPath(from)) {
    const [pathname, query = ""] = from.split("?")
    const [, head, id] = pathname.split("/")
    if (head === "local" && id) {
      const version = new URLSearchParams(query).get("version") ?? undefined
      return {
        to: "/local/$id",
        params: { id: decodeURIComponent(id) },
        search: { version },
        label: BACK_TO_DIAGRAM_LABEL,
      }
    }
    return { to: "/playground", label: BACK_TO_DIAGRAM_LABEL }
  }
  return { to: "/", label: ALL_DIAGRAMS_LABEL }
}
