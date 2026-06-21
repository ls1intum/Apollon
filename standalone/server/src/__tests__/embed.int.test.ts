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
import { k } from "../redis.js"
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

  it("frames the diagram as a themed card with a baked-in Open in Apollon button", async () => {
    const app = appWith(okResource())
    const id = await createDiagram(app)
    const res = await request(app)
      .get(`/api/diagrams/${id}/preview.svg`)
      .buffer(true)
    expect(res.status).toBe(200)
    const body = asText(res)
    // A bordered card, a white diagram inset (so it reads on a dark README), the
    // original diagram content, and the baked-in CTA — all adapting to the
    // viewer's theme via prefers-color-scheme.
    expect(body).toContain('class="fr-card"')
    expect(body).toContain('class="fr-inset"')
    expect(body).toContain("Open in Apollon")
    expect(body).toContain("prefers-color-scheme: dark")
    expect(body).toMatch(/\.fr-inset\s*\{\s*fill:\s*#ffffff/i) // inset stays white
    expect(body).toContain('fill="#abcdef"') // diagram content survives framing
  })

  it("?frame=plain drops the footer/CTA for the non-clickable snippet", async () => {
    const app = appWith(okResource())
    const id = await createDiagram(app)
    const res = await request(app)
      .get(`/api/diagrams/${id}/preview.svg?frame=plain`)
      .buffer(true)
    expect(res.status).toBe(200)
    const body = asText(res)
    // Still the framed card (inset + border), but no button that links nowhere.
    expect(body).toContain('class="fr-inset"')
    expect(body).not.toContain("Open in Apollon")
    expect(body).not.toContain('class="fr-btn"')
    expect(body).toContain('fill="#abcdef"')
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

    // A multi-tag If-None-Match list matches too (guards against a naive
    // revert to single-token equality).
    const list = await request(app)
      .get(`/api/diagrams/${id}/preview.svg`)
      .set("if-none-match", `W/"999", ${first.headers["etag"]}`)
    expect(list.status).toBe(304)
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

    // The ETag and the body advance together (read atomically), so the OLD tag
    // must NOT 304 after the edit — otherwise a stale render would be pinned to
    // a fresh revision.
    const stale = await request(app)
      .get(`/api/diagrams/${id}/preview.svg`)
      .set("if-none-match", first.headers["etag"])
    expect(stale.status).toBe(200)
    expect(stale.headers["etag"]).toBe(second.headers["etag"])
  })

  it("treats the strong ETag form (as the PUT route mints) as a match", async () => {
    // RFC 7232 §3.2 mandates weak comparison for If-None-Match. The PUT route
    // returns a STRONG `"<headRev>"`; a client revalidating the embed with that
    // tag must still 304 even though we emit the weak `W/"<headRev>"`.
    const app = appWith(okResource())
    const id = await createDiagram(app)
    const first = await request(app).get(`/api/diagrams/${id}/preview.svg`)
    const strong = first.headers["etag"].replace(/^W\//, "")
    const res = await request(app)
      .get(`/api/diagrams/${id}/preview.svg`)
      .set("if-none-match", strong)
    expect(res.status).toBe(304)
  })

  it("serves HEAD with headers and an empty body, without rendering", async () => {
    const resource = fakeResource(async () => {
      throw new Error("HEAD must not invoke the renderer")
    })
    const app = appWith(resource)
    const id = await createDiagram(app)
    const head = await request(app).head(`/api/diagrams/${id}/preview.svg`)
    expect(head.status).toBe(200)
    expect(head.headers["content-type"]).toMatch(/^image\/svg\+xml/)
    expect(head.headers["etag"]).toMatch(/^W\/"\d+"$/)
    expect(head.text).toBeFalsy()
    expect(resource.calls).toBe(0)
  })

  it("maps queue saturation to a typed 503 with Retry-After + no-store", async () => {
    const app = appWith(
      fakeResource(async () => {
        throw new QueueFullError("Conversion queue is full")
      })
    )
    const id = await createDiagram(app)
    const res = await request(app).get(`/api/diagrams/${id}/preview.svg`)
    expect(res.status).toBe(503)
    expect(res.body.error).toBe("RENDERER_BUSY")
    // A real header — not just a JSON field — so Camo/browsers back off, and the
    // transient error is never cached against the diagramId.
    expect(res.headers["retry-after"]).toBe("2")
    expect(res.headers["cache-control"]).toBe("no-store")
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

  it("rejects over-length and non-URL-safe ids with 422 before storage", async () => {
    const app = appWith(okResource())
    // 65 chars (cap is 64) and a unicode id — both fail the zod grammar at the
    // boundary, never reaching readDiagram / Redis key construction.
    for (const id of ["a".repeat(65), "%E6%97%A5%E6%9C%AC%E8%AA%9E"]) {
      const res = await request(app).get(`/api/diagrams/${id}/preview.svg`)
      expect(res.status, id).toBe(422)
      expect(res.body.error).toBe("INVALID_PARAMS")
    }
  })

  it("serves a repeat request from the render cache without re-rendering", async () => {
    const resource = okResource()
    const app = appWith(resource)
    const id = await createDiagram(app)
    await request(app).get(`/api/diagrams/${id}/preview.svg`).buffer(true)
    const afterFirst = resource.calls
    expect(afterFirst).toBe(1)
    // Same (id, headRev) → served from the in-process cache, renderer untouched.
    await request(app).get(`/api/diagrams/${id}/preview.svg`).buffer(true)
    expect(resource.calls).toBe(afterFirst)
  })

  it("does not cache a non-queue render error (500)", async () => {
    const app = appWith(
      fakeResource(async () => {
        throw new Error("renderer exploded")
      })
    )
    const id = await createDiagram(app)
    const res = await request(app).get(`/api/diagrams/${id}/preview.svg`)
    expect(res.status).toBe(500)
    // A transient render failure must never be cached against the diagramId.
    expect(res.headers["cache-control"]).toBe("no-store")
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
      /href="https:\/\/[^"]+\/shared\/[A-Za-z0-9_-]+\?view=COLLABORATE"/
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

  it("returns 404 for a missing diagram on the HTML route", async () => {
    const res = await request(app).get("/embed/no-such-diagram")
    expect(res.status).toBe(404)
    expect(res.body.error).toBe("NOT_FOUND")
  })

  it("maps queue saturation on the HTML route to 503 with no-store", async () => {
    // The HTML route has its own copy of the cache-header code; prove a 503
    // there is not cached and never carries the 200-path public header.
    const busyApp = appWith(
      fakeResource(async () => {
        throw new QueueFullError("Conversion queue is full")
      })
    )
    const id = await createDiagram(busyApp)
    const res = await request(busyApp).get(`/embed/${id}`)
    expect(res.status).toBe(503)
    expect(res.body.error).toBe("RENDERER_BUSY")
    expect(res.headers["cache-control"]).toBe("no-store")
  })
})

describe("sliding TTL — reads keep an embedded diagram alive", () => {
  const fullTtl = loadConfig().DIAGRAM_TTL_SECONDS

  it("a preview.svg fetch refreshes a decayed TTL back to (near) full", async () => {
    const app = appWith(okResource())
    const id = await createDiagram(app)
    // Simulate a diagram that has aged most of the way to expiry.
    await redis.expire(k.diagram(id), 1000)
    await redis.expire(k.diagramMeta(id), 1000)

    await request(app).get(`/api/diagrams/${id}/preview.svg`).expect(200)

    // Both the body and meta keys are slid back to the full window.
    expect(await redis.ttl(k.diagram(id))).toBeGreaterThan(fullTtl - 60)
    expect(await redis.ttl(k.diagramMeta(id))).toBeGreaterThan(fullTtl - 60)
  })

  it("the /embed page and the editor GET refresh too", async () => {
    const app = appWith(okResource())
    const id = await createDiagram(app)

    await redis.expire(k.diagram(id), 1000)
    await request(app).get(`/embed/${id}`).expect(200)
    expect(await redis.ttl(k.diagram(id))).toBeGreaterThan(fullTtl - 60)

    await redis.expire(k.diagram(id), 1000)
    await request(app).get(`/api/diagrams/${id}`).expect(200)
    expect(await redis.ttl(k.diagram(id))).toBeGreaterThan(fullTtl - 60)
  })

  it("a 304 conditional GET still refreshes (Camo revalidation keeps it alive)", async () => {
    const app = appWith(okResource())
    const id = await createDiagram(app)
    const first = await request(app).get(`/api/diagrams/${id}/preview.svg`)
    await redis.expire(k.diagram(id), 1000)

    await request(app)
      .get(`/api/diagrams/${id}/preview.svg`)
      .set("if-none-match", first.headers["etag"])
      .expect(304)
    expect(await redis.ttl(k.diagram(id))).toBeGreaterThan(fullTtl - 60)
  })

  it("does not refresh while the TTL is still fresh (throttle)", async () => {
    const app = appWith(okResource())
    const id = await createDiagram(app)
    // Inside the throttle window (above full − 1 day): a read must NOT bump it,
    // so a busy embed can't write-amplify into an EXPIRE per fetch.
    const fresh = fullTtl - 12 * 3600
    await redis.expire(k.diagram(id), fresh)
    await request(app).get(`/api/diagrams/${id}/preview.svg`).expect(200)

    const ttl = await redis.ttl(k.diagram(id))
    expect(ttl).toBeLessThanOrEqual(fresh)
    expect(ttl).toBeGreaterThan(fresh - 60)
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
    expect(res.status).toBe(200)
    const body = asText(res)
    // A real render: namespaced root, a closing tag, and actual drawn content —
    // not an empty/degenerate envelope. Worth the worker spin-up only if the
    // payoff is a non-trivial SVG.
    expect(body).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(body.trimEnd()).toMatch(/<\/svg>$/)
    expect(body).toMatch(/<(path|rect|text|g)\b/)
    // The real render is wrapped in the themed card with the baked-in CTA.
    expect(body).toContain('class="fr-card"')
    expect(body).toContain("Open in Apollon")
  }, 20_000)

  it("renders an edge bound to a hidden *-between-* anchor", async () => {
    // React Flow can't position the hidden `*-between-*` handle under JSDOM, so
    // an edge bound to one must be re-anchored to its named side
    // (`normalizeModelForServerRender`) or it vanishes from the export.
    const node = (id: string, x: number) => ({
      id,
      width: 160,
      height: 100,
      type: "class",
      position: { x, y: 285 },
      data: { name: "Class", methods: [], attributes: [] },
      measured: { width: 160, height: 100 },
    })
    const model = {
      version: "4.0.0",
      title: "Between Handle",
      type: "ClassDiagram",
      nodes: [node("a", 330), node("b", 645)],
      edges: [
        {
          id: "e1",
          source: "a",
          target: "b",
          type: "ClassUnidirectional",
          sourceHandle: "right",
          targetHandle: "left-between-mid-bottom-center",
          data: { points: [] },
        },
      ],
      assessments: {},
    }
    const created = await request(app).post("/api/diagrams").send(model)
    expect(created.status).toBe(201)

    const res = await request(app)
      .get(`/api/diagrams/${created.body.id}/preview.svg`)
      .buffer(true)
    expect(res.status).toBe(200)
    // The edge survives the export: a visible edge path is present.
    expect(asText(res)).toMatch(/react-flow__edge-path|data-inline-marker/)
  }, 20_000)

  it("positions an edge label on the edge, not at a fallback point", async () => {
    // Edge labels are placed by measuring the path with getTotalLength /
    // getPointAtLength; the svgPathGeometry shim makes that work under JSDOM so
    // the label sits on the line instead of at the straight source→target
    // midpoint, which for this L-shaped path is off the line entirely.
    const node = (id: string, type: string, x: number, y: number) => ({
      id,
      width: 160,
      height: 60,
      type,
      position: { x, y },
      data: { name: id },
      measured: { width: 160, height: 60 },
    })
    const model = {
      version: "4.0.0",
      title: "BPMN",
      type: "BPMN",
      nodes: [
        node("a", "bpmnTransaction", 215, 395),
        node("b", "bpmnSubprocess", 500, 185),
      ],
      edges: [
        {
          id: "e1",
          source: "a",
          target: "b",
          type: "BPMNSequenceFlow",
          sourceHandle: "right",
          targetHandle: "left",
          data: {
            points: [
              { x: 376, y: 425 },
              { x: 469, y: 425 },
              { x: 469, y: 215 },
              { x: 499, y: 215 },
            ],
            label: "edgelabel",
          },
        },
      ],
      assessments: {},
    }
    const created = await request(app).post("/api/diagrams").send(model)
    expect(created.status).toBe(201)
    const res = await request(app)
      .get(`/api/diagrams/${created.body.id}/preview.svg`)
      .buffer(true)
    expect(res.status).toBe(200)

    const m = asText(res).match(
      /<text x="([\d.]+)" y="([\d.]+)"[^>]*>edgelabel<\/text>/
    )
    expect(m).not.toBeNull()
    const [lx, ly] = [Number(m![1]), Number(m![2])]
    // The on-path midpoint is on the vertical segment at ~(469, 352); the label
    // must sit within a small offset of it (the source→target midpoint ~(438,
    // 334) is ~37px away, off the line).
    const dist = Math.hypot(lx - 469, ly - 352)
    expect(dist).toBeLessThan(25)
  }, 20_000)
})
