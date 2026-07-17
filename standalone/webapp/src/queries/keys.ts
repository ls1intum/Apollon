import type { VersionRepository } from "@/services/versionRepository"

export type RepositoryKind = VersionRepository["kind"]

/**
 * Query-key factory. Keys are data, not strings — build them here so
 * invalidation targets and cache reads can never drift from the hooks.
 *
 * Version keys carry the repository `kind` ("local" | "remote") because the
 * same versioning UI runs against two backends (REST vs IndexedDB) behind the
 * `VersionRepository` port, and local/remote diagram ids live in different id
 * spaces. The kind in the key also lets the two realtime bridges (WS control
 * events → remote, BroadcastChannel → local) invalidate precisely.
 */
export const diagramKeys = {
  all: ["diagrams"] as const,
  /** One-shot editor seed — see `diagramQueries.ts` for the Yjs contract. */
  seed: (diagramId: string) => [...diagramKeys.all, diagramId, "seed"] as const,
  /**
   * Imperative "give me the latest HEAD now" fetches. Deliberately a DIFFERENT
   * key from `seed`: writing a fresh body into the seed entry would change
   * `useDiagramSeedQuery().data`'s identity and remount the editor/WS stack
   * from the page's mount effect.
   *
   * `reason` separates the two callers into independent CANCELLATION SCOPES —
   * `cancelQueries` matches by key, so a shared key would let the preview
   * effect's cleanup abort the WebSocket handler's in-flight peer-restore
   * refresh (which then silently drops a collaborator's restore).
   */
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
