import { Router, type Request } from "express"
import type { Redis } from "../redis.js"
import { k } from "../redis.js"
import { Errors } from "../http/errors.js"
import { validate } from "../http/middleware/validate.js"
import {
  type ConversionResource,
  QueueFullError,
} from "../resources/conversion-resource.js"
import { DiagramIdParams } from "./_schemas.js"
import { refreshDiagramTtl } from "./diagrams.js"
import type { Config } from "../config.js"
import type { Diagram } from "../types.js"
import type { UMLModel } from "@tumaet/apollon"
import type { SvgPreviewCache } from "../services/svg-preview-cache.js"

interface Deps {
  redis: Redis
  /** TTL config for the sliding-expiry refresh on embed reads. */
  config: Config
  /** Lazy provider for the shared conversion worker pool (see `buildApp`). */
  getResource: () => ConversionResource
  /**
   * Shared render cache + single-flight. Collapses the Camo fan-out (many
   * concurrent requests for the same `(id, headRev)`) to one render and serves
   * repeats from memory.
   */
  previewCache: SvgPreviewCache
}

/**
 * Embed surface — `GET /api/diagrams/:id/preview.svg` (cacheable `image/svg+xml`
 * for `<img>`/Camo) and `GET /embed/:id` (iframe-friendly HTML shell). The
 * diagramId is the unguessable bearer (see `diagrams.ts:generateDiagramId`); no
 * token or cookie. Both carry a weak `ETag` (= `headRev`) + SWR cache and a
 * deny-all CSP — with no `script-src`, script in the library SVG cannot execute,
 * so it is inlined verbatim without a sanitizer.
 */

const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=86400"
const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'"

// The "Open in Apollon" call-to-action badge, embedded under the diagram in the
// recommended Markdown snippet. It is diagram-independent (the per-diagram link
// is applied by wrapping this image in a Markdown link), so it is a single
// immutable asset with a one-year cache. Light/dark adapt via an internal
// `prefers-color-scheme` media query: when a host (GitHub Camo, GitLab, …)
// serves it as an `<img>`, the browser still evaluates the query against the
// viewer's OS theme, so the badge matches the surrounding page.
const BUTTON_CACHE_CONTROL = "public, max-age=31536000, immutable"
const OPEN_BUTTON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="178" height="44" viewBox="0 0 178 44" role="img" aria-label="Open in Apollon">
<style>
  .bg { fill: #ffffff; }
  .bd { stroke: #d0d7de; }
  .tx { fill: #1f2328; }
  .ac { fill: #0f3a66; }
  .acs { stroke: #0f3a66; }
  text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; font-size: 13.5px; font-weight: 600; letter-spacing: 0.1px; }
  @media (prefers-color-scheme: dark) {
    .bg { fill: #1f2630; }
    .bd { stroke: #3d444d; }
    .tx { fill: #e6edf3; }
    .ac { fill: #6cb0ff; }
    .acs { stroke: #6cb0ff; }
    /* Lift the shadow on dark so the pill still detaches from the page. */
    .sh { flood-color: #000000; flood-opacity: 0.45; }
  }
</style>
<filter id="sh" x="-20%" y="-20%" width="140%" height="170%">
  <feDropShadow class="sh" dx="0" dy="1.3" stdDeviation="1.3" flood-color="#0b1f3a" flood-opacity="0.22"/>
</filter>
<rect class="bg bd" filter="url(#sh)" x="4" y="3" width="170" height="34" rx="9" stroke-width="1.5"/>
<g transform="translate(17 9.5)">
  <rect class="ac" x="0" y="2" width="8.5" height="6.5" rx="1.5"/>
  <rect class="ac" x="12" y="12.5" width="8.5" height="6.5" rx="1.5"/>
  <path class="acs" d="M5.5 8.5 L15 12.5" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</g>
<text class="tx" x="47" y="24.5">Open in Apollon</text>
</svg>
`
const HTML_CSP = [
  "default-src 'none'",
  // `img-src 'self' data:` is load-bearing: it is the only egress sink open to
  // the inlined (untrusted) SVG's CSS, so it MUST NOT be widened to remote
  // hosts or a CSS-exfiltration channel opens.
  "img-src 'self' data:",
  "style-src 'unsafe-inline'",
  "frame-ancestors *",
].join("; ")

/**
 * Reads the diagram body and its `headRev` in ONE transaction and derives the
 * weak ETag from `headRev`. MULTI/EXEC executes atomically with no interleave,
 * so a concurrent PUT cannot pair an old body with a new `headRev` — which
 * would cache stale SVG under a fresh ETag and then 304 forever. The two keys
 * share the `{id}` hash tag (same slot), so this also holds under Redis Cluster.
 */
async function readDiagramWithEtag(
  redis: Redis,
  diagramId: string
): Promise<{ diagram: Diagram; etag: string; ttlSeconds: number } | null> {
  const multi = redis.multi()
  multi.json.get(k.diagram(diagramId), { path: "$" })
  multi.hGet(k.diagramMeta(diagramId), "headRev")
  // Pull the remaining TTL in the same round trip so the sliding-expiry refresh
  // needs no extra read on the embed hot path.
  multi.ttl(k.diagram(diagramId))
  const replies = (await multi.exec()) as unknown[]
  for (const reply of replies) {
    if (reply instanceof Error) throw reply
  }

  // `json.get` with path `$` returns an array; an empty/absent result is a miss.
  const body = replies[0] as Diagram[] | null
  const diagram =
    body && Array.isArray(body) && body.length > 0 ? body[0] : undefined
  if (!diagram) return null

  const headRev = (replies[1] as string | null) ?? "0"
  const ttlSeconds = Number(replies[2] ?? -1)
  return { diagram, etag: `W/"${headRev}"`, ttlSeconds }
}

/**
 * RFC 7232 §3.2: `If-None-Match` uses the WEAK comparison function, so strip the
 * `W/` prefix on both sides before comparing opaque-tags. This matches a client
 * echoing either our weak ETag or the STRONG ETag the PUT route mints
 * (`diagrams.ts`) for the same `headRev`. Honours the `*` and multi-tag list
 * forms too. Safe to split on `,` only because our opaque-tags are `[0-9]+`.
 */
function ifNoneMatch(header: string | undefined, etag: string): boolean {
  if (!header) return false
  if (header.trim() === "*") return true
  const opaque = (tag: string) => tag.trim().replace(/^W\//, "")
  const target = opaque(etag)
  return header.split(",").some((tag) => opaque(tag) === target)
}

/**
 * Inlines an opaque white background as the first child of the SVG. The library
 * export is transparent and its strokes/text are tuned for a light canvas, so a
 * diagram dropped into a dark-mode page (a GitHub dark README) would otherwise
 * render dark-on-dark and be unreadable. White rather than theme-adaptive: the
 * diagram's own fills can't be recolored to suit a dark canvas, so the canvas
 * itself must stay light — matching the `/embed` HTML page, which is white in
 * both schemes for the same reason.
 *
 * The rect is sized to the SVG's own `viewBox` (which can have a negative
 * origin, e.g. `-70 -110 1050 670`); if the viewBox is missing or malformed it
 * falls back to an oversized rect that the SVG viewport clips to the canvas.
 */
function withOpaqueBackground(svg: string): string {
  const openTag = svg.match(/<svg\b[^>]*>/i)
  if (!openTag) return svg
  const viewBox = openTag[0].match(/viewBox\s*=\s*"([^"]+)"/i)
  const parts = viewBox?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)
  const rect =
    parts && parts.length === 4 && parts.every(Number.isFinite)
      ? `<rect x="${parts[0]}" y="${parts[1]}" width="${parts[2]}" height="${parts[3]}" fill="#ffffff"/>`
      : `<rect x="-100000" y="-100000" width="200000" height="200000" fill="#ffffff"/>`
  const insertAt = (openTag.index ?? 0) + openTag[0].length
  return svg.slice(0, insertAt) + rect + svg.slice(insertAt)
}

/**
 * Renders to an SVG string through the cache + single-flight, mapping queue
 * saturation to a typed transient 503. The cache key is `(id, etag)`: immutable
 * per revision, and shared by both the SVG and HTML routes so either warms the
 * other. The cached value already carries the opaque background so neither route
 * re-processes it.
 */
async function renderSvg(
  deps: Deps,
  diagram: Diagram,
  etag: string
): Promise<string> {
  try {
    return await deps.previewCache.render(`${diagram.id}:${etag}`, async () => {
      // Widen storage's string `version` to UMLModel — same cast the converter uses.
      const { data } = await deps
        .getResource()
        .render("svg", diagram as UMLModel)
      const svg = typeof data === "string" ? data : data.toString("utf8")
      return withOpaqueBackground(svg)
    })
  } catch (error) {
    if (error instanceof QueueFullError) throw Errors.rendererBusy()
    throw error
  }
}

export function mountEmbedApiRoutes(deps: Deps): Router {
  const { redis, config } = deps
  const router = Router()

  // Static "Open in Apollon" badge for the Markdown embed snippet. No diagram
  // lookup, no render — a constant asset served with a long immutable cache.
  router.get("/embed/button.svg", (_req, res) => {
    res.type("image/svg+xml")
    res.setHeader("cache-control", BUTTON_CACHE_CONTROL)
    res.setHeader("x-content-type-options", "nosniff")
    res.setHeader("content-security-policy", SVG_CSP)
    res.status(200).send(OPEN_BUTTON_SVG)
  })

  router.get(
    "/diagrams/:diagramId/preview.svg",
    validate(
      { params: DiagramIdParams },
      async (req, res, _next, { params }) => {
        const found = await readDiagramWithEtag(redis, params.diagramId)
        if (!found) throw Errors.notFound("diagram not found")
        // A fetch (incl. Camo revalidating to a 304) means the embed is live —
        // slide the TTL so it doesn't expire out from under the README.
        await refreshDiagramTtl(
          redis,
          config.DIAGRAM_TTL_SECONDS,
          params.diagramId,
          found.ttlSeconds
        )

        // Conditional GET / HEAD short-circuit — before any render. Cache
        // headers are set here and on the 200 path only, never before the
        // render, so a 503/500 is never cached against the diagramId.
        if (ifNoneMatch(req.header("if-none-match"), found.etag)) {
          res.setHeader("etag", found.etag)
          res.setHeader("cache-control", CACHE_CONTROL)
          res.status(304).end()
          return
        }

        const setHeaders = () => {
          res.type("image/svg+xml")
          res.setHeader("etag", found.etag)
          res.setHeader("cache-control", CACHE_CONTROL)
          res.setHeader("x-content-type-options", "nosniff")
          res.setHeader("content-security-policy", SVG_CSP)
        }

        // HEAD returns the metadata without paying the render cost.
        if (req.method === "HEAD") {
          setHeaders()
          res.status(200).end()
          return
        }

        const svg = await renderSvg(deps, found.diagram, found.etag)
        setHeaders()
        res.status(200).send(svg)
      }
    )
  )

  return router
}

export function mountEmbedRoutes(deps: Deps): Router {
  const { redis, config } = deps
  const router = Router()

  router.get(
    "/:diagramId",
    validate(
      { params: DiagramIdParams },
      async (req, res, _next, { params }) => {
        const found = await readDiagramWithEtag(redis, params.diagramId)
        if (!found) throw Errors.notFound("diagram not found")
        // Viewing the embed page keeps the diagram alive (see the SVG route).
        await refreshDiagramTtl(
          redis,
          config.DIAGRAM_TTL_SECONDS,
          params.diagramId,
          found.ttlSeconds
        )

        if (ifNoneMatch(req.header("if-none-match"), found.etag)) {
          res.setHeader("etag", found.etag)
          res.setHeader("cache-control", CACHE_CONTROL)
          res.status(304).end()
          return
        }

        const setHeaders = () => {
          res.type("html")
          res.setHeader("etag", found.etag)
          res.setHeader("cache-control", CACHE_CONTROL)
          res.setHeader("x-content-type-options", "nosniff")
          res.setHeader("content-security-policy", HTML_CSP)
          res.setHeader("referrer-policy", "no-referrer")
          // Opt out of FLoC and its Topics-API successor.
          res.setHeader(
            "permissions-policy",
            "interest-cohort=(), browsing-topics=()"
          )
        }

        if (req.method === "HEAD") {
          setHeaders()
          res.status(200).end()
          return
        }

        const svg = await renderSvg(deps, found.diagram, found.etag)
        const html = renderEmbedHtml({
          title: found.diagram.title || "Apollon diagram",
          svg,
          editorHref: buildEditorHref(req, found.diagram.id),
        })
        setHeaders()
        res.status(200).send(html)
      }
    )
  )

  return router
}

/**
 * Absolute editor URL targeting the webapp's `/shared/:id?view=EDIT` route (the
 * bare `/:id` 404s without `?view`). Uses `req.get("host")` (the verbatim `Host`
 * header) deliberately — NOT `req.hostname`, which under `trust proxy` honours
 * the client-spoofable `X-Forwarded-Host`. The link host is therefore only as
 * trustworthy as the edge proxy's `Host` hygiene; keep `req.get("host")` here.
 */
function buildEditorHref(req: Request, diagramId: string): string {
  const host = req.get("host") ?? ""
  return `${req.protocol}://${host}/shared/${encodeURIComponent(diagramId)}?view=EDIT`
}

interface EmbedHtmlInput {
  title: string
  svg: string
  editorHref: string
}

/**
 * The embed HTML shell: no JS, no remote assets. The pre-rendered SVG is inlined
 * verbatim (sized by its own viewBox); `title` is HTML-escaped for the `<title>`
 * and footer text contexts.
 */
function renderEmbedHtml({ title, svg, editorHref }: EmbedHtmlInput): string {
  const safeTitle = escapeHtml(title)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${safeTitle} - Apollon</title>
<style>
  /* The exported SVG uses fills tuned for a light canvas, so the canvas stays
     white in both colour schemes; only the chrome follows the system theme. */
  :root { color-scheme: light dark; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; background: #fff; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #111; }
  .apollon-embed { display: flex; flex-direction: column; height: 100%; min-height: 100vh; }
  .apollon-embed__canvas { flex: 1; display: flex; align-items: center; justify-content: center; padding: 8px; overflow: auto; background: #fff; }
  .apollon-embed__canvas svg { max-width: 100%; max-height: 100%; height: auto; width: auto; }
  .apollon-embed__footer { padding: 6px 12px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(0,0,0,0.08); }
  .apollon-embed__title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px; opacity: 0.7; }
  .apollon-embed__open { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; color: #fff; background: #0f3a66; text-decoration: none; padding: 5px 12px; border-radius: 6px; font-weight: 600; transition: background 0.15s ease; }
  .apollon-embed__open:hover { background: #15497f; }
  .apollon-embed__open svg { display: block; }
  @media (prefers-color-scheme: dark) {
    html, body { background: #0d1117; color: #e6edf3; }
    .apollon-embed__footer { border-top-color: rgba(255,255,255,0.08); }
    .apollon-embed__open { background: #1f6feb; }
    .apollon-embed__open:hover { background: #388bfd; }
  }
</style>
</head>
<body>
<main class="apollon-embed">
  <div class="apollon-embed__canvas">${svg}</div>
  <footer class="apollon-embed__footer">
    <span class="apollon-embed__title">${safeTitle}</span>
    <a class="apollon-embed__open" rel="noopener noreferrer" target="_top" href="${escapeHtml(editorHref)}">Open in Apollon<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg></a>
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
