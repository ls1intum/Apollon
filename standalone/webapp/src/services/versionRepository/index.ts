import { LocalVersionRepository } from "./LocalVersionRepository"
import { RemoteVersionRepository } from "./RemoteVersionRepository"
import type { VersionRepository } from "./types"

export type RepositoryKind = VersionRepository["kind"]

/**
 * Adapter registry, keyed by backend kind. `kind` is a static property of the
 * editor route (`/local/*` is IndexedDB, `/shared/*` is REST), so consumers
 * read it from `VersionRepositoryProvider` and resolve the adapter here. That
 * keeps the kind — and therefore the version query keys — a pure function of
 * where the UI is mounted, with no ambient state to race a navigation.
 */
const adapters: Record<RepositoryKind, VersionRepository> = {
  local: LocalVersionRepository,
  remote: RemoteVersionRepository,
}

export function getVersionRepository(kind: RepositoryKind): VersionRepository {
  return adapters[kind]
}

/**
 * Swap an adapter for a stub. Tests and stories only — production resolves the
 * two real adapters above. Callers must restore the original afterwards, and
 * must isolate the query cache (a stub shares the real adapter's `kind`, so it
 * shares its query keys).
 */
export function setVersionRepository(
  kind: RepositoryKind,
  repository: VersionRepository
): () => void {
  const previous = adapters[kind]
  adapters[kind] = repository
  return () => {
    adapters[kind] = previous
  }
}

export { LocalVersionRepository, RemoteVersionRepository }
export { subscribeToLocalVersionEvents } from "./LocalVersionRepository"
export type {
  VersionRepository,
  ListVersionsResponse,
  CreateVersionResult,
  RestoreVersionResult,
} from "./types"
