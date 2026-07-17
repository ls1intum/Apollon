import { vi } from "vitest"
import {
  setVersionRepository,
  type RepositoryKind,
  type VersionRepository,
} from "@/services/versionRepository"
import {
  MAX_LOCAL_VERSIONS_PER_DIAGRAM,
  MAX_VERSIONS_PER_DIAGRAM,
} from "@/constants"

/**
 * Bind an in-memory adapter for a test, through the same registry the app
 * resolves from, so the code under test runs its real queries and mutations.
 * Returns the restore function; call it in `afterEach` (the registry outlives
 * the test). Unstubbed methods reject rather than returning `undefined`, which
 * surfaces in query/mutation error state rather than a `TypeError` later.
 */
export function stubVersionRepository(
  kind: RepositoryKind,
  overrides: Partial<VersionRepository> = {}
): () => void {
  const notStubbed = (method: string) => () =>
    Promise.reject(new Error(`VersionRepository.${method} was not stubbed`))

  return setVersionRepository(kind, {
    kind,
    cap:
      kind === "local"
        ? MAX_LOCAL_VERSIONS_PER_DIAGRAM
        : MAX_VERSIONS_PER_DIAGRAM,
    list: vi.fn(notStubbed("list")),
    getBody: vi.fn(notStubbed("getBody")),
    create: vi.fn(notStubbed("create")),
    restore: vi.fn(notStubbed("restore")),
    editInfo: vi.fn(notStubbed("editInfo")),
    delete: vi.fn(notStubbed("delete")),
    permalink: () => null,
    ...overrides,
  } as VersionRepository)
}
