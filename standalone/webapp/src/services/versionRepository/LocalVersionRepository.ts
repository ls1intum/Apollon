import type { UMLModel } from "@tumaet/apollon"
import { ApiError } from "@/services/DiagramApiClient"
import { MAX_LOCAL_VERSIONS_PER_DIAGRAM } from "@/constants"
import { log } from "@/logger"
import type { Diagram, VersionSummary } from "@/types"
import {
  getDb,
  type ApollonVersionsDBHandle,
  type ApollonVersionsTx,
  type VersionBodyRow,
  type VersionMetaRow,
} from "./idb"
import { planEviction } from "./eviction"
import type {
  CreateVersionResult,
  ListVersionsResponse,
  RestoreVersionResult,
  VersionRepository,
} from "./types"

/** IndexedDB-backed adapter. Cross-tab consistency via BroadcastChannel
 *  — last writer wins, acceptable for solo-offline. */

const BROADCAST_CHANNEL = "apollon-versions"

type BroadcastInvalidate = { type: "invalidate"; diagramId: string }
type BroadcastMessage = BroadcastInvalidate

let bc: BroadcastChannel | null = null
function getBroadcast(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null
  if (!bc) bc = new BroadcastChannel(BROADCAST_CHANNEL)
  return bc
}

export function subscribeToLocalVersionEvents(
  handler: (msg: BroadcastInvalidate) => void
): () => void {
  const channel = getBroadcast()
  if (!channel) return () => {}
  const listener = (event: MessageEvent<BroadcastMessage>) => {
    const data = event.data
    if (data && data.type === "invalidate") handler(data)
  }
  channel.addEventListener("message", listener)
  return () => channel.removeEventListener("message", listener)
}

function broadcastInvalidate(diagramId: string): void {
  const channel = getBroadcast()
  if (!channel) return
  channel.postMessage({
    type: "invalidate",
    diagramId,
  } satisfies BroadcastMessage)
}

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Compound-key range for "all rows of one diagram." Upper bound `[]` is
 * larger than any non-array second component in IDB key order, so the
 * range stays correct regardless of the second column's type
 * (`createdAt` ISO string, `seq` number, `kind` enum).
 * See https://github.com/w3c/IndexedDB/issues/40.
 */
function diagramRange(diagramId: string): IDBKeyRange {
  return IDBKeyRange.bound([diagramId], [diagramId, []], false, true)
}

function metaToSummary(m: VersionMetaRow): VersionSummary {
  return {
    id: m.id,
    diagramId: m.diagramId,
    name: m.name,
    description: m.description,
    createdAt: m.createdAt,
    kind: m.kind,
    librarySchemaVersion: m.librarySchemaVersion,
    seq: m.seq,
  }
}

/**
 * Read boundary: persisted bodies are trusted (this module wrote them), so
 * the cast narrows the `JSON.parse` result to `Diagram` here rather than
 * leaking `any` into the domain.
 */
function decodeBody(row: VersionBodyRow): Diagram {
  return JSON.parse(row.body) as Diagram
}

function serializeBody(model: UMLModel | Diagram): string {
  return JSON.stringify(model)
}

// Origin-wide, session-scoped guard: `navigator.storage.persist()` is an
// origin-level grant, so one successful request covers every diagram. A
// module boolean (not an IDB flag) lets us short-circuit WITHOUT an await,
// which is what keeps the real `persist()` call inside the user-gesture
// window below.
let persistenceRequested = false

/** Test-only: reset the once-per-session persistence guard. */
export function __resetPersistenceForTests(): void {
  persistenceRequested = false
}

async function requestPersistenceImpl(): Promise<void> {
  if (persistenceRequested) return
  persistenceRequested = true
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return
  try {
    // Call `persist()` before any await consumes the gesture's transient
    // activation (an IDB open would). Idempotent and origin-wide: an
    // already-persisted origin is a cheap no-op, and Firefox — the one engine
    // that prompts — remembers its decision.
    await navigator.storage.persist()
  } catch (err) {
    log.warn(
      "Failed to request persistent storage",
      err instanceof Error ? err.message : String(err)
    )
  }
}

async function listSinglePage(
  db: ApollonVersionsDBHandle,
  diagramId: string,
  limit: number,
  before?: string
): Promise<ListVersionsResponse> {
  // Order by `seq` — monotonic per-diagram. `createdAt` ISO strings can
  // collide at millisecond resolution (rapid auto-saves, tests), and
  // random UUID ids don't break ties in any user-meaningful way.
  const ascending = await db.getAllFromIndex(
    "versions",
    "by_diagram_seq",
    diagramRange(diagramId)
  )
  const newestFirst = ascending.slice().reverse()
  const total = newestFirst.length
  let start = 0
  if (before) {
    const idx = newestFirst.findIndex((v) => v.id === before)
    start = idx >= 0 ? idx + 1 : 0
  }
  const slice = newestFirst.slice(start, start + limit)
  const versions = slice.map(metaToSummary)
  const last = slice.at(-1)
  const nextCursor = last && start + slice.length < total ? last.id : undefined
  return { versions, nextCursor, total }
}

function mapQuotaError(err: unknown): never {
  if (
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" || err.code === 22)
  ) {
    // 507 Insufficient Storage (origin-wide quota), deliberately NOT the
    // server's 413 (per-request body too large) — different condition. The UI
    // branches on the shared `BODY_TOO_LARGE` code, not the status.
    throw new ApiError(
      507,
      "BODY_TOO_LARGE",
      "Local storage is full — delete older versions or diagrams to save more."
    )
  }
  throw err
}

export const LocalVersionRepository = {
  kind: "local" as const,
  cap: MAX_LOCAL_VERSIONS_PER_DIAGRAM,

  async list(diagramId, opts = {}): Promise<ListVersionsResponse> {
    const db = await getDb()
    return listSinglePage(db, diagramId, opts.limit ?? 25, opts.before)
  },

  async create(diagramId, body, opts): Promise<CreateVersionResult> {
    const db = await getDb()
    const { row, evictedVersionIds, evictedKinds, totalAfter } =
      await commitVersion(db, {
        diagramId,
        body,
        meta: {
          id: crypto.randomUUID(),
          diagramId,
          name: (opts.name ?? "").trim(),
          description: (opts.description ?? "").trim(),
          createdAt: nowIso(),
          kind: "user",
          librarySchemaVersion: body.version,
        },
      })
    broadcastInvalidate(diagramId)
    return {
      ...metaToSummary(row),
      evictedVersionIds,
      evictedKinds,
      total: totalAfter,
      cap: MAX_LOCAL_VERSIONS_PER_DIAGRAM,
      // headRev is collab-only; explicit undefined.
      headRev: undefined,
    }
  },

  async getBody(diagramId, versionId): Promise<Diagram> {
    const db = await getDb()
    const row = await db.get("versionBodies", [diagramId, versionId])
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Version body not found locally.")
    }
    return decodeBody(row)
  },

  async restore(diagramId, versionId, opts): Promise<RestoreVersionResult> {
    const db = await getDb()
    let autoSnapshotVersionId: string
    try {
      // Read the target row and write the pre-restore auto-snapshot in ONE
      // transaction, so a peer tab deleting the target between the two can't
      // leave a stale "Before restoring …" label.
      const tx = db.transaction(
        ["versions", "versionBodies", "diagramMeta"],
        "readwrite"
      )
      const target = await tx.objectStore("versions").get(versionId)
      if (!target || target.diagramId !== diagramId) {
        throw new ApiError(404, "NOT_FOUND", "Version not found locally.")
      }
      const label =
        target.description.trim() || target.name.trim() || `v${target.seq}`
      const { row } = await writeVersionInTx(tx, {
        diagramId,
        body: opts.currentBody,
        meta: {
          id: crypto.randomUUID(),
          diagramId,
          name: `Before restoring ${label}`,
          description: "",
          createdAt: nowIso(),
          kind: "auto",
          librarySchemaVersion: opts.currentBody.version,
        },
      })
      await tx.done
      autoSnapshotVersionId = row.id
    } catch (err) {
      // Maps quota → ApiError(507); rethrows the 404 and anything else.
      mapQuotaError(err)
    }
    broadcastInvalidate(diagramId)
    return {
      autoSnapshotVersionId,
      updatedAt: nowIso(),
      headRev: undefined,
    }
  },

  async editInfo(diagramId, versionId, patch): Promise<VersionSummary> {
    const db = await getDb()
    const tx = db.transaction("versions", "readwrite")
    const existing = await tx.store.get(versionId)
    if (!existing || existing.diagramId !== diagramId) {
      throw new ApiError(404, "NOT_FOUND", "Version not found locally.")
    }
    const next: VersionMetaRow = {
      ...existing,
      name: patch.name !== undefined ? patch.name.trim() : existing.name,
      description:
        patch.description !== undefined
          ? patch.description.trim()
          : existing.description,
    }
    await tx.store.put(next)
    await tx.done
    broadcastInvalidate(diagramId)
    return metaToSummary(next)
  },

  async delete(diagramId, versionId): Promise<void> {
    const db = await getDb()
    const tx = db.transaction(["versions", "versionBodies"], "readwrite")
    const target = await tx.objectStore("versions").get(versionId)
    if (!target || target.diagramId !== diagramId) {
      throw new ApiError(404, "NOT_FOUND", "Version not found locally.")
    }
    await tx.objectStore("versions").delete(versionId)
    await tx.objectStore("versionBodies").delete([diagramId, versionId])
    await tx.done
    broadcastInvalidate(diagramId)
  },

  permalink(): string | null {
    return null
  },

  requestPersistence(): Promise<void> {
    return requestPersistenceImpl()
  },

  async purgeDiagram(diagramId): Promise<void> {
    const db = await getDb()
    const tx = db.transaction(
      ["versions", "versionBodies", "diagramMeta"],
      "readwrite"
    )
    const versionsStore = tx.objectStore("versions")
    const ids = await versionsStore
      .index("by_diagram_seq")
      .getAllKeys(diagramRange(diagramId))
    for (const id of ids) {
      await versionsStore.delete(id)
    }
    const bodiesStore = tx.objectStore("versionBodies")
    let cursor = await bodiesStore.openCursor(diagramRange(diagramId))
    while (cursor) {
      await cursor.delete()
      cursor = await cursor.continue()
    }
    await tx.objectStore("diagramMeta").delete(diagramId)
    await tx.done
    broadcastInvalidate(diagramId)
  },
} satisfies VersionRepository

/**
 * The single co-write that every persisted version goes through. In ONE
 * multi-store transaction it assigns the next per-diagram `seq`, writes the
 * meta row AND its body together (never one without the other), evicts to the
 * cap, and bumps `headSeq`. Because `body` is required and the body `put` is
 * unconditional, a metadata row without a readable body is not constructible.
 * Quota failures are mapped to the typed `ApiError` on every write path.
 */
interface WriteVersionResult {
  row: VersionMetaRow
  evictedVersionIds: string[]
  evictedKinds: ("unnamed" | "named")[]
  totalAfter: number
}

/**
 * Co-writes one version WITHIN a caller-supplied transaction: assigns the next
 * per-diagram `seq`, writes the meta row AND its body together (never one
 * without the other), evicts to the cap (deleting both stores), and bumps
 * `headSeq`. Caller owns `tx.done` and quota mapping. Letting `restore` pass
 * the same `tx` it used to read the target row keeps the whole restore atomic.
 */
async function writeVersionInTx(
  tx: ApollonVersionsTx,
  args: { diagramId: string; body: UMLModel; meta: Omit<VersionMetaRow, "seq"> }
): Promise<WriteVersionResult> {
  const { diagramId, body, meta } = args
  const diagramMeta = (await tx.objectStore("diagramMeta").get(diagramId)) ?? {
    diagramId,
    headSeq: 0,
  }
  const seq = diagramMeta.headSeq + 1
  const row: VersionMetaRow = { ...meta, seq }
  await tx.objectStore("versions").add(row)
  await tx
    .objectStore("versionBodies")
    .put({ diagramId, id: row.id, body: serializeBody(body) })

  const rows = await tx
    .objectStore("versions")
    .index("by_diagram_seq")
    .getAll(diagramRange(diagramId))
  const plan = planEviction({ rows, cap: MAX_LOCAL_VERSIONS_PER_DIAGRAM })
  for (const evictedId of plan.evictedVersionIds) {
    await tx.objectStore("versions").delete(evictedId)
    await tx.objectStore("versionBodies").delete([diagramId, evictedId])
  }

  await tx.objectStore("diagramMeta").put({ diagramId, headSeq: seq })
  return {
    row,
    evictedVersionIds: plan.evictedVersionIds,
    evictedKinds: plan.evictedKinds,
    totalAfter: rows.length - plan.evictedVersionIds.length,
  }
}

/**
 * Opens a single multi-store transaction, co-writes the version via
 * `writeVersionInTx`, and commits. Quota failures map to the typed `ApiError`.
 */
async function commitVersion(
  db: ApollonVersionsDBHandle,
  args: { diagramId: string; body: UMLModel; meta: Omit<VersionMetaRow, "seq"> }
): Promise<WriteVersionResult> {
  try {
    const tx = db.transaction(
      ["versions", "versionBodies", "diagramMeta"],
      "readwrite"
    )
    const result = await writeVersionInTx(tx, args)
    await tx.done
    return result
  } catch (err) {
    mapQuotaError(err)
  }
}
