import { describe, it, expect, beforeEach } from "vitest"
import request from "supertest"
import { buildApp } from "../http/app.js"
import { loadConfig } from "../config.js"
import { getRedis } from "./setup.js"

let app: ReturnType<typeof buildApp>

beforeEach(async () => {
  const redis = await getRedis()
  const config = loadConfig()
  app = buildApp({ config, redis, autoLogging: false })
})

const baseDiagram = {
  version: "4.0.0",
  title: "Test",
  type: "ClassDiagram",
  nodes: [],
  edges: [],
  assessments: {},
}

describe("POST /api/diagrams", () => {
  it("creates a diagram and returns it with an id and owner cookie", async () => {
    const res = await request(app).post("/api/diagrams").send(baseDiagram)
    expect(res.status).toBe(201)
    expect(res.body.id).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(res.body.title).toBe("Test")
    const cookie = res.headers["set-cookie"]
    expect(cookie).toBeDefined()
    expect(String(cookie)).toMatch(/apollon_owner_/)
  })
})

describe("GET /api/diagrams/:id", () => {
  it("returns 404 for missing diagram", async () => {
    const res = await request(app).get("/api/diagrams/no-such-diagram")
    expect(res.status).toBe(404)
    expect(res.body.error).toBe("NOT_FOUND")
  })

  it("returns the created diagram", async () => {
    const created = await request(app).post("/api/diagrams").send(baseDiagram)
    const fetched = await request(app).get(`/api/diagrams/${created.body.id}`)
    expect(fetched.status).toBe(200)
    expect(fetched.body.id).toBe(created.body.id)
  })
})

describe("PUT /api/diagrams/:id", () => {
  it("upserts the diagram and returns headRev", async () => {
    const created = await request(app).post("/api/diagrams").send(baseDiagram)
    const id = created.body.id
    const res = await request(app)
      .put(`/api/diagrams/${id}`)
      .send({ ...baseDiagram, title: "Updated" })
    expect(res.status).toBe(200)
    expect(res.body.headRev).toBeGreaterThan(0)
    expect(res.headers.etag).toBe(`"${res.body.headRev}"`)

    const fetched = await request(app).get(`/api/diagrams/${id}`)
    expect(fetched.body.title).toBe("Updated")
  })

  it("returns 409 REVISION_MISMATCH when If-Match is stale", async () => {
    const created = await request(app).post("/api/diagrams").send(baseDiagram)
    const id = created.body.id
    // First PUT: bumps headRev to N (>=1).
    const first = await request(app)
      .put(`/api/diagrams/${id}`)
      .send({ ...baseDiagram, title: "v1" })
    expect(first.status).toBe(200)
    // Second PUT with stale If-Match → 409.
    const stale = await request(app)
      .put(`/api/diagrams/${id}`)
      .set("If-Match", "0")
      .send({ ...baseDiagram, title: "v2" })
    expect(stale.status).toBe(409)
    expect(stale.body.error).toBe("REVISION_MISMATCH")
    expect(stale.body.currentHeadRev).toBe(first.body.headRev)
  })
})

describe("DELETE /api/diagrams/:id", () => {
  it("cascades the version family", async () => {
    const created = await request(app).post("/api/diagrams").send(baseDiagram)
    const id = created.body.id

    // Create a version so there's a family to cascade.
    await request(app)
      .post(`/api/diagrams/${id}/versions`)
      .send({ name: "v1", body: { ...baseDiagram, id } })

    const del = await request(app).delete(`/api/diagrams/${id}`)
    expect(del.status).toBe(204)

    const fetched = await request(app).get(`/api/diagrams/${id}`)
    expect(fetched.status).toBe(404)

    const list = await request(app).get(`/api/diagrams/${id}/versions`)
    // Index gone too — empty result is fine.
    expect(list.body.versions).toEqual([])
  })
})

describe("body parser limit", () => {
  it("returns 413 BODY_TOO_LARGE for oversize payloads", async () => {
    // The default body limit is 5 MiB; 6 MiB exceeds it.
    const big = "x".repeat(6 * 1024 * 1024)
    const res = await request(app)
      .post("/api/diagrams")
      .set("content-type", "application/json")
      .send(JSON.stringify({ ...baseDiagram, title: big }))
    expect(res.status).toBe(413)
    expect(res.body.error).toBe("BODY_TOO_LARGE")
  })
})

describe("GET /health", () => {
  it("returns 200 ok when Redis is up", async () => {
    const res = await request(app).get("/health")
    expect(res.status).toBe(200)
    expect(res.body.status).toBe("ok")
  })
})
