import { vi } from "vitest"
import {
  setVersionRepository,
  type RepositoryKind,
  type VersionRepository,
} from "@/services/versionRepository"

/**
 * Bind an in-memory adapter for the duration of a test, through the same
 * registry the app resolves from — so the code under test runs its real
 * queries and mutations. Returns the restore function; call it in `afterEach`,
 * since the registry outlives the test.
 *
 * Unstubbed methods reject, so a test that exercises a path it didn't stub
 * fails loudly instead of silently receiving `undefined`.
 */
export function stubVersionRepository(
  kind: RepositoryKind,
  overrides: Partial<VersionRepository> = {}
): () => void {
  const notStubbed = (method: string) => () =>
    Promise.reject(new Error(`VersionRepository.${method} was not stubbed`))

  return setVersionRepository(kind, {
    kind,
    cap: 50,
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
