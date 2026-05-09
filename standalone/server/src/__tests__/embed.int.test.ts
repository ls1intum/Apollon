/**
 * Integration tests for the embed surface:
 *   - GET /api/diagrams/:diagramId/preview.svg
 *   - GET /embed/:diagramId
 *
 * The diagramId itself is the bearer (it's a 128-bit base64url-random
 * string); these endpoints are anonymous on purpose. The tests cover:
 *   - happy-path render (Content-Type, ETag, Cache-Control)
 *   - 404 on missing diagram (uniform with the rest of the API)
 *   - 304 on If-None-Match match
 *   - cache hit: a second request within the cache TTL re-renders only
 *     when `updatedAt` has changed
 *   - HTML embed page contains the inline SVG and an editor link
 *   - HTML embed page sets `frame-ancestors *` so any host can iframe
 *
 * The render path goes through the actual `ConversionResource` worker
 * thread — these tests are slow (~1–2 s) but they exercise the real
 * pipeline, which is the only way to catch a JSDOM / library regression
 * before it lands in production.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import request from "supertest"
import { buildApp } from "../http/app"
import { loadConfig } from "../config"
import { getRedis } from "./setup"

let app: ReturnType<typeof buildApp>

beforeEach(async () => {
  const redis = await getRedis()
  const config = loadConfig()
  app = buildApp({ config, redis, autoLogging: false })
})

const baseDiagram = {
  version: "4.0.0",
  title: "Embed Test",
  type: "ClassDiagram",
  nodes: [],
  edges: [],
  assessments: {},
}

async function createDiagram(): Promise<{ id: string; updatedAt: string }> {
  const res = await request(app).post("/api/diagrams").send(baseDiagram)
  expect(res.status).toBe(201)
  return { id: res.body.id, updatedAt: res.body.updatedAt }
}

// The conversion worker thread is heavyweight — a single render takes
// ~1 s on cold cache. Increase the per-test timeout for these specs
// only.
const TIMEOUT = 20_000

describe("GET /api/diagrams/:id/preview.svg", () => {
  it(
    "renders an SVG with the right headers",
    async () => {
      const { id, updatedAt } = await createDiagram()
      const res = await request(app)
        .get(`/api/diagrams/${id}/preview.svg`)
        // Supertest parses unknown content-types as Buffer; ask for the
        // raw body so we can string-assert.
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = []
          response.on("data", (chunk: Buffer) => chunks.push(chunk))
          response.on("end", () =>
            callback(null, Buffer.concat(chunks).toString("utf8"))
          )
        })
      expect(res.status).toBe(200)
      expect(res.headers["content-type"]).toMatch(/^image\/svg\+xml/)
      expect(res.headers["etag"]).toBe(`W/"${updatedAt}"`)
      expect(res.headers["cache-control"]).toContain("public")
      expect(res.headers["cache-control"]).toContain("max-age=60")
      expect(res.headers["cache-control"]).toContain(
        "stale-while-revalidate=86400"
      )
      expect(res.headers["x-content-type-options"]).toBe("nosniff")
      const body = res.body as string
      expect(body).toContain("<svg")
      expect(body).toContain("</svg>")
      // Defence-in-depth: the sanitizer must have removed any inline
      // scripts that an upstream regression could leak.
      expect(body).not.toMatch(/<script\b/i)
      expect(body).not.toMatch(/<foreignObject\b/i)
    },
    TIMEOUT
  )

  it(
    "returns 304 on If-None-Match match",
    async () => {
      const { id, updatedAt } = await createDiagram()
      const first = await request(app).get(`/api/diagrams/${id}/preview.svg`)
      expect(first.status).toBe(200)
      const etag = first.headers["etag"]
      expect(etag).toBe(`W/"${updatedAt}"`)

      const second = await request(app)
        .get(`/api/diagrams/${id}/preview.svg`)
        .set("if-none-match", etag)
      expect(second.status).toBe(304)
      expect(second.text).toBe("")
    },
    TIMEOUT
  )

  it(
    "re-renders after the diagram's updatedAt changes",
    async () => {
      const { id } = await createDiagram()
      const first = await request(app).get(`/api/diagrams/${id}/preview.svg`)
      expect(first.status).toBe(200)
      const firstEtag = first.headers["etag"]

      // Mutate the diagram — `saveHead` bumps updatedAt.
      await new Promise((r) => setTimeout(r, 5))
      const updated = await request(app)
        .put(`/api/diagrams/${id}`)
        .send({ ...baseDiagram, title: "Mutated" })
      expect(updated.status).toBe(200)

      const second = await request(app).get(`/api/diagrams/${id}/preview.svg`)
      expect(second.status).toBe(200)
      const secondEtag = second.headers["etag"]
      expect(secondEtag).not.toBe(firstEtag)
    },
    TIMEOUT
  )

  it("returns 404 for a missing diagram", async () => {
    const res = await request(app).get(
      `/api/diagrams/no-such-diagram/preview.svg`
    )
    expect(res.status).toBe(404)
    expect(res.body.error).toBe("NOT_FOUND")
  })

  it("returns 422 for an invalid diagramId", async () => {
    const res = await request(app).get(`/api/diagrams/has spaces/preview.svg`)
    expect(res.status).toBe(422)
  })
})

describe("GET /embed/:id", () => {
  it(
    "returns an HTML page with inline SVG and an Open in Apollon link",
    async () => {
      const { id, updatedAt } = await createDiagram()
      const res = await request(app).get(`/embed/${id}`)
      expect(res.status).toBe(200)
      expect(res.headers["content-type"]).toMatch(/^text\/html/)
      expect(res.headers["etag"]).toBe(`W/"${updatedAt}"`)
      expect(res.headers["cache-control"]).toContain("public")
      // The CSP for the HTML page must allow * frame-ancestors so any
      // README-renderer can iframe it.
      expect(res.headers["content-security-policy"]).toContain(
        "frame-ancestors *"
      )
      // No inline scripts ever; anyone who finds one in the embed shell
      // has broken the contract.
      expect(res.headers["content-security-policy"]).toContain(
        "default-src 'none'"
      )
      // Body smoke checks.
      expect(res.text).toContain("<svg")
      expect(res.text).toContain("Open in Apollon")
      expect(res.text).toContain(`/${id}`) // editor href
      // Title is HTML-escaped.
      expect(res.text).toMatch(
        /<title>Embed Test\s*&mdash;\s*Apollon<\/title>|<title>Embed Test\s*—\s*Apollon<\/title>/
      )
    },
    TIMEOUT
  )

  it(
    "HTML title is HTML-escaped to defeat title-injection",
    async () => {
      const evil = await request(app)
        .post("/api/diagrams")
        .send({
          ...baseDiagram,
          title: `</title><script>alert(1)</script>`,
        })
      expect(evil.status).toBe(201)
      const res = await request(app).get(`/embed/${evil.body.id}`)
      expect(res.status).toBe(200)
      // Raw `<script>` from the user's title MUST NOT appear unescaped
      // — `escapeHtml` should have rendered it as `&lt;script&gt;`.
      expect(res.text).not.toMatch(/<\/title><script>/)
      expect(res.text).toMatch(/&lt;script&gt;/)
    },
    TIMEOUT
  )

  it("returns 404 for a missing diagram", async () => {
    const res = await request(app).get(`/embed/no-such-diagram`)
    expect(res.status).toBe(404)
  })

  it(
    "returns 304 on If-None-Match match",
    async () => {
      const { id } = await createDiagram()
      const first = await request(app).get(`/embed/${id}`)
      expect(first.status).toBe(200)
      const etag = first.headers["etag"]
      const second = await request(app)
        .get(`/embed/${id}`)
        .set("if-none-match", etag)
      expect(second.status).toBe(304)
    },
    TIMEOUT
  )
})

afterAll(async () => {
  // Allow the conversion-resource worker thread a tick to drain so
  // vitest doesn't flag a hanging handle on the test runner exit.
  await new Promise((r) => setTimeout(r, 50))
})
