import type { UMLModel } from "@tumaet/apollon"
import { ApiError } from "@/services/DiagramApiClient"
import { MAX_LOCAL_VERSIONS_PER_DIAGRAM } from "@/constants"
import { log } from "@/logger"
import type { Diagram, VersionSummary } from "@/types"
import {
  getDb,
  type ApollonVersionsDBHandle,
  type DiagramMetaRow,
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

function decodeBody(row: VersionBodyRow): Diagram {
  return JSON.parse(row.body) as Diagram
}

function encodeBody(model: UMLModel | Diagram): {
  body: string
  compression: "none"
} {
  return { body: JSON.stringify(model), compression: "none" }
}

async function requestPersistenceImpl(diagramId: string): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage?.persist ||
    !navigator.storage.persisted
  ) {
    return
  }
  try {
    const db = await getDb()
    // Single tx — read+write atomically so concurrent callers can't see
    // a torn meta record between the get and put. Bail early on the
    // `persistedRequested` flag so the storage API (and its possible
    // permission prompt) only fires once per device per diagram.
    const tx = db.transaction("diagramMeta", "readwrite")
    const meta = await tx.store.get(diagramId)
    if (meta?.persistedRequested) {
      await tx.done
      return
    }
    const next: DiagramMetaRow = {
      diagramId,
      headSeq: meta?.headSeq ?? 0,
      persistedRequested: true,
    }
    await tx.store.put(next)
    await tx.done
    // Outside the tx — the storage API request can race with subsequent
    // creates safely; the flag is already persisted.
    const already = await navigator.storage.persisted()
    if (!already) {
      await navigator.storage.persist().catch(() => {})
    }
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
  const nextCursor =
    start + slice.length < total ? slice[slice.length - 1]!.id : undefined
  return { versions, nextCursor, total }
}

function mapQuotaError(err: unknown): never {
  if (
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" || err.code === 22)
  ) {
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
    const id = crypto.randomUUID()
    const createdAt = nowIso()
    const description = (opts.description ?? "").trim()
    const name = (opts.name ?? "").trim()

    try {
      const tx = db.transaction(
        ["versions", "versionBodies", "diagramMeta"],
        "readwrite"
      )

      const meta = (await tx.objectStore("diagramMeta").get(diagramId)) ?? {
        diagramId,
        headSeq: 0,
      }
      const seq = meta.headSeq + 1

      const row: VersionMetaRow = {
        id,
        diagramId,
        name,
        description,
        createdAt,
        kind: "user",
        librarySchemaVersion: body.version,
        seq,
      }
      await tx.objectStore("versions").add(row)

      const encoded = encodeBody(body)
      await tx.objectStore("versionBodies").put({ diagramId, id, ...encoded })

      const rows = await tx
        .objectStore("versions")
        .index("by_diagram_seq")
        .getAll(diagramRange(diagramId))
      const plan = planEviction({
        rows,
        cap: MAX_LOCAL_VERSIONS_PER_DIAGRAM,
      })
      for (const evictedId of plan.evictedVersionIds) {
        await tx.objectStore("versions").delete(evictedId)
        await tx.objectStore("versionBodies").delete([diagramId, evictedId])
      }

      const nextMeta: DiagramMetaRow = {
        diagramId,
        headSeq: seq,
        persistedRequested: meta.persistedRequested,
      }
      await tx.objectStore("diagramMeta").put(nextMeta)
      await tx.done

      broadcastInvalidate(diagramId)

      const totalAfter = rows.length - plan.evictedVersionIds.length
      return {
        ...metaToSummary(row),
        evictedVersionIds: plan.evictedVersionIds,
        evictedKinds: plan.evictedKinds,
        total: totalAfter,
        cap: MAX_LOCAL_VERSIONS_PER_DIAGRAM,
        // headRev is collab-only; explicit undefined.
        headRev: undefined,
      }
    } catch (err) {
      mapQuotaError(err)
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
    const row = await db.get("versions", versionId)
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Version not found locally.")
    }
    const labelTarget =
      row.description.trim() || row.name.trim() || `v${row.seq}`
    const autoId = await createAutoSnapshot(db, {
      diagramId,
      body: opts.currentBody,
      restoredFromName: labelTarget,
    })
    broadcastInvalidate(diagramId)
    return {
      autoSnapshotVersionId: autoId,
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
    await tx.objectStore("versions").delete(versionId)
    await tx.objectStore("versionBodies").delete([diagramId, versionId])
    await tx.done
    broadcastInvalidate(diagramId)
  },

  permalink(): string | null {
    return null
  },

  requestPersistence(diagramId: string): Promise<void> {
    return requestPersistenceImpl(diagramId)
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
 * Pre-restore auto-row: a deletable history entry written immediately
 * before `editor.model` is replaced with the restored body. Local mode's
 * always-visible undo, replacing collab's 10s snackbar.
 *
 * Exported for test-only direct invocation; production callers go through
 * `LocalVersionRepository.restore`.
 */
export async function createAutoSnapshot(
  db: ApollonVersionsDBHandle,
  args: {
    diagramId: string
    body: UMLModel | undefined
    restoredFromName: string
  }
): Promise<string> {
  const { diagramId, body, restoredFromName } = args
  const id = crypto.randomUUID()
  const createdAt = nowIso()
  const tx = db.transaction(
    ["versions", "versionBodies", "diagramMeta"],
    "readwrite"
  )
  const meta = (await tx.objectStore("diagramMeta").get(diagramId)) ?? {
    diagramId,
    headSeq: 0,
  }
  const seq = meta.headSeq + 1
  const row: VersionMetaRow = {
    id,
    diagramId,
    name: `Before restoring ${restoredFromName}`,
    description: "",
    createdAt,
    kind: "auto",
    librarySchemaVersion: body?.version ?? "4.0.0",
    seq,
  }
  await tx.objectStore("versions").add(row)
  if (body) {
    const encoded = encodeBody(body)
    await tx.objectStore("versionBodies").put({ diagramId, id, ...encoded })
  }
  const rows = await tx
    .objectStore("versions")
    .index("by_diagram_seq")
    .getAll(diagramRange(diagramId))
  const plan = planEviction({ rows, cap: MAX_LOCAL_VERSIONS_PER_DIAGRAM })
  for (const evictedId of plan.evictedVersionIds) {
    await tx.objectStore("versions").delete(evictedId)
    await tx.objectStore("versionBodies").delete([diagramId, evictedId])
  }
  const nextMeta: DiagramMetaRow = {
    diagramId,
    headSeq: seq,
    persistedRequested: meta.persistedRequested,
  }
  await tx.objectStore("diagramMeta").put(nextMeta)
  await tx.done
  return id
}
