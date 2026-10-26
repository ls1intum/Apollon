import { beforeEach, describe, expect, it, vi } from "vitest"
import request from "supertest"
import { buildApp } from "../http/app.js"
import { loadConfig } from "../config.js"
import { getRedis } from "./setup.js"

const baseDiagram = {
  version: "4.0.0",
  title: "Test",
  type: "ClassDiagram",
  nodes: [],
  edges: [],
  assessments: {},
}

let app: ReturnType<typeof buildApp>

beforeEach(async () => {
  const redis = await getRedis()
  const config = loadConfig()
  app = buildApp({
    config,
    redis,
    autoLogging: false,
    relay: { publishControl: vi.fn() },
  })
})

describe("creation-only owner cookie", () => {
  it("POST /diagrams sets apollon_owner_<id> as HttpOnly + SameSite=Lax", async () => {
    const res = await request(app).post("/api/diagrams").send(baseDiagram)
    expect(res.status).toBe(201)
    const setCookie = String(res.headers["set-cookie"])
    expect(setCookie).toMatch(/apollon_owner_/)
    expect(setCookie).toMatch(/HttpOnly/)
    expect(setCookie).toMatch(/SameSite=Lax/)
    expect(setCookie).toMatch(/Path=\//)
  })

  it("subsequent requests with the cookie report x-owner-match=true", async () => {
    const created = await request(app).post("/api/diagrams").send(baseDiagram)
    const cookie = (created.headers["set-cookie"] as unknown as string[])[0]!
    const res = await request(app)
      .get(`/api/diagrams/${created.body.id}`)
      .set("Cookie", cookie)
    expect(res.headers["x-owner-match"]).toBe("true")
  })

  it("requests without the cookie report x-owner-match=false but proceed", async () => {
    const created = await request(app).post("/api/diagrams").send(baseDiagram)
    const res = await request(app).get(`/api/diagrams/${created.body.id}`)
    expect(res.status).toBe(200)
    expect(res.headers["x-owner-match"]).toBe("false")
  })

  it("a tampered cookie reports x-owner-match=false (HMAC rejects)", async () => {
    const created = await request(app).post("/api/diagrams").send(baseDiagram)
    const tampered = `apollon_owner_${created.body.id}=deadbeef.0000000000000000`
    const res = await request(app)
      .get(`/api/diagrams/${created.body.id}`)
      .set("Cookie", tampered)
    expect(res.status).toBe(200)
    expect(res.headers["x-owner-match"]).toBe("false")
  })

  it("a cookie issued for diagram A does not match diagram B", async () => {
    const a = await request(app).post("/api/diagrams").send(baseDiagram)
    const b = await request(app).post("/api/diagrams").send(baseDiagram)
    const cookieA = (a.headers["set-cookie"] as unknown as string[])[0]!
    const res = await request(app)
      .get(`/api/diagrams/${b.body.id}`)
      .set("Cookie", cookieA)
    expect(res.headers["x-owner-match"]).toBe("false")
  })

  it("destructive routes require write authority", async () => {
    const owner = request.agent(app)
    const created = await owner.post("/api/diagrams").send(baseDiagram)
    const id = created.body.id
    const v1 = await owner
      .post(`/api/diagrams/${id}/versions`)
      .send({ name: "v1", body: { ...baseDiagram, id } })

    const del = await request(app).delete(
      `/api/diagrams/${id}/versions/${v1.body.id}`
    )
    expect(del.status).toBe(403)
    expect(del.headers["x-owner-match"]).toBe("false")
  })
})
