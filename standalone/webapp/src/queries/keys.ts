import type { RepositoryKind } from "@/services/versionRepository"

/**
 * Query-key factory. Version keys carry the backend `kind`: the same UI runs
 * against REST and IndexedDB, whose diagram ids live in different id spaces.
 */
export const versionKeys = {
  all: ["versions"] as const,
  list: (kind: RepositoryKind, diagramId: string) =>
    [...versionKeys.all, "list", kind, diagramId] as const,
  body: (kind: RepositoryKind, diagramId: string, versionId: string) =>
    [...versionKeys.all, "body", kind, diagramId, versionId] as const,
}
