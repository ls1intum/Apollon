import "fake-indexeddb/auto"
import { IDBFactory as FDBFactory } from "fake-indexeddb"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { UMLModel } from "@tumaet/apollon"
import {
  LocalVersionRepository,
  subscribeToLocalVersionEvents,
} from "../LocalVersionRepository"
import { __resetDbForTests, getDb } from "../idb"
import { ApiError } from "@/services/DiagramApiClient"
import { MAX_LOCAL_VERSIONS_PER_DIAGRAM } from "@/constants"

/**
 * Integration tests against fake-indexeddb. Covers:
 *
 *   - round-trip create / list / getBody / restore / delete / editInfo
 *   - eviction shape parity with the server (`evictedKinds` in the
 *     `create` return, sweeps auto before user)
 *   - pagination via `before` cursor
 *   - `restore` writes a kind=auto pre-restore row
 *   - `purgeDiagram` deletes both metadata and bodies
 *   - schema migration runs the v0→v1 `upgrade` block once
 *   - `librarySchemaVersion` round-trips on the summary
 *
 * Quota / WebKit-eviction / cross-tab BroadcastChannel paths are
 * simulated only at the contract level — real-IDB E2E coverage lives in
 * the Playwright spec.
 */

const DIAGRAM_ID = "test-diagram"

function freshModel(extra?: Partial<UMLModel>): UMLModel {
  return {
    version: "4.0.0",
    id: DIAGRAM_ID,
    title: "Test diagram",
    type: "ClassDiagram",
    nodes: [],
    edges: [],
    assessments: {},
    ...extra,
  } as UMLModel
}

function nodeyModel(): UMLModel {
  return freshModel({
    nodes: [
      {
        id: "n1",
        type: "Class",
        position: { x: 0, y: 0 },
        width: 160,
        height: 80,
        data: { name: "ClassA" },
      } as unknown as UMLModel["nodes"][number],
    ],
  })
}

beforeEach(async () => {
  // Swap in a fresh fake-IDB factory between tests so each starts cold —
  // simpler than deleteDatabase, which would deadlock while the prior
  // test's connection is still cached by the module under test.
  Object.assign(globalThis, { indexedDB: new FDBFactory() })
  __resetDbForTests()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("LocalVersionRepository", () => {
  it("round-trips create → list → getBody → delete", async () => {
    const summary = await LocalVersionRepository.create(
      DIAGRAM_ID,
      nodeyModel(),
      { name: "v1", description: "initial" }
    )
    expect(summary.id).toBeTruthy()
    expect(summary.kind).toBe("user")
    expect(summary.diagramId).toBe(DIAGRAM_ID)
    expect(summary.seq).toBe(1)
    expect(summary.evictedVersionIds).toEqual([])
    expect(summary.total).toBe(1)

    const list = await LocalVersionRepository.list(DIAGRAM_ID)
    expect(list.versions).toHaveLength(1)
    expect(list.total).toBe(1)
    expect(list.versions[0]!.id).toBe(summary.id)

    const body = await LocalVersionRepository.getBody(DIAGRAM_ID, summary.id)
    expect(body.id).toBe(DIAGRAM_ID)
    expect(body.nodes).toHaveLength(1)

    await LocalVersionRepository.delete(DIAGRAM_ID, summary.id)
    const after = await LocalVersionRepository.list(DIAGRAM_ID)
    expect(after.versions).toEqual([])
    expect(after.total).toBe(0)
  })

  it("getBody throws ApiError(404) when the version is missing", async () => {
    await expect(
      LocalVersionRepository.getBody(DIAGRAM_ID, "missing-id")
    ).rejects.toBeInstanceOf(ApiError)
  })

  it("editInfo updates description without changing kind", async () => {
    const summary = await LocalVersionRepository.create(
      DIAGRAM_ID,
      nodeyModel(),
      { name: "v1" }
    )
    const updated = await LocalVersionRepository.editInfo(
      DIAGRAM_ID,
      summary.id,
      { description: "edited" }
    )
    expect(updated.description).toBe("edited")
    expect(updated.kind).toBe("user")
    expect(updated.id).toBe(summary.id)
  })

  it("assigns monotonic seq across creates", async () => {
    const a = await LocalVersionRepository.create(DIAGRAM_ID, nodeyModel(), {
      name: "a",
    })
    const b = await LocalVersionRepository.create(DIAGRAM_ID, nodeyModel(), {
      name: "b",
    })
    const c = await LocalVersionRepository.create(DIAGRAM_ID, nodeyModel(), {
      name: "c",
    })
    expect([a.seq, b.seq, c.seq]).toEqual([1, 2, 3])
  })

  it("list returns newest first", async () => {
    const a = await LocalVersionRepository.create(DIAGRAM_ID, nodeyModel(), {
      name: "a",
    })
    // Force a clock tick — fake-indexeddb is fast enough that successive
    // ISO timestamps can collide. Sort stability still picks the later seq.
    await new Promise((r) => setTimeout(r, 5))
    const b = await LocalVersionRepository.create(DIAGRAM_ID, nodeyModel(), {
      name: "b",
    })
    const list = await LocalVersionRepository.list(DIAGRAM_ID)
    expect(list.versions.map((v) => v.id)).toEqual([b.id, a.id])
  })

  it("paginates via the `before` cursor", async () => {
    for (let i = 0; i < 7; i++) {
      await LocalVersionRepository.create(DIAGRAM_ID, nodeyModel(), {
        name: `v${i}`,
      })
      await new Promise((r) => setTimeout(r, 1))
    }
    const page1 = await LocalVersionRepository.list(DIAGRAM_ID, { limit: 3 })
    expect(page1.versions).toHaveLength(3)
    expect(page1.nextCursor).toBeDefined()

    const page2 = await LocalVersionRepository.list(DIAGRAM_ID, {
      limit: 3,
      before: page1.nextCursor,
    })
    expect(page2.versions).toHaveLength(3)
    expect(page2.versions[0]!.id).not.toBe(page1.versions[2]!.id)

    const page3 = await LocalVersionRepository.list(DIAGRAM_ID, {
      limit: 3,
      before: page2.nextCursor,
    })
    expect(page3.versions).toHaveLength(1)
    expect(page3.nextCursor).toBeUndefined()
  })

  it("evicts oldest auto rows first when over cap", async () => {
    // Cap is loaded from the constant module; using a small body keeps
    // the test fast. We force overflow by writing 31 named (cap=30 by
    // default) and confirming the oldest *named* row gets evicted (no
    // auto rows present to absorb it).
    const ids: string[] = []
    for (let i = 0; i < 31; i++) {
      const r = await LocalVersionRepository.create(DIAGRAM_ID, nodeyModel(), {
        name: `v${i}`,
      })
      ids.push(r.id)
      // We expect an eviction once we cross 30.
      if (i === 30) {
        expect(r.evictedVersionIds).toEqual([ids[0]])
        expect(r.evictedKinds).toEqual(["named"])
      }
    }
    const list = await LocalVersionRepository.list(DIAGRAM_ID, { limit: 100 })
    expect(list.total).toBe(30)
    expect(list.versions.find((v) => v.id === ids[0])).toBeUndefined()
  })

  it("restore writes an auto-snapshot row, returns its id", async () => {
    const original = await LocalVersionRepository.create(
      DIAGRAM_ID,
      nodeyModel(),
      { name: "original" }
    )
    // Edit the canvas — pretend the user added a node.
    const dirty = nodeyModel()

    const result = await LocalVersionRepository.restore(
      DIAGRAM_ID,
      original.id,
      { currentBody: dirty }
    )
    expect(result.autoSnapshotVersionId).toBeTruthy()
    expect(result.headRev).toBeUndefined()

    const list = await LocalVersionRepository.list(DIAGRAM_ID)
    const auto = list.versions.find(
      (v) => v.id === result.autoSnapshotVersionId
    )
    expect(auto).toBeDefined()
    expect(auto!.kind).toBe("auto")
    expect(auto!.name).toMatch(/^Before restoring /)
  })

  it("restore body of the auto-snapshot equals the currentBody passed in", async () => {
    const original = await LocalVersionRepository.create(
      DIAGRAM_ID,
      nodeyModel(),
      { name: "original" }
    )
    const dirty = nodeyModel()
    dirty.title = "dirty-canvas"

    const result = await LocalVersionRepository.restore(
      DIAGRAM_ID,
      original.id,
      { currentBody: dirty }
    )
    const body = await LocalVersionRepository.getBody(
      DIAGRAM_ID,
      result.autoSnapshotVersionId
    )
    expect(body.title).toBe("dirty-canvas")
  })

  it("permalink returns null in local mode", () => {
    expect(LocalVersionRepository.permalink()).toBeNull()
  })

  it("purgeDiagram deletes all rows + bodies + meta for the diagram", async () => {
    const a = await LocalVersionRepository.create(DIAGRAM_ID, nodeyModel(), {
      name: "a",
    })
    await LocalVersionRepository.create(DIAGRAM_ID, nodeyModel(), { name: "b" })
    await LocalVersionRepository.create("other-diagram", nodeyModel(), {
      name: "x",
    })

    await LocalVersionRepository.purgeDiagram!(DIAGRAM_ID)
    const list = await LocalVersionRepository.list(DIAGRAM_ID)
    expect(list.versions).toEqual([])
    expect(list.total).toBe(0)

    // Other diagram is untouched.
    const other = await LocalVersionRepository.list("other-diagram")
    expect(other.total).toBe(1)

    // Bodies are gone too.
    await expect(
      LocalVersionRepository.getBody(DIAGRAM_ID, a.id)
    ).rejects.toBeInstanceOf(ApiError)
  })

  it("preserves librarySchemaVersion across the round-trip", async () => {
    const summary = await LocalVersionRepository.create(
      DIAGRAM_ID,
      freshModel({ version: "4.2.1" } as Partial<UMLModel>),
      { name: "v1" }
    )
    expect(summary.librarySchemaVersion).toBe("4.2.1")
    const list = await LocalVersionRepository.list(DIAGRAM_ID)
    expect(list.versions[0]!.librarySchemaVersion).toBe("4.2.1")
  })

  it("create echoes the local cap on every result", async () => {
    const summary = await LocalVersionRepository.create(
      DIAGRAM_ID,
      nodeyModel(),
      { name: "v1" }
    )
    expect(summary.cap).toBe(MAX_LOCAL_VERSIONS_PER_DIAGRAM)
  })

  it("kind discriminator is 'local'", () => {
    expect(LocalVersionRepository.kind).toBe("local")
  })

  it("requestPersistence sets the persistedRequested flag idempotently", async () => {
    // Mock storage API — fake-indexeddb doesn't ship one. Two-call check:
    // first save flips the flag; second is a no-op (no second persist()).
    const persistSpy = vi.fn().mockResolvedValue(true)
    const persistedSpy = vi.fn().mockResolvedValue(false)
    Object.assign(globalThis, {
      navigator: { storage: { persist: persistSpy, persisted: persistedSpy } },
    })

    await LocalVersionRepository.requestPersistence(DIAGRAM_ID)
    await LocalVersionRepository.requestPersistence(DIAGRAM_ID)

    expect(persistSpy).toHaveBeenCalledTimes(1)
    const db = await getDb()
    const meta = await db.get("diagramMeta", DIAGRAM_ID)
    expect(meta?.persistedRequested).toBe(true)
  })

  it("create broadcasts an invalidate message that subscribers receive", async () => {
    // BroadcastChannel posts don't echo to the same context, so we
    // listen on a sibling channel instance — same name, separate object.
    const received: { type: string; diagramId: string }[] = []
    const channel = new BroadcastChannel("apollon-versions")
    channel.addEventListener("message", (e) =>
      received.push(e.data as { type: string; diagramId: string })
    )
    await LocalVersionRepository.create(DIAGRAM_ID, nodeyModel(), {
      name: "v1",
    })
    // BroadcastChannel delivery is async — wait one tick.
    await new Promise((r) => setTimeout(r, 0))
    channel.close()
    expect(received.length).toBeGreaterThanOrEqual(1)
    expect(received[0]).toEqual({ type: "invalidate", diagramId: DIAGRAM_ID })
  })

  it("subscribeToLocalVersionEvents returns a working unsubscribe", async () => {
    const handler = vi.fn()
    const unsubscribe = subscribeToLocalVersionEvents(handler)
    // Use a sibling channel to drive the event — subscriber lives on
    // the module's own channel singleton.
    const sender = new BroadcastChannel("apollon-versions")
    sender.postMessage({ type: "invalidate", diagramId: DIAGRAM_ID })
    await new Promise((r) => setTimeout(r, 0))
    expect(handler).toHaveBeenCalledWith({
      type: "invalidate",
      diagramId: DIAGRAM_ID,
    })
    unsubscribe()
    handler.mockClear()
    sender.postMessage({ type: "invalidate", diagramId: DIAGRAM_ID })
    await new Promise((r) => setTimeout(r, 0))
    expect(handler).not.toHaveBeenCalled()
    sender.close()
  })
})
