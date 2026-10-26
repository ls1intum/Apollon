import { beforeEach, describe, expect, it, vi } from "vitest"
import request from "supertest"
import { buildApp } from "../http/app.js"
import { loadConfig } from "../config.js"
import { getRedis } from "./setup.js"
import { createHmac } from "node:crypto"
import { sign } from "hono/jwt"
import { readDiagram } from "../routes/diagrams.js"

const diagram = {
  version: "4.0.0",
  title: "Shared",
  type: "ClassDiagram",
  nodes: [],
  edges: [],
  assessments: {},
}

let app: ReturnType<typeof buildApp>
let publishControl: ReturnType<typeof vi.fn>

beforeEach(async () => {
  publishControl = vi.fn()
  app = buildApp({
    config: loadConfig(),
    redis: await getRedis(),
    autoLogging: false,
    relay: { publishControl },
  })
})

describe("diagram write access", () => {
  it.each(["snapshot", "restore"])(
    "announces a committed HEAD flush even when %s bookkeeping fails",
    async (operation) => {
      const owner = request.agent(app)
      const created = await owner.post("/api/diagrams").send(diagram)
      const id = created.body.id as string
      const version = await owner
        .post(`/api/diagrams/${id}/versions`)
        .send({ body: { ...diagram, id } })
      expect(version.status).toBe(201)
      publishControl.mockClear()
      const redis = await getRedis()
      const sendCommand = redis.sendCommand.bind(redis)
      const command = vi
        .spyOn(redis, "sendCommand")
        .mockImplementation(async (args, options) => {
          if (
            args[0] === "FCALL" &&
            args[1] ===
              (operation === "snapshot" ? "commit_snapshot" : "restore_version")
          ) {
            throw new Error("Version storage unavailable")
          }
          return sendCommand(args, options)
        })
      try {
        const path = `/api/diagrams/${id}/versions`
        const failed = await owner
          .post(
            operation === "snapshot"
              ? path
              : `${path}/${version.body.id}/restore`
          )
          .send(
            operation === "snapshot"
              ? { body: { ...diagram, id, title: "Flushed" } }
              : { currentBody: { ...diagram, id, title: "Flushed" } }
          )
        expect(failed.status).toBe(500)
        expect(publishControl).toHaveBeenCalledWith(id, {
          type: "DIAGRAM_UPDATED",
        })
        const head = await request(app).get(`/api/diagrams/${id}`)
        expect(head.body.title).toBe("Flushed")
      } finally {
        command.mockRestore()
      }
    }
  )

  it("checks the decoded diagram id before an encoded-path write", async () => {
    const owner = request.agent(app)
    const created = await owner.post("/api/diagrams").send(diagram)
    const id = created.body.id as string
    const encoded = `%${id.charCodeAt(0).toString(16)}${id.slice(1)}`
    const denied = await request(app)
      .put(`/api/diagrams/${encoded}`)
      .send({ ...diagram, title: "Changed" })
    expect(denied.status).toBe(403)
    const permitted = await owner.put(`/api/diagrams/${encoded}`).send(diagram)
    expect(permitted.status).toBe(200)
  })

  it("keeps read links read-only and returns capabilities only to writers", async () => {
    const owner = request.agent(app)
    const created = await owner.post("/api/diagrams").send(diagram)
    const id = created.body.id as string
    const path = `/api/diagrams/${id}`
    expect(created.body.canWrite).toBe(true)
    expect(created.body.writeToken).toEqual(expect.any(String))
    const reader = await request(app).get(path).query({ view: "COLLABORATE" })
    expect(reader.body.canWrite).toBe(false)
    expect(reader.body).not.toHaveProperty("writeToken")
    const token = created.body.writeToken as string
    const writer = await request(app)
      .get(path)
      .set("Authorization", `Bearer ${token}`)
    expect(writer.body.canWrite).toBe(true)
    expect(writer.body.writeToken).toBe(token)
    expect(writer.headers["x-owner-match"]).toBe("false")
    expect(writer.headers["cache-control"]).toBe("private, no-store")
    const updated = await request(app)
      .put(path)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...diagram, title: "Writer", writeToken: token, canWrite: true })
    expect(updated.status).toBe(200)
    expect(publishControl).toHaveBeenCalledWith(id, { type: "DIAGRAM_UPDATED" })
    expect(updated.headers).not.toHaveProperty("set-cookie")
    const stored = await readDiagram(await getRedis(), id)
    expect(stored).not.toHaveProperty("writeToken")
    expect(stored).not.toHaveProperty("canWrite")
    const refreshed = await owner.get(path)
    expect(refreshed.body.canWrite).toBe(true)
    expect(refreshed.body.writeToken).toEqual(expect.any(String))
  })

  it("rejects forged, wrong-diagram, and wrong-audience capabilities", async () => {
    const a = await request(app).post("/api/diagrams").send(diagram)
    const b = await request(app).post("/api/diagrams").send(diagram)
    const wrongAudience = await sign(
      { aud: "not-apollon-write", sub: a.body.id },
      loadConfig().OWNER_SECRET,
      "HS256"
    )
    for (const token of ["forged", b.body.writeToken, wrongAudience]) {
      const denied = await request(app)
        .put(`/api/diagrams/${a.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send(diagram)
      expect(denied.status).toBe(401)
      expect(denied.body.error).toBe("INVALID_CAPABILITY")
      expect(denied.headers["www-authenticate"]).toBe(
        'Bearer error="invalid_token"'
      )
    }
  })

  it("rejects a revoked capability on reads but still serves the anonymous read", async () => {
    const created = await request(app).post("/api/diagrams").send(diagram)
    const path = `/api/diagrams/${created.body.id}`
    const revoked = await sign(
      { aud: "apollon-write-v1", sub: created.body.id },
      "a-rotated-out-owner-secret-of-32-bytes",
      "HS256"
    )
    const denied = await request(app)
      .get(path)
      .set("Authorization", `Bearer ${revoked}`)
    expect(denied.status).toBe(401)
    expect(denied.body.error).toBe("INVALID_CAPABILITY")
    const anonymous = await request(app).get(path)
    expect(anonymous.status).toBe(200)
    expect(anonymous.body.canWrite).toBe(false)
  })

  it("does not upgrade old soft-owner cookies or create missing diagrams on PUT", async () => {
    const created = await request(app).post("/api/diagrams").send(diagram)
    const id = created.body.id as string
    const nonce = "legacy"
    const signature = createHmac("sha256", loadConfig().OWNER_SECRET)
      .update(`${id}|${nonce}`)
      .digest("hex")
    const legacy = await request(app)
      .put(`/api/diagrams/${id}`)
      .set("Cookie", `apollon_owner_${id}=${nonce}.${signature}`)
      .send(diagram)
    expect(legacy.status).toBe(403)
    const missing = await request(app)
      .put("/api/diagrams/missing")
      .send(diagram)
    expect(missing.status).toBe(403)
    expect(await readDiagram(await getRedis(), "missing")).toBeNull()
  })

  it("rejects cross-origin and simple-form cookie-authorized writes", async () => {
    const owner = request.agent(app)
    const created = await owner.post("/api/diagrams").send(diagram)
    const path = `/api/diagrams/${created.body.id}`
    const foreign = await owner
      .put(path)
      .set("Origin", "https://attacker.example")
      .send(diagram)
    expect(foreign.status).toBe(403)
    const simple = await owner
      .put(path)
      .set("Content-Type", "text/plain")
      .send(JSON.stringify(diagram))
    expect(simple.status).toBe(403)
  })

  it.each(
    ["put", "delete", "snapshot", "restore", "rename", "deleteVersion"].flatMap(
      (operation) => [[operation, false] as const, [operation, true] as const]
    )
  )(
    "rejects a reader's %s request (encoded=%s) without changing the diagram",
    async (operation, encoded) => {
      const owner = request.agent(app)
      const created = await owner.post("/api/diagrams").send(diagram)
      const id = created.body.id as string
      const version = await owner
        .post(`/api/diagrams/${id}/versions`)
        .send({ body: { ...diagram, id } })
      expect(version.status).toBe(201)
      publishControl.mockClear()
      const encodeId = (value: string) =>
        encoded
          ? `%${value.charCodeAt(0).toString(16)}${value.slice(1)}`
          : value
      const path = `/api/diagrams/${encodeId(id)}`
      const versionPath = `${path}/versions/${encodeId(version.body.id)}`
      const reader = request(app)
      const denied =
        operation === "put"
          ? await reader.put(path).send({ ...diagram, title: "Changed" })
          : operation === "delete"
            ? await reader.delete(path)
            : operation === "snapshot"
              ? await reader
                  .post(`${path}/versions`)
                  .send({ body: { ...diagram, id, title: "Changed" } })
              : operation === "restore"
                ? await reader
                    .post(`${versionPath}/restore`)
                    .send({ currentBody: { ...diagram, id, title: "Changed" } })
                : operation === "rename"
                  ? await reader.patch(versionPath).send({ name: "Changed" })
                  : await reader.delete(versionPath)
      expect(denied.status).toBe(403)
      expect(publishControl).not.toHaveBeenCalled()
      const head = await request(app).get(path)
      expect(head.status).toBe(200)
      expect(head.body.title).toBe("Shared")
      const saved = await request(app).get(versionPath)
      expect(saved.status).toBe(200)
      expect(saved.body.title).toBe("Shared")
    }
  )
})
