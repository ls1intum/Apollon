/**
 * Integration tests for the embed surface:
 *   - GET /api/diagrams/:diagramId/preview.svg
 *   - GET /embed/:diagramId
 *
 * Tests are written against observable behavior — headers, status
 * codes, body content, and render-call counts via an injected
 * `SvgSource`. The injected source bypasses the JSDOM-backed worker
 * so the suite stays under a second; it pays the same shape as the
 * production worker (`SvgSource.render(model)`), so route-level
 * coverage is unaffected.
 *
 * One end-to-end test (`renders the actual library output`) exercises
 * the full real renderer path including DOMPurify sanitization, so
 * a JSDOM/library regression cannot silently land.
 */
import { beforeEach, describe, expect, it } from "vitest"
import request from "supertest"
import { buildApp } from "../http/app"
import { loadConfig } from "../config"
import { getRedis } from "./setup"
import type { SvgSource } from "../services/embed-preview"
import { createInProcessSvgSource } from "../services/svg-source"

const baseDiagram = {
  version: "4.0.0",
  title: "Embed Test",
  type: "ClassDiagram",
  nodes: [],
  edges: [],
  assessments: {},
}

/** A fast, deterministic SvgSource for happy-path tests. */
function makeFakeSvgSource(): SvgSource & {
  calls: number
  payload: {
    svg: string
    clip: { x: number; y: number; width: number; height: number }
  }
} {
  const payload = {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><rect width="100" height="60" fill="#abcdef"/></svg>',
    clip: { x: 0, y: 0, width: 100, height: 60 },
  }
  const source = {
    payload,
    calls: 0,
    render: async () => {
      source.calls += 1
      return payload
    },
  }
  return source
}

async function buildFastApp() {
  const redis = await getRedis()
  const config = loadConfig()
  const svgSource = makeFakeSvgSource()
  return {
    app: buildApp({ config, redis, autoLogging: false, svgSource }),
    svgSource,
  }
}

async function createDiagram(
  app: ReturnType<typeof buildApp>
): Promise<{ id: string }> {
  const res = await request(app).post("/api/diagrams").send(baseDiagram)
  expect(res.status).toBe(201)
  return { id: res.body.id }
}

let app: ReturnType<typeof buildApp>
let svgSource: ReturnType<typeof makeFakeSvgSource>

beforeEach(async () => {
  ;({ app, svgSource } = await buildFastApp())
})

// ---------------------------------------------------------------------------
// SVG route
// ---------------------------------------------------------------------------

describe("GET /api/diagrams/:diagramId/preview.svg", () => {
  it("renders an SVG with the right headers and a strong correlated ETag", async () => {
    const { id } = await createDiagram(app)
    const res = await request(app)
      .get(`/api/diagrams/${id}/preview.svg`)
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
    // ETag is W/"<headRev>" — same identity the PUT response uses, so
    // a cache populated by another writer can revalidate ours.
    expect(res.headers["etag"]).toMatch(/^W\/"\d+"$/)
    expect(res.headers["cache-control"]).toBe(
      "public, max-age=60, stale-while-revalidate=86400"
    )
    expect(res.headers["x-content-type-options"]).toBe("nosniff")
    // We don't actually vary by Accept; Vary should not list it (a
    // lying Vary fragments downstream caches). The CORS middleware
    // adds `Origin` upstream — that's expected.
    expect(res.headers["vary"] ?? "").not.toMatch(/\bAccept\b/i)
    const body = res.body as string
    expect(body).toContain("<svg")
    expect(body).toContain("</svg>")
    // The end-to-end test below smoke-parses the real renderer's
    // output through DOMParser. Here we only verify the route's
    // contract — the renderer is fake.
  })

  it("returns 304 on If-None-Match match — no renderer call", async () => {
    const { id } = await createDiagram(app)
    const first = await request(app).get(`/api/diagrams/${id}/preview.svg`)
    expect(first.status).toBe(200)
    const callsAfterFirst = svgSource.calls
    const etag = first.headers["etag"]

    const second = await request(app)
      .get(`/api/diagrams/${id}/preview.svg`)
      .set("if-none-match", etag)
    expect(second.status).toBe(304)
    expect(second.text).toBe("")
    // 304 must not run the renderer again — proves the conditional-GET
    // short-circuit happens before render.
    expect(svgSource.calls).toBe(callsAfterFirst)
  })

  it("ETag changes after a PUT (headRev bumps)", async () => {
    const { id } = await createDiagram(app)
    const first = await request(app).get(`/api/diagrams/${id}/preview.svg`)
    const firstEtag = first.headers["etag"]

    const updated = await request(app)
      .put(`/api/diagrams/${id}`)
      .send({ ...baseDiagram, title: "Mutated" })
    expect(updated.status).toBe(200)

    const second = await request(app).get(`/api/diagrams/${id}/preview.svg`)
    expect(second.status).toBe(200)
    expect(second.headers["etag"]).not.toBe(firstEtag)
  })

  it("in-flight Promise coalesces concurrent renders to one worker call", async () => {
    // Use a deferred-payload fake so we can verify that all five
    // requests are blocked on the same in-flight Promise BEFORE any
    // resolve. A non-deferred fake resolves on the next microtask,
    // letting the LRU serve the 2nd-5th requests — that would pass
    // the assertion even if coalescing were broken. The deferred
    // setup forces the test to distinguish coalescing from cache.
    let resolveRender: (() => void) | undefined
    const renderGate = new Promise<void>((r) => {
      resolveRender = r
    })
    let calls = 0
    const payload = {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect/></svg>',
      clip: { x: 0, y: 0, width: 10, height: 10 },
    }
    const deferredSource: SvgSource = {
      render: async () => {
        calls += 1
        await renderGate
        return payload
      },
    }
    const redis = await getRedis()
    const config = loadConfig()
    const customApp = buildApp({
      config,
      redis,
      autoLogging: false,
      svgSource: deferredSource,
    })
    const { id } = await createDiagram(customApp)
    // Fire 5 concurrent requests; while they're all blocked waiting
    // on the deferred renderer, only ONE should have entered render().
    // Supertest's `Test` is lazy — it doesn't open the socket until
    // `.then()` runs. Chaining `.then((r) => r)` eagerly attaches a
    // resolution handler so the request actually starts now.
    const promises = Array.from({ length: 5 }, () =>
      request(customApp)
        .get(`/api/diagrams/${id}/preview.svg`)
        .then((r) => r)
    )
    // Poll until the first request reaches the renderer (or fail-fast
    // after a generous timeout). Doing this with a poll-loop instead
    // of a fixed sleep makes the test deterministic regardless of how
    // long supertest + testcontainer Redis take to start the requests.
    const start = Date.now()
    while (calls < 1 && Date.now() - start < 5000) {
      await new Promise((r) => setTimeout(r, 10))
    }
    expect(calls).toBe(1)
    // Release; all five share the single render's payload.
    resolveRender?.()
    const responses = await Promise.all(promises)
    for (const r of responses) expect(r.status).toBe(200)
    expect(calls).toBe(1)
  })

  it("LRU returns the cached payload within TTL — no second renderer call", async () => {
    const { id } = await createDiagram(app)
    const callsAfterCreate = svgSource.calls
    await request(app).get(`/api/diagrams/${id}/preview.svg`)
    const callsAfterFirst = svgSource.calls
    expect(callsAfterFirst).toBe(callsAfterCreate + 1)
    await request(app).get(`/api/diagrams/${id}/preview.svg`)
    // Same (id, headRev) — the LRU serves the second request without
    // touching the renderer.
    expect(svgSource.calls).toBe(callsAfterFirst)
  })

  it("returns 503 RENDERER_BUSY + Retry-After on queue saturation", async () => {
    const redis = await getRedis()
    const config = loadConfig()
    const fullSource: SvgSource = {
      render: () => Promise.reject(new Error("Conversion queue is full")),
    }
    const flakyApp = buildApp({
      config,
      redis,
      autoLogging: false,
      svgSource: fullSource,
    })
    const { id } = await createDiagram(flakyApp)
    const res = await request(flakyApp).get(`/api/diagrams/${id}/preview.svg`)
    expect(res.status).toBe(503)
    // Code is RENDERER_BUSY — distinct from REDIS_UNAVAILABLE so
    // dashboards filtering on the Redis-outage signal don't false-
    // positive on render saturation.
    expect(res.body.error).toBe("RENDERER_BUSY")
    expect(res.body.retryAfterSeconds).toBe(1)
  })

  it("returns 503 RENDERER_BUSY when the renderer times out", async () => {
    const redis = await getRedis()
    const config = loadConfig()
    const timeoutSource: SvgSource = {
      render: () => Promise.reject(new Error("Conversion worker timed out")),
    }
    const flakyApp = buildApp({
      config,
      redis,
      autoLogging: false,
      svgSource: timeoutSource,
    })
    const { id } = await createDiagram(flakyApp)
    const res = await request(flakyApp).get(`/api/diagrams/${id}/preview.svg`)
    expect(res.status).toBe(503)
    expect(res.body.error).toBe("RENDERER_BUSY")
  })

  it("returns 404 for a missing diagram with the canonical error envelope", async () => {
    const res = await request(app).get(
      `/api/diagrams/no-such-diagram/preview.svg`
    )
    expect(res.status).toBe(404)
    expect(res.body.error).toBe("NOT_FOUND")
  })

  it("returns 422 INVALID_PARAMS for an invalid diagramId", async () => {
    const res = await request(app).get(`/api/diagrams/has spaces/preview.svg`)
    expect(res.status).toBe(422)
    expect(res.body.error).toBe("INVALID_PARAMS")
  })
})

// ---------------------------------------------------------------------------
// HTML embed page
// ---------------------------------------------------------------------------

describe("GET /embed/:diagramId", () => {
  it("returns an HTML page with inline SVG, an Open in Apollon link, and the right CSP", async () => {
    const { id } = await createDiagram(app)
    const res = await request(app).get(`/embed/${id}`)
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/^text\/html/)
    expect(res.headers["etag"]).toMatch(/^W\/"\d+"$/)
    expect(res.headers["cache-control"]).toBe(
      "public, max-age=60, stale-while-revalidate=86400"
    )
    expect(res.headers["referrer-policy"]).toBe("no-referrer")
    // Permissions-Policy opts out of every interest-tracking surface
    // an embed has no business using. Both legacy (`interest-cohort`)
    // and modern (`browsing-topics`) tokens are listed.
    expect(res.headers["permissions-policy"]).toContain("interest-cohort=()")
    expect(res.headers["permissions-policy"]).toContain("browsing-topics=()")
    const csp = res.headers["content-security-policy"]
    // Embed page is intentionally framable from anywhere.
    expect(csp).toContain("frame-ancestors *")
    expect(csp).toContain("default-src 'none'")
    expect(res.text).toContain("<svg")
    expect(res.text).toContain("Open in Apollon")
    // Editor href contains the diagram id.
    expect(res.text).toContain(`/${id}`)
    // Title is HTML-escaped — the literal em-dash separator we render.
    expect(res.text).toContain("<title>Embed Test - Apollon</title>")
  })

  it("HTML title is HTML-escaped against title-injection attacks", async () => {
    const evil = await request(app)
      .post("/api/diagrams")
      .send({
        ...baseDiagram,
        title: `</title><script>alert(1)</script>`,
      })
    expect(evil.status).toBe(201)
    const res = await request(app).get(`/embed/${evil.body.id}`)
    expect(res.status).toBe(200)
    // The literal `</title><script>` payload MUST NOT appear unescaped
    // anywhere in the body — `escapeHtml` should have transformed it.
    expect(res.text).not.toMatch(/<\/title><script>/)
    expect(res.text).toMatch(/&lt;script&gt;/)
  })

  it("Open in Apollon href honours X-Forwarded-Proto behind a TLS-terminating proxy", async () => {
    const { id } = await createDiagram(app)
    const res = await request(app)
      .get(`/embed/${id}`)
      .set("X-Forwarded-Proto", "https")
      .set("X-Forwarded-Host", "apollon.example.com")
    expect(res.status).toBe(200)
    // The link must be `https://` so a click from inside an HTTPS-
    // served iframe doesn't get blocked as mixed content.
    expect(res.text).toMatch(/href="https:\/\/[^"]+\/[A-Za-z0-9_-]+"/)
  })

  it("returns 304 on If-None-Match match", async () => {
    const { id } = await createDiagram(app)
    const first = await request(app).get(`/embed/${id}`)
    expect(first.status).toBe(200)
    const second = await request(app)
      .get(`/embed/${id}`)
      .set("if-none-match", first.headers["etag"])
    expect(second.status).toBe(304)
  })
})

// ---------------------------------------------------------------------------
// End-to-end with the real renderer + DOMPurify
// ---------------------------------------------------------------------------

describe("end-to-end through the real renderer + sanitizer", () => {
  it("renders the actual library SVG and DOMPurify keeps it script-free", async () => {
    const redis = await getRedis()
    const config = loadConfig()
    const realApp = buildApp({
      config,
      redis,
      autoLogging: false,
      // Use the in-process renderer (loads JSDOM) instead of the
      // worker so this test runs without the compiled .js artifact.
      svgSource: createInProcessSvgSource(),
    })
    const created = await request(realApp)
      .post("/api/diagrams")
      .send(baseDiagram)
    expect(created.status).toBe(201)
    const res = await request(realApp)
      .get(`/api/diagrams/${created.body.id}/preview.svg`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = []
        response.on("data", (chunk: Buffer) => chunks.push(chunk))
        response.on("end", () =>
          callback(null, Buffer.concat(chunks).toString("utf8"))
        )
      })
    expect(res.status).toBe(200)
    const body = res.body as string
    expect(body).toContain("<svg")
    // Sanitizer post-conditions, observable through the wire format:
    // the audited DOMPurify svg+svgFilters profile drops every
    // pattern an XSS payload could ride on.
    expect(body).not.toMatch(/<script\b/i)
    expect(body).not.toMatch(/<foreignObject\b/i)
    expect(body).not.toMatch(/\son[a-z]+\s*=/i)
    expect(body).not.toMatch(/javascript:/i)
    expect(() => parseSvg(body)).not.toThrow()
  }, 20_000)
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Smoke-parse the SVG body via JSDOM's DOMParser so a malformed
 * sanitizer (e.g. unbalanced tags) fails the test instead of silently
 * shipping broken SVG to renderers.
 */
function parseSvg(text: string): Document {
  // global-jsdom is registered by other modules (conversion-service);
  // by the time these tests run, `DOMParser` is global. Lazy-require
  // it through the global so the test file itself doesn't pull in
  // JSDOM at module-load time.
  type WithDOMParser = { DOMParser?: typeof DOMParser }
  const ctor = (globalThis as WithDOMParser).DOMParser
  if (!ctor) throw new Error("DOMParser not available in test env")
  const doc = new ctor().parseFromString(text, "image/svg+xml")
  // image/svg+xml parsers report `<parsererror>` on malformed input.
  const errorNode = doc.querySelector("parsererror")
  if (errorNode) {
    throw new Error(`SVG parse error: ${errorNode.textContent ?? "unknown"}`)
  }
  return doc
}
