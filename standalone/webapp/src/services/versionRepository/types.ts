import type { UMLModel } from "@tumaet/apollon"
import type { Diagram, VersionSummary } from "@/types"

/**
 * Persistence port for the version-history feature. Two adapters today:
 * `RemoteVersionRepository` (REST against the collab server) and
 * `LocalVersionRepository` (IndexedDB for offline / standalone mode).
 *
 * The shape mirrors the server's wire contract so the existing store
 * (`useVersionStore`) and UI (`components/versioning/*`) stay backend-
 * agnostic — switching modes only swaps the adapter, never the call sites.
 *
 * `restore`'s `headRev` is collab-only (Yjs revision counter); local
 * returns `headRev: undefined`. The store handles this in the `headRev`
 * reconciliation of its `createVersion` / `restoreVersion` actions.
 */
export interface ListVersionsResponse {
  versions: VersionSummary[]
  nextCursor?: string
  total: number
}

export interface CreateVersionResult extends VersionSummary {
  /**
   * Ids the backend dropped to fit the cap. Two-pass named-priority FIFO:
   * unnamed first, then named. Parallel to `evictedKinds`.
   */
  evictedVersionIds?: string[]
  evictedKinds?: ("unnamed" | "named")[]
  /** Authoritative post-commit total (server: ZCARD; local: count(diagramId)). */
  total?: number
  /**
   * Cap the backend enforced. Differs per mode (server 50, local 30) so
   * the eviction toast must echo the value the backend actually used.
   */
  cap?: number
  /** New HEAD revision. Collab-only; undefined locally. */
  headRev?: number
}

export interface RestoreVersionResult {
  /** Collab-only — undefined locally. */
  headRev?: number
  updatedAt: string
  /** Id of the auto-snapshot row written before the restore overwrote HEAD. */
  autoSnapshotVersionId: string
}

export interface VersionRepository {
  /**
   * Backend identity. UI surfaces (empty-state copy, toast branching)
   * read this to specialise without coupling to a specific adapter
   * instance. New adapters are free to mint their own value —
   * exhaustive switches will fail to compile if not handled.
   */
  readonly kind: "local" | "remote"

  /** Maximum versions per diagram this backend will retain. */
  readonly cap: number

  list(
    diagramId: string,
    opts?: { limit?: number; before?: string }
  ): Promise<ListVersionsResponse>

  create(
    diagramId: string,
    body: UMLModel,
    opts: { name?: string; description?: string; actor?: string }
  ): Promise<CreateVersionResult>

  getBody(diagramId: string, versionId: string): Promise<Diagram>

  restore(
    diagramId: string,
    versionId: string,
    /**
     * `currentBody` is required: the pre-restore auto-snapshot is written
     * FROM it, so without it the local adapter would persist a history row
     * with no readable body. Both store call sites pass `editor.model`.
     */
    opts: { currentBody: UMLModel; actor?: string }
  ): Promise<RestoreVersionResult>

  editInfo(
    diagramId: string,
    versionId: string,
    patch: { name?: string; description?: string }
  ): Promise<VersionSummary>

  delete(diagramId: string, versionId: string): Promise<void>

  /**
   * Shareable URL pointing at this version, opened in preview mode.
   * Returns `null` when the mode has no addressable URL (local mode today).
   * UI hides the "Copy link" affordance when null.
   */
  permalink(diagramId: string, versionId: string): string | null

  /**
   * Cascade delete every row + body for a diagram. Implemented by local
   * adapters so the IDB doesn't leak when `usePersistenceModelStore.deleteModel`
   * removes a diagram. Server adapters can leave this undefined — the server
   * already cascades on `DELETE /api/diagrams/:id`.
   */
  purgeDiagram?(diagramId: string): Promise<void>

  /**
   * Best-effort, origin-wide, once-per-session grant request for persistent
   * storage. Local adapters call into `navigator.storage.persist()`; remote
   * adapters leave undefined. **Must be invoked from a user-gesture handler**
   * (Firefox prompts for permission and the gesture window closes after the
   * first `await`).
   */
  requestPersistence?(): Promise<void>
}
