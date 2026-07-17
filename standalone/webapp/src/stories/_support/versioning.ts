/* Shared fixtures + builders for the versioning component stories.
 *
 *  - `makeVersion` / `makeAutoVersion` / `makePendingVersion` build one
 *    `PendingVersion` with sensible defaults; override any field per story.
 *  - `SAMPLE_VERSIONS` is a ready-made populated history (named + auto + named).
 *  - `makeAutoGroup` builds the `AutoGroupRow` group shape (a run of auto-saves).
 *  - `seedVersions` binds an in-memory `VersionRepository` — the same port the
 *    app uses — so a story's components fetch through their real queries.
 *  - `seedPreview` / `openDrawer` / `resetVersionStore` drive the client store.
 *
 * View stories need none of this: they drive everything via `args`. The seed
 * helpers exist for the thin-container stories that fetch and read state.
 */
import type { UMLModel } from "@tumaet/apollon"
import { useVersionStore } from "@/stores/useVersionStore"
import {
  RemoteVersionRepository,
  setVersionRepository,
  type VersionRepository,
} from "@/services/versionRepository"
import type { Diagram, PendingVersion } from "@/types"
import { storybookQueryClient } from "./queryClient"

export type { PendingVersion }

/** The default diagram id every versioning fixture is scoped to. */
export const SAMPLE_DIAGRAM_ID = "diagram-versions"

/** The library schema version stamped on every sample version. */
const SAMPLE_SCHEMA_VERSION = "4.0.0"

/**
 * Build one user-named `PendingVersion`. Every field has a sensible default; pass
 * `overrides` to vary the seq, timestamp, name, description, kind, or flags.
 */
export function makeVersion(
  overrides: Partial<PendingVersion> = {}
): PendingVersion {
  const seq = overrides.seq ?? 1
  return {
    id: `version-${seq}`,
    diagramId: SAMPLE_DIAGRAM_ID,
    name: `Milestone ${seq}`,
    description: `Snapshot of milestone ${seq}.`,
    createdAt: "2026-06-15T10:00:00.000Z",
    kind: "user",
    librarySchemaVersion: SAMPLE_SCHEMA_VERSION,
    seq,
    ...overrides,
  }
}

/**
 * Build one raw auto-saved `PendingVersion` — no name/description, `kind: "auto"`.
 */
export function makeAutoVersion(
  overrides: Partial<PendingVersion> = {}
): PendingVersion {
  return makeVersion({
    name: "",
    description: "",
    kind: "auto",
    ...overrides,
  })
}

/**
 * Build one optimistic `PendingVersion` (the `pending: true` placeholder inserted
 * before the create request resolves). No `seq` — it has not been committed yet.
 */
export function makePendingVersion(
  overrides: Partial<PendingVersion> = {}
): PendingVersion {
  return {
    ...makeVersion(overrides),
    description: "Saving milestone…",
    pending: true,
    ...overrides,
    // Not yet committed, so no monotonic counter has been assigned.
    seq: undefined,
  }
}

/**
 * A populated history in newest-first order: a named milestone, an auto-save, and
 * an earlier named milestone — enough to exercise the list, the autosave caption,
 * and the meta count line.
 */
export const SAMPLE_VERSIONS: PendingVersion[] = [
  makeVersion({
    id: "v7",
    seq: 7,
    name: "Add payment flow",
    description: "Add payment flow and reconcile the account aggregate.",
    createdAt: "2026-06-16T10:00:00.000Z",
  }),
  makeAutoVersion({
    id: "v6",
    seq: 6,
    createdAt: "2026-06-15T09:30:00.000Z",
  }),
  makeVersion({
    id: "v5",
    seq: 5,
    name: "Initial domain sketch",
    description: "Initial domain sketch with the core entities.",
    createdAt: "2026-06-12T14:15:00.000Z",
  }),
]

/** The `AutoGroupRow` group shape — a run of consecutive auto-saved versions. */
export type AutoGroup = {
  kind: "auto-group"
  first: PendingVersion
  versions: PendingVersion[]
}

/** Build an `AutoGroup` of `count` consecutive auto-saves (newest first). */
export function makeAutoGroup(count: number): AutoGroup {
  const versions = Array.from({ length: count }, (_, i) =>
    makeAutoVersion({
      id: `auto-${i + 1}`,
      seq: 10 + i,
      createdAt: new Date(
        Date.parse("2026-06-15T09:30:00.000Z") - i * 60_000
      ).toISOString(),
    })
  )
  return { kind: "auto-group", first: versions[0]!, versions }
}

/** An empty `UMLModel` body, for seeding preview state without a real diagram. */
export const EMPTY_BODY: UMLModel = {
  version: SAMPLE_SCHEMA_VERSION,
  nodes: [],
  edges: [],
} as unknown as UMLModel

/**
 * In-memory `VersionRepository` stub, bound under the "remote" kind so the
 * stories' queries resolve it. Override individual methods (e.g. a `fn()` spy
 * on `delete`) per story.
 */
export function makeStoryRepository(
  versions: PendingVersion[] = [],
  {
    total = versions.filter((v) => !v.pending).length,
    overrides = {},
  }: { total?: number; overrides?: Partial<VersionRepository> } = {}
): VersionRepository {
  const committed = versions.filter((v) => !v.pending)
  return {
    kind: "remote",
    cap: 50,
    list: async () => ({ versions: committed, nextCursor: undefined, total }),
    getBody: async () => EMPTY_BODY as Diagram,
    create: async (_diagramId, body, opts) =>
      makeVersion({
        id: "created-in-story",
        name: opts.name ?? "",
        description: opts.description ?? "",
        librarySchemaVersion: body.version,
      }),
    restore: async () => ({
      updatedAt: "2026-06-16T10:00:00.000Z",
      autoSnapshotVersionId: "auto-snapshot-story",
      headRev: 1,
    }),
    editInfo: async (_diagramId, versionId, patch) =>
      makeVersion({ id: versionId, ...patch }),
    delete: async () => {},
    permalink: (diagramId, versionId) =>
      RemoteVersionRepository.permalink(diagramId, versionId),
    ...overrides,
  }
}

// Stories run in their own process and never need the real REST adapter, so
// each seed replaces the previous stub rather than restoring it.
let restoreRepository: () => void = () => {}

/** Reset the client store, the query cache and the bound stub repository. */
export function resetVersionStore(): void {
  useVersionStore.setState({
    preview: null,
    drawerOpenByDiagram: {},
    undoRestore: null,
    pendingRestoreFromId: null,
  })
  storybookQueryClient.clear()
  seedVersions([])
}

/** Serve a version list to every consumer; their queries fetch it on mount. */
export function seedVersions(
  versions: PendingVersion[],
  {
    total,
    overrides,
  }: { total?: number; overrides?: Partial<VersionRepository> } = {}
): void {
  restoreRepository()
  restoreRepository = setVersionRepository(
    "remote",
    makeStoryRepository(versions, { total, overrides })
  )
  storybookQueryClient.clear()
}

/** Open the inline version sidebar for a diagram. */
export function openDrawer(diagramId: string = SAMPLE_DIAGRAM_ID): void {
  useVersionStore.setState((s) => ({
    drawerOpenByDiagram: { ...s.drawerOpenByDiagram, [diagramId]: true },
  }))
}

/** Enter preview of a given version with an empty body. */
export function seedPreview(
  versionId: string,
  body: UMLModel = EMPTY_BODY,
  diagramId: string = SAMPLE_DIAGRAM_ID
): void {
  useVersionStore.setState({ preview: { diagramId, versionId, body } })
}
