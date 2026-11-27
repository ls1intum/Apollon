import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import request from "supertest"
import { buildApp } from "../http/app.js"
import { loadConfig } from "../config.js"
import { bootLoadFunction, createRedisClient, k, type Redis } from "../redis.js"
import { drainAutoVersionInflight } from "../services/autoVersion.js"
import { logger } from "../logger.js"
import {
  CopyRefusedError,
  canonicalJson,
  connect,
  copyDatabase,
  describeEndpoint,
  verifyDatabase,
  type Conn,
} from "../scripts/copy-db.js"

// Source and target are two logical databases (1 and 2) of the suite's single
// server, so the copy runs end to end without a second container. The suite's
// own afterEach only flushes db 0, hence the local cleanup below.
const base = () => process.env.REDIS_URL!
const SOURCE_URL = () => `${base()}/1`
const TARGET_URL = () => `${base()}/2`

let appRedis: Redis
let source: Conn
let target: Conn

beforeEach(async () => {
  appRedis = createRedisClient(SOURCE_URL())
  await appRedis.connect()
  await bootLoadFunction(appRedis)
  source = connect(SOURCE_URL())
  target = connect(TARGET_URL())
  await Promise.all([source.connect(), target.connect()])
  await Promise.all([source.flushDb(), target.flushDb()])
})

afterEach(async () => {
  await drainAutoVersionInflight()
  await Promise.all([source.flushDb(), target.flushDb()])
  await Promise.all([appRedis.quit(), source.quit(), target.quit()])
  vi.restoreAllMocks()
})

const body = (title: string) => ({
  version: "4.0.0",
  title,
  type: "ClassDiagram",
  nodes: [
    {
      id: "n1",
      type: "class",
      position: { x: 12.5, y: -3.25 },
      width: 160,
      height: 100,
      data: { name: 'Ünï "q" \\ 😀', methods: [], attributes: [] },
    },
  ],
  edges: [],
  assessments: {},
})

/** Seeds db 1 through the app's own routes plus one key of every other type. */
async function seedSource(titles: string[]): Promise<string[]> {
  const app = buildApp({
    config: loadConfig({
      ...process.env,
      OWNER_SECRET: "x".repeat(40),
    } as NodeJS.ProcessEnv),
    redis: appRedis,
    autoLogging: false,
  })
  const ids: string[] = []
  for (const title of titles) {
    const agent = request.agent(app)
    const created = await agent.post("/api/diagrams").send(body(title))
    const id = created.body.id as string
    ids.push(id)
    const v1 = await agent
      .post(`/api/diagrams/${id}/versions`)
      .send({ name: "One", description: "d", body: { ...body(title), id } })
    await agent
      .post(`/api/diagrams/${id}/versions/${v1.body.id}/restore`)
      .send({ currentBody: { ...body(title), id } })
  }
  await drainAutoVersionInflight()
  await source.sendCommand(["SET", "extra:persistent", "no ttl"])
  await source.sendCommand(["HSET", "extra:hash", "f", "v"])
  await source.sendCommand(["EXPIRE", "extra:hash", "5000"])
  await source.sendCommand(["ZADD", "extra:zset", "1", "a", "1", "b"])
  await source.sendCommand(["PEXPIRE", "extra:zset", "7200000"])
  return ids
}

const copy = (opts = {}) =>
  copyDatabase(source, target, SOURCE_URL(), TARGET_URL(), opts)

describe("copy-db", () => {
  it("copies every key type with TTLs and verifies clean", async () => {
    const ids = await seedSource(["Alpha", "Beta", "Gamma"])
    const sourceKeys = await source.dbSize()

    const stats = await copy()
    expect(stats.copied).toBe(sourceKeys)
    expect(stats.vanished).toBe(0)
    expect(stats.noTtl).toBe(1) // extra:persistent
    expect(stats.byType["ReJSON-RL"]).toBe(ids.length)

    const result = await verifyDatabase(source, target)
    expect(result.mismatches).toEqual([])
    expect(result.compared).toBe(sourceKeys)
    expect(result.canonicalJsonEqual).toBe(ids.length)
    expect(result.maxTtlDriftMs).toBeLessThan(2000)

    // Independent spot checks through the plain client.
    expect(await target.dbSize()).toBe(sourceKeys)
    expect(await target.type(k.diagram(ids[0]!))).toBe("ReJSON-RL")
    expect(await target.json.get(k.diagram(ids[0]!), { path: "$" })).toEqual(
      await source.json.get(k.diagram(ids[0]!), { path: "$" })
    )
    expect(await target.ttl("extra:persistent")).toBe(-1)
    expect(await target.ttl("extra:hash")).toBeGreaterThan(4990)
    expect(await target.zRangeWithScores("extra:zset", 0, -1)).toEqual([
      { value: "a", score: 1 },
      { value: "b", score: 1 },
    ])
  })

  it("keeps working on the copy: the app's functions run against it", async () => {
    const [id] = await seedSource(["Alpha"])
    await copy()

    const targetRedis = createRedisClient(TARGET_URL())
    await targetRedis.connect()
    try {
      await bootLoadFunction(targetRedis)
      const app = request(
        buildApp({
          config: loadConfig({
            ...process.env,
            OWNER_SECRET: "x".repeat(40),
          } as NodeJS.ProcessEnv),
          redis: targetRedis,
          autoLogging: false,
        })
      )
      const list = await app.get(`/api/diagrams/${id}/versions`)
      expect(list.status).toBe(200)
      expect(list.body.total).toBe(2) // "One" + the pre-restore auto-snapshot
      const head = await app.get(`/api/diagrams/${id}`)
      expect(head.status).toBe(200)
      expect(head.body.title).toBe("Alpha")
    } finally {
      await targetRedis.quit()
    }
  })

  it("refuses a non-empty target unless told otherwise, and is repeatable", async () => {
    await seedSource(["Alpha"])
    await copy()
    await expect(copy()).rejects.toBeInstanceOf(CopyRefusedError)
    await expect(copy()).rejects.toThrow(/target is not empty/)

    const again = await copy({ allowNonEmptyTarget: true })
    expect(again.copied).toBe(await source.dbSize())
    expect((await verifyDatabase(source, target)).mismatches).toEqual([])
  })

  it("dry run writes nothing", async () => {
    await seedSource(["Alpha"])
    const stats = await copy({ dryRun: true })
    expect(stats.copied).toBe(0)
    expect(await target.dbSize()).toBe(0)
  })

  it("refuses to copy a database onto itself", async () => {
    await seedSource(["Alpha"])
    await expect(
      copyDatabase(source, source, SOURCE_URL(), SOURCE_URL())
    ).rejects.toThrow(/same/)
    // Different URL spelling, same server and same db: caught via run_id.
    const alias = SOURCE_URL().replace("localhost", "127.0.0.1")
    const sameServer = connect(alias)
    await sameServer.connect()
    try {
      await expect(
        copyDatabase(source, sameServer, SOURCE_URL() + "?x=1", alias + "#y")
      ).rejects.toBeInstanceOf(CopyRefusedError)
    } finally {
      await sameServer.quit()
    }
  })

  it("refuses unsupported key types before writing anything", async () => {
    await seedSource(["Alpha"])
    await source.sendCommand(["RPUSH", "extra:list", "a"])
    await expect(copy()).rejects.toThrow(/unsupported key types/)
    expect(await target.dbSize()).toBe(0)
  })

  it("verification catches a changed document, a changed TTL and a missing key", async () => {
    const [id] = await seedSource(["Alpha"])
    await copy()
    expect((await verifyDatabase(source, target)).mismatches).toEqual([])

    await target.sendCommand(["JSON.SET", k.diagram(id!), "$.title", '"x"'])
    await target.sendCommand(["EXPIRE", k.diagramMeta(id!), "100"])
    await target.sendCommand(["DEL", "extra:zset"])
    await target.sendCommand(["SET", "unexpected", "1"])

    const result = await verifyDatabase(source, target)
    expect(result.mismatches.map((m) => m.kind).sort()).toEqual([
      "extra-in-target",
      "json",
      "missing-in-target",
      "ttl",
    ])
    const tolerant = await verifyDatabase(source, target, {
      allowExtraInTarget: true,
    })
    expect(tolerant.mismatches.map((m) => m.kind)).not.toContain(
      "extra-in-target"
    )
  })

  it("never logs document contents, key names or connection URLs", async () => {
    const [id] = await seedSource(["TopSecretTitle"])
    const spies = (["info", "warn", "error", "debug"] as const).map((level) =>
      vi.spyOn(logger, level)
    )
    await copy()
    await verifyDatabase(source, target)
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls))
    expect(logged).not.toContain("TopSecretTitle")
    expect(logged).not.toContain(id!)
    expect(logged).not.toContain("extra:hash")
    expect(logged).not.toContain(base())
  })
})

describe("copy-db helpers", () => {
  it("canonicalJson ignores key order but not values", () => {
    expect(
      canonicalJson({ b: 1, a: { d: [2, { y: 1, x: 2 }], c: null } })
    ).toBe(canonicalJson({ a: { c: null, d: [2, { x: 2, y: 1 }] }, b: 1 }))
    expect(canonicalJson({ a: [1, 2] })).not.toBe(canonicalJson({ a: [2, 1] }))
  })

  it("describeEndpoint strips credentials", () => {
    expect(describeEndpoint("redis://user:pw@host:6380/3")).toBe("host:6380/3")
    expect(describeEndpoint("redis://host")).toBe("host:6379/0")
  })
})
