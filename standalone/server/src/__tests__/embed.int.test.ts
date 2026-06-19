/**
 * Integration tests for the embed surface:
 *   - GET /api/diagrams/:diagramId/preview.svg
 *   - GET /embed/:diagramId
 *
 * Contract tests inject a fake `ConversionResource` (via `buildApp`'s
 * `conversionResource` dep) so they stay under a second and never spawn the
 * JSDOM worker. One end-to-end test drives the real compiled worker — the same
 * production artifact `conversion.int.test.ts` exercises — so a JSDOM/library
 * regression on the embed render path cannot land silently.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import request from "supertest"
import path from "node:path"
import { readFileSync } from "node:fs"
import { buildApp } from "../http/app.js"
import { loadConfig } from "../config.js"
import { getRedis } from "./setup.js"
import {
  ConversionResource,
  QueueFullError,
  type ConversionOutput,
} from "../resources/conversion-resource.js"

const baseDiagram = {
  version: "4.0.0",
  title: "Embed Test",
  type: "ClassDiagram",
  nodes: [],
  edges: [],
  assessments: {},
}

const FAKE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><rect width="100" height="60" fill="#abcdef"/></svg>'

/** A fast, deterministic resource that counts renders. */
function fakeResource(
  render: () => Promise<ConversionOutput>
): ConversionResource & { calls: number } {
  const fake = {
    calls: 0,
    render: async () => {
      fake.calls += 1
      return render()
    },
  }
  return fake as unknown as ConversionResource & { calls: number }
}

const okResource = () =>
  fakeResource(async () => ({ mime: "image/svg+xml", data: FAKE_SVG }))

/** supertest buffers `image/svg+xml` as binary; read it back as a string. */
const asText = (res: request.Response): string =>
  Buffer.isBuffer(res.body) ? res.body.toString("utf8") : res.text

function appWith(resource: ConversionResource) {
  return buildApp({
    config: loadConfig(),
    redis,
    autoLogging: false,
    conversionResource: resource,
  })
}

async function createDiagram(
  app: ReturnType<typeof buildApp>,
  body: Record<string, unknown> = baseDiagram
): Promise<string> {
  const res = await request(app).post("/api/diagrams").send(body)
  expect(res.status).toBe(201)
  return res.body.id as string
}

let redis: Awaited<ReturnType<typeof getRedis>>

beforeAll(async () => {
  redis = await getRedis()
})

describe("GET /api/diagrams/:diagramId/preview.svg", () => {
  it("renders SVG with cache headers and a correlated weak ETag", async () => {
    const app = appWith(okResource())
    const id = await createDiagram(app)
    const res = await request(app)
      .get(`/api/diagrams/${id}/preview.svg`)
      .buffer(true)

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/^image\/svg\+xml/)
    expect(res.headers["etag"]).toMatch(/^W\/"\d+"$/)
    expect(res.headers["cache-control"]).toBe(
      "public, max-age=60, stale-while-revalidate=86400"
    )
    expect(res.headers["x-content-type-options"]).toBe("nosniff")
    expect(asText(res)).toContain("<svg")
  })

  it("returns 304 on a matching If-None-Match without rendering again", async () => {
    const resource = okResource()
    const app = appWith(resource)
    const id = await createDiagram(app)
    const first = await request(app).get(`/api/diagrams/${id}/preview.svg`)
    const callsAfterFirst = resource.calls

    const second = await request(app)
      .get(`/api/diagrams/${id}/preview.svg`)
      .set("if-none-match", first.headers["etag"])
    expect(second.status).toBe(304)
    expect(second.text).toBe("")
    // The conditional-GET short-circuit must happen before the renderer runs.
    expect(resource.calls).toBe(callsAfterFirst)
  })

  it("changes the ETag after a PUT bumps headRev", async () => {
    const app = appWith(okResource())
    const id = await createDiagram(app)
    const first = await request(app).get(`/api/diagrams/${id}/preview.svg`)

    const put = await request(app)
      .put(`/api/diagrams/${id}`)
      .send({ ...baseDiagram, title: "Mutated" })
    expect(put.status).toBe(200)

    const second = await request(app).get(`/api/diagrams/${id}/preview.svg`)
    expect(second.headers["etag"]).not.toBe(first.headers["etag"])
  })

  it("returns 503 with a Retry-After header when the queue is full", async () => {
    const app = appWith(
      fakeResource(async () => {
        throw new QueueFullError("Conversion queue is full")
      })
    )
    const id = await createDiagram(app)
    const res = await request(app).get(`/api/diagrams/${id}/preview.svg`)
    expect(res.status).toBe(503)
    // A real header — not just a JSON field — so Camo/browsers back off.
    expect(res.headers["retry-after"]).toBe("1")
  })

  it("returns 404 for a missing diagram", async () => {
    const app = appWith(okResource())
    const res = await request(app).get(
      "/api/diagrams/no-such-diagram/preview.svg"
    )
    expect(res.status).toBe(404)
    expect(res.body.error).toBe("NOT_FOUND")
  })

  it("returns 422 for an invalid diagramId", async () => {
    const app = appWith(okResource())
    const res = await request(app).get("/api/diagrams/has%20spaces/preview.svg")
    expect(res.status).toBe(422)
    expect(res.body.error).toBe("INVALID_PARAMS")
  })
})

describe("GET /embed/:diagramId", () => {
  let app: ReturnType<typeof buildApp>
  beforeEach(() => {
    app = appWith(okResource())
  })

  it("returns an HTML shell with inline SVG, the editor link, and embed CSP", async () => {
    const id = await createDiagram(app)
    const res = await request(app).get(`/embed/${id}`)

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/^text\/html/)
    expect(res.headers["etag"]).toMatch(/^W\/"\d+"$/)
    expect(res.headers["referrer-policy"]).toBe("no-referrer")
    expect(res.headers["permissions-policy"]).toContain("interest-cohort=()")
    expect(res.headers["permissions-policy"]).toContain("browsing-topics=()")
    const csp = res.headers["content-security-policy"]
    expect(csp).toContain("frame-ancestors *")
    expect(csp).toContain("default-src 'none'")
    // No script-src → the inlined SVG can never execute script.
    expect(csp).not.toContain("script-src")
    expect(res.text).toContain("<svg")
    expect(res.text).toContain("Open in Apollon")
    expect(res.text).toContain(`/${id}`)
    expect(res.text).toContain("<title>Embed Test - Apollon</title>")
  })

  it("HTML-escapes the title against injection", async () => {
    const id = await createDiagram(app, {
      ...baseDiagram,
      title: `</title><script>alert(1)</script>`,
    })
    const res = await request(app).get(`/embed/${id}`)
    expect(res.status).toBe(200)
    expect(res.text).not.toMatch(/<\/title><script>/)
    expect(res.text).toMatch(/&lt;script&gt;/)
  })

  it("honours X-Forwarded-Proto for the editor link behind a TLS proxy", async () => {
    const id = await createDiagram(app)
    const res = await request(app)
      .get(`/embed/${id}`)
      .set("X-Forwarded-Proto", "https")
      .set("X-Forwarded-Host", "apollon.example.com")
    expect(res.status).toBe(200)
    // `https://` (not mixed content) + the canonical /shared/:id?view= route.
    expect(res.text).toMatch(
      /href="https:\/\/[^"]+\/shared\/[A-Za-z0-9_-]+\?view=EDIT"/
    )
  })

  it("returns 304 on a matching If-None-Match", async () => {
    const id = await createDiagram(app)
    const first = await request(app).get(`/embed/${id}`)
    const second = await request(app)
      .get(`/embed/${id}`)
      .set("if-none-match", first.headers["etag"])
    expect(second.status).toBe(304)
  })
})

describe("end-to-end through the real conversion worker", () => {
  const workerPath = path.resolve(
    import.meta.dirname,
    "../../dist/src/workers/conversion-worker-thread.js"
  )
  const fixturePath = path.resolve(
    import.meta.dirname,
    "../../../webapp/tests/fixtures/class-diagram.json"
  )
  let app: ReturnType<typeof buildApp>

  beforeAll(() => {
    // The resource resolves the worker from its own dir, which under vitest is
    // src/ (no built .js); point it at the dist artifact — same as the
    // conversion route test. Needs a prior server build.
    process.env.CONVERTER_WORKER_PATH = workerPath
    app = buildApp({ config: loadConfig(), redis, autoLogging: false })
  })
  afterAll(() => {
    delete process.env.CONVERTER_WORKER_PATH
  })

  it("renders the real library SVG for preview.svg", async () => {
    const model = JSON.parse(readFileSync(fixturePath, "utf8"))
    const created = await request(app).post("/api/diagrams").send(model)
    expect(created.status).toBe(201)

    const res = await request(app)
      .get(`/api/diagrams/${created.body.id}/preview.svg`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = []
        response.on("data", (c: Buffer) => chunks.push(Buffer.from(c)))
        response.on("end", () => callback(null, Buffer.concat(chunks)))
      })
    expect(res.status).toBe(200)
    const body = (res.body as Buffer).toString("utf8")
    expect(body).toContain('xmlns="http://www.w3.org/2000/svg"')
  }, 20_000)
})
