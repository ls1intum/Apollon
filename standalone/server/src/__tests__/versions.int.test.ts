import { describe, it, expect, beforeEach, vi } from "vitest"
import request from "supertest"
import { buildApp } from "../http/app"
import { loadConfig } from "../config"
import { getRedis } from "./setup"
import type { ControlEvent } from "../types"
import { k } from "../redis"

const baseDiagram = {
  version: "4.0.0",
  title: "Test",
  type: "ClassDiagram",
  nodes: [],
  edges: [],
  assessments: {},
}

let app: ReturnType<typeof buildApp>
let publishControl: ReturnType<typeof vi.fn>

beforeEach(async () => {
  const redis = await getRedis()
  const config = loadConfig()
  publishControl = vi.fn()
  app = buildApp({
    config,
    redis,
    autoLogging: false,
    relay: {
      publishControl: publishControl as (
        diagramId: string,
        ev: ControlEvent
      ) => void,
    },
  })
})

async function newDiagram() {
  const res = await request(app).post("/api/diagrams").send(baseDiagram)
  return res.body.id as string
}

describe("POST /api/diagrams/:id/versions", () => {
  it("creates a version with body inline and broadcasts VERSION_CREATED", async () => {
    const id = await newDiagram()
    const res = await request(app)
      .post(`/api/diagrams/${id}/versions`)
      .send({
        name: "Initial",
        description: "first snapshot",
        body: { ...baseDiagram, id, title: "First" },
      })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe("Initial")
    expect(res.body.kind).toBe("user")
    expect(res.body.librarySchemaVersion).toBe("4.0.0")

    expect(publishControl).toHaveBeenCalledOnce()
    const [broadcastDiagramId, control] = publishControl.mock.calls[0]!
    expect(broadcastDiagramId).toBe(id)
    expect(control).toMatchObject({
      type: "VERSION_CREATED",
      versionId: res.body.id,
      name: "Initial",
      kind: "user",
      createdAt: res.body.createdAt,
    })
  })

  it("returns 404 NO_HEAD when diagram doesn't exist", async () => {
    const res = await request(app)
      .post(`/api/diagrams/no-such-diagram/versions`)
      .send({ body: { ...baseDiagram, id: "no-such-diagram" } })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe("NO_HEAD")
  })
})

describe("GET /api/diagrams/:id/versions", () => {
  it("returns versions newest-first", async () => {
    const id = await newDiagram()
    for (const name of ["v1", "v2", "v3"]) {
      await request(app)
        .post(`/api/diagrams/${id}/versions`)
        .send({ name, body: { ...baseDiagram, id, title: name } })
    }
    const res = await request(app).get(`/api/diagrams/${id}/versions`)
    expect(res.status).toBe(200)
    expect(res.body.versions.map((v: { name: string }) => v.name)).toEqual([
      "v3",
      "v2",
      "v1",
    ])
  })

  it("paginates with cursor", async () => {
    const id = await newDiagram()
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post(`/api/diagrams/${id}/versions`)
        .send({ name: `v${i}`, body: { ...baseDiagram, id, title: `v${i}` } })
    }
    const page1 = await request(app)
      .get(`/api/diagrams/${id}/versions`)
      .query({ limit: 2 })
    expect(page1.body.versions).toHaveLength(2)
    expect(page1.body.nextCursor).toBeDefined()

    const page2 = await request(app)
      .get(`/api/diagrams/${id}/versions`)
      .query({ limit: 2, before: page1.body.nextCursor })
    expect(page2.body.versions).toHaveLength(2)
  })
})

describe("GET /api/diagrams/:id/versions/:vid", () => {
  it("returns the snapshot body and immutable cache headers", async () => {
    const id = await newDiagram()
    const created = await request(app)
      .post(`/api/diagrams/${id}/versions`)
      .send({ name: "v1", body: { ...baseDiagram, id, title: "Snap" } })
    const vid = created.body.id

    const res = await request(app).get(`/api/diagrams/${id}/versions/${vid}`)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe("Snap")
    expect(res.headers.etag).toBe(`"${vid}"`)
    expect(res.headers["cache-control"]).toMatch(/immutable/)
  })

  it("returns 404 for missing version", async () => {
    const id = await newDiagram()
    const res = await request(app).get(
      `/api/diagrams/${id}/versions/no-such-vid`
    )
    expect(res.status).toBe(404)
  })
})

describe("POST /api/diagrams/:id/versions/:vid/restore", () => {
  it("creates auto-snapshot of pre-restore HEAD and applies the version", async () => {
    const id = await newDiagram()
    // Create v1 (snapshot "First").
    const v1 = await request(app)
      .post(`/api/diagrams/${id}/versions`)
      .send({ name: "First", body: { ...baseDiagram, id, title: "First" } })
    const v1Id = v1.body.id
    // Edit HEAD to "Second".
    await request(app)
      .put(`/api/diagrams/${id}`)
      .send({ ...baseDiagram, title: "Second" })
    // Restore v1 with currentBody = the user's canvas.
    const restore = await request(app)
      .post(`/api/diagrams/${id}/versions/${v1Id}/restore`)
      .send({ currentBody: { ...baseDiagram, id, title: "Second" } })

    expect(restore.status).toBe(200)
    expect(restore.body.autoSnapshotVersionId).toBeDefined()

    // HEAD now matches v1.
    const head = await request(app).get(`/api/diagrams/${id}`)
    expect(head.body.title).toBe("First")

    // List has v1 + auto-snapshot.
    const list = await request(app).get(`/api/diagrams/${id}/versions`)
    expect(list.body.versions.length).toBe(2)
    const auto = list.body.versions.find(
      (v: { kind: string }) => v.kind === "auto"
    )
    expect(auto).toBeDefined()
    expect(auto.name).toContain("Auto-saved before restoring")

    // Auto-snapshot body matches the pre-restore canvas.
    const autoBody = await request(app).get(
      `/api/diagrams/${id}/versions/${auto.id}`
    )
    expect(autoBody.body.title).toBe("Second")
  })
})

describe("PATCH /api/diagrams/:id/versions/:vid", () => {
  it("renames a version and broadcasts VERSION_RENAMED", async () => {
    const id = await newDiagram()
    const created = await request(app)
      .post(`/api/diagrams/${id}/versions`)
      .send({ name: "v1", body: { ...baseDiagram, id } })
    const vid = created.body.id

    const res = await request(app)
      .patch(`/api/diagrams/${id}/versions/${vid}`)
      .send({ name: "Renamed", description: "Updated desc" })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe("Renamed")
    expect(res.body.description).toBe("Updated desc")

    const renameCall = publishControl.mock.calls.find(
      (c) => (c[1] as ControlEvent).type === "VERSION_RENAMED"
    )
    expect(renameCall).toBeDefined()
  })
})

describe("DELETE /api/diagrams/:id/versions/:vid", () => {
  it("deletes the version and broadcasts VERSION_DELETED", async () => {
    const id = await newDiagram()
    const created = await request(app)
      .post(`/api/diagrams/${id}/versions`)
      .send({ name: "v1", body: { ...baseDiagram, id } })
    const vid = created.body.id

    const del = await request(app).delete(`/api/diagrams/${id}/versions/${vid}`)
    expect(del.status).toBe(204)

    const get = await request(app).get(`/api/diagrams/${id}/versions/${vid}`)
    expect(get.status).toBe(404)

    const deleteCall = publishControl.mock.calls.find(
      (c) => (c[1] as ControlEvent).type === "VERSION_DELETED"
    )
    expect(deleteCall).toBeDefined()
  })
})

describe("FIFO eviction at the configured cap", () => {
  it("evicts oldest when (cap+1)th version is created", async () => {
    const cap = loadConfig().MAX_VERSIONS_PER_DIAGRAM
    const id = await newDiagram()
    for (let i = 0; i < cap + 1; i++) {
      const res = await request(app)
        .post(`/api/diagrams/${id}/versions`)
        .send({ name: `v${i}`, body: { ...baseDiagram, id } })
      expect(res.status).toBe(201)
    }
    const list = await request(app)
      .get(`/api/diagrams/${id}/versions`)
      .query({ limit: cap * 2 })
    expect(list.body.versions.length).toBe(cap)
    const names = list.body.versions.map((v: { name: string }) => v.name)
    expect(names).not.toContain("v0")
    expect(names[0]).toBe(`v${cap}`)
  })
})

describe("concurrency", () => {
  it("Promise.all of N concurrent creates yields N distinct versions", async () => {
    const id = await newDiagram()
    const N = 10
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        request(app)
          .post(`/api/diagrams/${id}/versions`)
          .send({ name: `c${i}`, body: { ...baseDiagram, id } })
      )
    )
    const list = await request(app)
      .get(`/api/diagrams/${id}/versions`)
      .query({ limit: 100 })
    expect(list.body.versions.length).toBe(N)
    // ZSET ordering matches the count of creates.
    const redis = await getRedis()
    const card = await redis.zCard(k.versionsIndex(id))
    expect(card).toBe(N)
  })
})

describe("schema versioning", () => {
  it("stamps librarySchemaVersion on snapshot meta", async () => {
    const id = await newDiagram()
    const created = await request(app)
      .post(`/api/diagrams/${id}/versions`)
      .send({
        name: "v1",
        body: { ...baseDiagram, id, version: "4.7.0" },
      })
    expect(created.body.librarySchemaVersion).toBe("4.7.0")
  })
})

describe("UTF-8 round-trip", () => {
  it("preserves multi-byte titles and descriptions byte-for-byte", async () => {
    const id = await newDiagram()
    const tricky = "Класс 中文 ✅ — 日本語"
    const created = await request(app)
      .post(`/api/diagrams/${id}/versions`)
      .send({
        name: tricky,
        description: tricky,
        body: { ...baseDiagram, id, title: tricky },
      })
    expect(created.body.name).toBe(tricky)
    expect(created.body.description).toBe(tricky)
    const body = await request(app).get(
      `/api/diagrams/${id}/versions/${created.body.id}`
    )
    expect(body.body.title).toBe(tricky)
  })
})

describe("FIFO eviction at scale", () => {
  it("dropping (cap*4) versions leaves exactly cap, newest first", async () => {
    // Push 4× the cap so the prune loop has to evict the bulk in one call,
    // not one-at-a-time across the create loop.
    const cap = loadConfig().MAX_VERSIONS_PER_DIAGRAM
    const total = cap * 4
    const id = await newDiagram()
    for (let i = 0; i < total; i++) {
      const r = await request(app)
        .post(`/api/diagrams/${id}/versions`)
        .send({ name: `v${i}`, body: { ...baseDiagram, id } })
      expect(r.status).toBe(201)
    }
    const list = await request(app)
      .get(`/api/diagrams/${id}/versions`)
      .query({ limit: cap * 2 })
    expect(list.body.versions).toHaveLength(cap)
    const names = list.body.versions.map((v: { name: string }) => v.name)
    expect(names[0]).toBe(`v${total - 1}`)
    expect(names[cap - 1]).toBe(`v${total - cap}`)
    expect(names).not.toContain(`v${total - cap - 1}`)
  })
})

describe("pagination cursor stability", () => {
  it("does not lose rows when multiple snapshots share a millisecond score", async () => {
    // Force the same-ms collision deterministically by writing the index
    // directly: 6 ULIDs at score=1000, 6 at score=2000. A naive `(score)`
    // exclusive boundary would drop every member at score=1000 when the
    // cursor lands on a same-score member; the Lua list_versions_before
    // must include same-score members with member-lex < cursor.
    const id = await newDiagram()
    // Prime HEAD-related keys so list endpoint doesn't 404 on the diagram.
    const r = await getRedis()
    const groupA = ["A1", "A2", "A3", "A4", "A5", "A6"]
    const groupB = ["B1", "B2", "B3", "B4", "B5", "B6"]
    for (const m of groupA) {
      await r.zAdd(k.versionsIndex(id), { score: 1000, value: m })
      await r.hSet(`diagram:{${id}}:version:${m}:meta`, {
        name: m,
        description: "",
        createdAt: "1000",
        kind: "user",
        librarySchemaVersion: "4.0.0",
      })
    }
    for (const m of groupB) {
      await r.zAdd(k.versionsIndex(id), { score: 2000, value: m })
      await r.hSet(`diagram:{${id}}:version:${m}:meta`, {
        name: m,
        description: "",
        createdAt: "2000",
        kind: "user",
        librarySchemaVersion: "4.0.0",
      })
    }

    const seen = new Set<string>()
    let cursor: string | undefined
    let pages = 0
    do {
      const page = await request(app)
        .get(`/api/diagrams/${id}/versions`)
        .query({ limit: 3, ...(cursor ? { before: cursor } : {}) })
      for (const v of page.body.versions) seen.add(v.id)
      cursor = page.body.nextCursor
      pages++
    } while (cursor && pages < 20)

    expect(seen.size).toBe(groupA.length + groupB.length)
    for (const m of [...groupA, ...groupB]) {
      expect(seen.has(m)).toBe(true)
    }
  })
})

describe("REVISION_MISMATCH on PUT", () => {
  it("client receives currentHeadRev so retry logic can rebase", async () => {
    // The PUT path is the only endpoint that honors If-Match; this verifies
    // the 409 body shape so client autosave retry logic is reliable.
    const id = await newDiagram()
    await request(app)
      .put(`/api/diagrams/${id}`)
      .send({ ...baseDiagram, title: "first" })
    const second = await request(app)
      .put(`/api/diagrams/${id}`)
      .set("If-Match", "0")
      .send({ ...baseDiagram, title: "second" })
    expect(second.status).toBe(409)
    expect(second.body.error).toBe("REVISION_MISMATCH")
    expect(typeof second.body.currentHeadRev).toBe("number")
    expect(second.body.currentHeadRev).toBeGreaterThan(0)
  })
})

describe("restore atomicity", () => {
  it("restore + concurrent PUT (via independent client) preserves index/body coherence", async () => {
    // To genuinely race the atomic Lua function `restore_version`, the two
    // operations must hit Redis through *different connections*. node-redis
    // 5 serializes commands per client, so two requests through one app
    // would interleave at the Express layer but not at Redis. We build a
    // second app with a duplicate Redis client and fire one request through
    // each, simultaneously.
    const id = await newDiagram()
    const v1 = await request(app)
      .post(`/api/diagrams/${id}/versions`)
      .send({ name: "v1", body: { ...baseDiagram, id, title: "v1" } })

    const r2 = (await getRedis()).duplicate()
    await r2.connect()
    try {
      const app2 = buildApp({
        config: loadConfig(),
        redis: r2,
        autoLogging: false,
        relay: { publishControl: vi.fn() },
      })
      const [restore, put] = await Promise.all([
        request(app)
          .post(`/api/diagrams/${id}/versions/${v1.body.id}/restore`)
          .send({}),
        request(app2)
          .put(`/api/diagrams/${id}`)
          .send({ ...baseDiagram, title: "concurrent-edit" }),
      ])
      expect(restore.status).toBe(200)
      expect(put.status).toBe(200)

      // Every indexed version must have a body — no orphans.
      const list = await request(app)
        .get(`/api/diagrams/${id}/versions`)
        .query({ limit: 100 })
      for (const v of list.body.versions) {
        const body = await request(app).get(
          `/api/diagrams/${id}/versions/${v.id}`
        )
        expect(body.status).toBe(200)
      }

      // HEAD must reflect one valid LWW outcome — never a torn state.
      const head = await request(app).get(`/api/diagrams/${id}`)
      expect(["v1", "concurrent-edit"]).toContain(head.body.title)
    } finally {
      await r2.quit()
    }
  })

  it("undo-restore path captures user's currentBody before reverting", async () => {
    const id = await newDiagram()
    const v1 = await request(app)
      .post(`/api/diagrams/${id}/versions`)
      .send({ name: "first", body: { ...baseDiagram, id, title: "first" } })

    // Edit HEAD to "modified" and snapshot it implicitly via restore.
    const restoreResp = await request(app)
      .post(`/api/diagrams/${id}/versions/${v1.body.id}/restore`)
      .send({ currentBody: { ...baseDiagram, id, title: "modified" } })
    const auto = restoreResp.body.autoSnapshotVersionId
    expect(auto).toBeDefined()

    // The pre-restore auto-snapshot must hold the user's "modified" body —
    // not whatever Redis HEAD happened to contain at the time.
    const autoBody = await request(app).get(
      `/api/diagrams/${id}/versions/${auto}`
    )
    expect(autoBody.body.title).toBe("modified")

    // HEAD now reflects the restored v1 body.
    const head = await request(app).get(`/api/diagrams/${id}`)
    expect(head.body.title).toBe("first")

    // Undo: restore the auto-snapshot, passing the user's *new* edit so that
    // undoing again would reach the post-undo state. Without currentBody this
    // path used to silently lose those edits.
    const undoResp = await request(app)
      .post(`/api/diagrams/${id}/versions/${auto}/restore`)
      .send({ currentBody: { ...baseDiagram, id, title: "after-undo-edit" } })
    expect(undoResp.status).toBe(200)

    const headAfter = await request(app).get(`/api/diagrams/${id}`)
    expect(headAfter.body.title).toBe("modified") // back to pre-restore state

    // The undo's own pre-restore snapshot captured "after-undo-edit", not
    // some stale Redis state.
    const undoAuto = undoResp.body.autoSnapshotVersionId
    const undoAutoBody = await request(app).get(
      `/api/diagrams/${id}/versions/${undoAuto}`
    )
    expect(undoAutoBody.body.title).toBe("after-undo-edit")
  })
})

describe("REDIS_UNAVAILABLE mapping", () => {
  it("translates a node-redis ClientClosedError to 503 REDIS_UNAVAILABLE", async () => {
    // Build an isolated app with a redis client that's already closed so any
    // route handler will raise ClientClosedError.
    const closed = (await getRedis()).duplicate()
    await closed.connect()
    await closed.quit()
    const cfg = loadConfig()
    const isolated = buildApp({
      config: cfg,
      redis: closed,
      autoLogging: false,
    })
    const res = await request(isolated).get("/api/diagrams/anything")
    expect(res.status).toBe(503)
    expect(res.body.error).toBe("REDIS_UNAVAILABLE")
  })
})
