import { useDiagramIdFromPath } from "./useDiagramIdFromPath"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"

/**
 * Returns the currently active diagram id — the URL-derived id when one
 * exists (server-backed routes like `/:diagramId`), or the local
 * persistence-store's `currentModelId` when on `/`.
 *
 * Lets the version-history navbar entry render in BOTH modes without each
 * call site duplicating the fall-through. Once #583 lands and local
 * diagrams get `/local/:id` URLs, the path id will simply win — no churn here.
 */
export function useActiveDiagramId(): string | undefined {
  const fromPath = useDiagramIdFromPath()
  const local = usePersistenceModelStore((s) => s.currentModelId) ?? undefined
  return fromPath ?? local
}
