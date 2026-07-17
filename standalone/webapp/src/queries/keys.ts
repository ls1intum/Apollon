import type { RepositoryKind } from "@/services/versionRepository"

/**
 * Query-key factory — one source for every cache read and invalidation target.
 *
 * Version keys carry the backend `kind`: the same UI runs against REST and
 * IndexedDB, whose diagram ids live in different id spaces.
 */
export const diagramKeys = {
  all: ["diagrams"] as const,
  /** One-shot editor seed — see `diagramQueries.ts` for the Yjs contract. */
  seed: (diagramId: string) => [...diagramKeys.all, diagramId, "seed"] as const,
  /** Imperative latest-HEAD read; `reason` scopes cancellation — see `diagramQueries.ts`. */
  head: (diagramId: string, reason: "peer-restore" | "preview-exit") =>
    [...diagramKeys.all, diagramId, "head", reason] as const,
  /** Every HEAD fetch for a diagram, whatever the reason (teardown cancel). */
  heads: (diagramId: string) =>
    [...diagramKeys.all, diagramId, "head"] as const,
}

export const versionKeys = {
  all: ["versions"] as const,
  list: (kind: RepositoryKind, diagramId: string) =>
    [...versionKeys.all, "list", kind, diagramId] as const,
  bodies: (kind: RepositoryKind, diagramId: string) =>
    [...versionKeys.all, "body", kind, diagramId] as const,
  body: (kind: RepositoryKind, diagramId: string, versionId: string) =>
    [...versionKeys.bodies(kind, diagramId), versionId] as const,
}
