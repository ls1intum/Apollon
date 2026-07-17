/* Shared fixtures + builders for the versioning component stories.
 *
 * The versioning stories (VersionDrawer / VersionListItem / AutoGroupRow /
 * CurrentVersionRow / VersionPreviewBanner / DeleteVersionModal) all re-declared
 * the same `PendingVersion` literals and the same `useVersionStore.setState`
 * seeding boilerplate. This module is the single source of those shapes:
 *
 *  - `makeVersion` / `makeAutoVersion` / `makePendingVersion` build one
 *    `PendingVersion` with sensible defaults; override any field per story.
 *  - `SAMPLE_VERSIONS` is a ready-made populated history (named + auto + named).
 *  - `makeAutoGroup` builds the `AutoGroupRow` group shape (a run of auto-saves).
 *  - `seedVersions` / `seedPreview` / `openDrawer` / `resetVersionStore` wrap the
 *    `useVersionStore` mutations the container stories use in `beforeEach`.
 *
 * View stories should NOT need these store helpers — they drive everything via
 * `args`. The seed helpers exist only for the thin-container integration stories
 * that still read `useVersionStore`.
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
 * In-memory `VersionRepository` stub. Stories bind it through the same port
 * the app uses (`setVersionRepository`), so `useVersionsQuery` & the mutation
 * hooks work naturally — no cache forging, no network. Override individual
 * methods (e.g. a `fn()` spy on `delete`) per story.
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

/**
 * Reset the version store's client state AND the story query cache. Use in
 * meta `beforeEach`.
 */
export function resetVersionStore(): void {
  useVersionStore.setState({
    preview: null,
    drawerOpenByDiagram: {},
    undoRestore: null,
    pendingRestoreFromId: null,
  })
  storybookQueryClient.clear()
  setVersionRepository(makeStoryRepository([]))
}

/**
 * Serve a version list (and optional total) to every consumer by binding an
 * in-memory repository; the components' own queries fetch it on mount.
 */
export function seedVersions(
  versions: PendingVersion[],
  {
    total,
    overrides,
  }: { total?: number; overrides?: Partial<VersionRepository> } = {}
): void {
  setVersionRepository(makeStoryRepository(versions, { total, overrides }))
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
