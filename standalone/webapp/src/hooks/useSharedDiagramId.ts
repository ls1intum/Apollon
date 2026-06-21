import { useLocation } from "@tanstack/react-router"
import { useDiagramIdFromPath } from "./useDiagramIdFromPath"

/**
 * The current diagram's SERVER id, or undefined when it isn't server-persisted.
 * Reuses the shared path hook (which excludes reserved pages and `/`) and drops
 * the `/local/:id` case — a client-only IndexedDB id the server can't render or
 * share.
 */
export function useSharedDiagramId(): string | undefined {
  const id = useDiagramIdFromPath()
  const { pathname } = useLocation()
  const isLocal = pathname.split("/").filter(Boolean)[0] === "local"
  return isLocal ? undefined : id
}
