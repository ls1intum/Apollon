import { Router, type Request } from "express"
import type { Redis } from "../redis"
import { k } from "../redis"
import { ApiError, Errors } from "../http/errors"
import { validate } from "../http/middleware/validate"
import type { EmbedPreviewService } from "../services/embed-preview"
import { readDiagram } from "./diagrams"
import { DiagramIdParams } from "./_schemas"

interface Deps {
  redis: Redis
  /**
   * Lazy provider for the preview service. Allocation is deferred to
   * the first embed request so a `buildApp` call that never serves an
   * embed (e.g. the diagram + version test suites) doesn't trigger
   * worker-thread creation. Subsequent calls return the same instance,
   * keeping the LRU + coalescing maps coherent across requests.
   */
  getPreviewService: () => EmbedPreviewService
}

/**
 * Embed surface. Two routes mounted at the app level.
 *
 *   GET  /api/diagrams/:diagramId/preview.svg
 *      Public, cacheable SVG render. The diagramId is the bearer —
 *      there is no token / role / cookie. The id is a 128-bit
 *      base64url-random string (`routes/diagrams.ts:generateDiagramId`)
 *      so the URL itself is unguessable; the embed surface inherits
 *      the same access model as the editor URL.
 *
 *      Headers:
 *        Cache-Control: public, max-age=60, stale-while-revalidate=86400
 *        ETag:          W/"<headRev>"  (matches the PUT response so
 *                                       the same identity is observed
 *                                       across writers and readers)
 *        Content-Type:  image/svg+xml; charset=utf-8
 *        X-Content-Type-Options: nosniff
 *        Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'
 *
 *   GET  /embed/:diagramId
 *      Server-rendered HTML shell. Inline SVG + a small "Open in
 *      Apollon" link, no JS bundle. CSP `frame-ancestors *` so any
 *      host can iframe it. Suitable for GitLab snippets / Notion /
 *      Confluence / VS Code preview.
 *
 * Cold-start: the very first embed request after a fresh `buildApp`
 * pays a one-time worker-thread spin-up cost — JSDOM globals init
 * plus the library's lazy module load (up to ~6 s on slow disks per
 * `conversion-service.ts:42-57`). Camo's retry behavior absorbs the
 * latency for the public surface; warm the worker by hitting
 * `GET /api/converter/status` if you care about cold p99.
 */

const RENDER_OVERLOADED_MESSAGES = new Set([
  "Conversion queue is full",
  "Conversion worker timed out",
])

/**
 * Maps render-pipeline errors to typed ApiErrors. Queue saturation and
 * worker timeouts are transient — surface as 503 with a `Retry-After`
 * so well-behaved clients (Camo, browsers) back off and retry rather
 * than caching a 500 against the diagramId.
 */
function classifyRenderError(err: unknown): ApiError | null {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : ""
  if (RENDER_OVERLOADED_MESSAGES.has(message)) {
    // 503 RENDERER_BUSY is an explicit "transient overload" signal —
    // distinct from REDIS_UNAVAILABLE so dashboards / alerts /
    // log-pipelines filtering on the Redis-outage code don't false-
    // positive on render saturation.
    return new ApiError(503, "RENDERER_BUSY", "Render pipeline busy", {
      retryAfterSeconds: 1,
    })
  }
  return null
}

const SVG_HEADERS = {
  cacheControl: "public, max-age=60, stale-while-revalidate=86400",
  contentType: "image/svg+xml; charset=utf-8",
  csp: "default-src 'none'; style-src 'unsafe-inline'",
} as const

const HTML_HEADERS = {
  cacheControl: "public, max-age=60, stale-while-revalidate=86400",
  contentType: "text/html; charset=utf-8",
  csp: [
    "default-src 'none'",
    "img-src 'self' data:",
    "style-src 'unsafe-inline'",
    "frame-ancestors *",
  ].join("; "),
  referrerPolicy: "no-referrer",
  // Permissions-Policy: opt out of every interest-tracking surface
  // the page has no business using. `interest-cohort` is the legacy
  // FLoC opt-out (kept for older browsers); `browsing-topics` is its
  // Topics-API replacement (Chrome 115+). Listing both keeps the
  // header forward-compatible across the Chrome migration.
  permissionsPolicy: "interest-cohort=(), browsing-topics=()",
} as const

/** Reads the diagram + its current `headRev` (used as the ETag). */
async function readDiagramWithRev(
  redis: Redis,
  diagramId: string
): Promise<{
  diagram: NonNullable<Awaited<ReturnType<typeof readDiagram>>>
  headRev: string
} | null> {
  const diagram = await readDiagram(redis, diagramId)
  if (!diagram) return null
  const rev = (await redis.hGet(k.diagramMeta(diagramId), "headRev")) ?? "0"
  return { diagram, headRev: rev }
}

function etagFor(headRev: string): string {
  return `W/"${headRev}"`
}

export function mountEmbedApiRoutes({
  redis,
  getPreviewService,
}: Deps): Router {
  const router = Router()

  router.get(
    "/diagrams/:diagramId/preview.svg",
    validate(
      { params: DiagramIdParams },
      async (req, res, _next, { params }) => {
        const found = await readDiagramWithRev(redis, params.diagramId)
        if (!found) throw Errors.notFound("diagram not found")
        const etag = etagFor(found.headRev)

        // Conditional GET: if the client's ETag matches, return 304
        // before touching the renderer.
        if (req.header("if-none-match") === etag) {
          res.setHeader("etag", etag)
          res.setHeader("cache-control", SVG_HEADERS.cacheControl)
          res.status(304).end()
          return
        }

        let rendered
        try {
          rendered = await getPreviewService().render(found.diagram)
        } catch (err) {
          const mapped = classifyRenderError(err)
          if (mapped) throw mapped
          throw err
        }

        res.setHeader("content-type", SVG_HEADERS.contentType)
        res.setHeader("etag", etag)
        res.setHeader("cache-control", SVG_HEADERS.cacheControl)
        res.setHeader("x-content-type-options", "nosniff")
        // SVG-as-image renderers ignore CSP, but if anyone ever consumes
        // the response as HTML, we want a deny-all default.
        res.setHeader("content-security-policy", SVG_HEADERS.csp)
        res.status(200).send(rendered.svg)
      }
    )
  )

  return router
}

export function mountEmbedRoutes({ redis, getPreviewService }: Deps): Router {
  const router = Router()

  router.get(
    "/:diagramId",
    validate(
      { params: DiagramIdParams },
      async (req, res, _next, { params }) => {
        const found = await readDiagramWithRev(redis, params.diagramId)
        if (!found) throw Errors.notFound("diagram not found")
        const etag = etagFor(found.headRev)

        if (req.header("if-none-match") === etag) {
          res.setHeader("etag", etag)
          res.setHeader("cache-control", HTML_HEADERS.cacheControl)
          res.status(304).end()
          return
        }

        let rendered
        try {
          rendered = await getPreviewService().render(found.diagram)
        } catch (err) {
          const mapped = classifyRenderError(err)
          if (mapped) throw mapped
          throw err
        }

        const editorHref = buildEditorHref(req, found.diagram.id)
        const html = renderEmbedHtml({
          title: found.diagram.title || "Apollon diagram",
          svg: rendered.svg,
          clip: rendered.clip,
          editorHref,
        })

        res.setHeader("content-type", HTML_HEADERS.contentType)
        res.setHeader("etag", etag)
        res.setHeader("cache-control", HTML_HEADERS.cacheControl)
        res.setHeader("x-content-type-options", "nosniff")
        // The embed page is intentionally framable from anywhere — the
        // diagramId is the access bearer; iframing adds no privilege.
        res.setHeader("content-security-policy", HTML_HEADERS.csp)
        res.setHeader("referrer-policy", HTML_HEADERS.referrerPolicy)
        res.setHeader("permissions-policy", HTML_HEADERS.permissionsPolicy)
        res.status(200).send(html)
      }
    )
  )

  return router
}

/**
 * Builds an absolute URL from the request's own protocol + host. Behind
 * a reverse proxy, `req.protocol` honours `X-Forwarded-Proto` thanks to
 * `app.set("trust proxy", …)` in `buildApp`. The encodeURIComponent on
 * the diagramId is defence-in-depth: route validation already restricts
 * the param to URL-safe chars, but encoding makes the URL safe to paste
 * verbatim into HTML.
 */
function buildEditorHref(req: Request, diagramId: string): string {
  const host = req.get("host") ?? ""
  return `${req.protocol}://${host}/${encodeURIComponent(diagramId)}`
}

interface EmbedHtmlInput {
  title: string
  svg: string
  clip: { x: number; y: number; width: number; height: number }
  editorHref: string
}

/**
 * Renders the embed HTML shell. No JS, no remote assets, ~1 KiB of
 * inline CSS. Body is an inline SVG plus an "Open in Apollon" anchor.
 *
 * The title is HTML-escaped because it lands in `<title>` and inside
 * the body. The svg is pre-sanitized by `sanitizeSvg` upstream and is
 * inserted verbatim.
 */
function renderEmbedHtml({
  title,
  svg,
  clip,
  editorHref,
}: EmbedHtmlInput): string {
  const safeTitle = escapeHtml(title)
  const w = Math.max(1, Math.round(clip.width))
  const h = Math.max(1, Math.round(clip.height))
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${safeTitle} - Apollon</title>
<style>
  /* Light by default; dark via prefers-color-scheme. The canvas
     itself stays on a white surface in both modes because the
     library's exported SVG uses hardcoded fills tuned for a
     light background — flipping the canvas to dark would break
     contrast. The chrome (footer, borders) follows the system
     theme. */
  :root { color-scheme: light dark; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; background: #fff; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #111; }
  .apollon-embed { display: flex; flex-direction: column; height: 100%; min-height: 100vh; }
  .apollon-embed__canvas { flex: 1; display: flex; align-items: center; justify-content: center; padding: 8px; overflow: auto; background: #fff; }
  .apollon-embed__canvas svg { max-width: 100%; max-height: 100%; height: auto; width: auto; aspect-ratio: ${w} / ${h}; }
  .apollon-embed__footer { padding: 6px 12px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(0,0,0,0.08); }
  .apollon-embed__title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px; opacity: 0.7; }
  .apollon-embed__open { color: inherit; text-decoration: none; padding: 4px 10px; border-radius: 6px; border: 1px solid currentColor; opacity: 0.85; }
  .apollon-embed__open:hover { opacity: 1; }
  @media (prefers-color-scheme: dark) {
    html, body { background: #0d1117; color: #e6edf3; }
    .apollon-embed__footer { border-top-color: rgba(255,255,255,0.08); }
  }
</style>
</head>
<body>
<main class="apollon-embed">
  <div class="apollon-embed__canvas">${svg}</div>
  <footer class="apollon-embed__footer">
    <span class="apollon-embed__title">${safeTitle}</span>
    <a class="apollon-embed__open" rel="noopener noreferrer" target="_top" href="${escapeHtml(editorHref)}">Open in Apollon</a>
  </footer>
</main>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
