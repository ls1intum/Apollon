import { Router, type Request } from "express"
import type { Redis } from "../redis.js"
import { k } from "../redis.js"
import { Errors } from "../http/errors.js"
import { validate } from "../http/middleware/validate.js"
import {
  type ConversionResource,
  QueueFullError,
} from "../resources/conversion-resource.js"
import { readDiagram } from "./diagrams.js"
import { DiagramIdParams } from "./_schemas.js"
import type { Diagram } from "../types.js"
import type { UMLModel } from "@tumaet/apollon"
import type { SvgPreviewCache } from "../services/svg-preview-cache.js"

interface Deps {
  redis: Redis
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
const HTML_CSP = [
  "default-src 'none'",
  // `img-src 'self' data:` is load-bearing: it is the only egress sink open to
  // the inlined (untrusted) SVG's CSS, so it MUST NOT be widened to remote
  // hosts or a CSS-exfiltration channel opens.
  "img-src 'self' data:",
  "style-src 'unsafe-inline'",
  "frame-ancestors *",
].join("; ")

/** Reads the diagram and derives its weak ETag from `headRev`. */
async function readDiagramWithEtag(
  redis: Redis,
  diagramId: string
): Promise<{ diagram: Diagram; etag: string } | null> {
  const diagram = await readDiagram(redis, diagramId)
  if (!diagram) return null
  const headRev = (await redis.hGet(k.diagramMeta(diagramId), "headRev")) ?? "0"
  return { diagram, etag: `W/"${headRev}"` }
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
 * Renders to an SVG string through the cache + single-flight, mapping queue
 * saturation to a typed transient 503. The cache key is `(id, etag)`: immutable
 * per revision, and shared by both the SVG and HTML routes so either warms the
 * other.
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
      return typeof data === "string" ? data : data.toString("utf8")
    })
  } catch (error) {
    if (error instanceof QueueFullError) throw Errors.rendererBusy()
    throw error
  }
}

export function mountEmbedApiRoutes(deps: Deps): Router {
  const { redis } = deps
  const router = Router()

  router.get(
    "/diagrams/:diagramId/preview.svg",
    validate(
      { params: DiagramIdParams },
      async (req, res, _next, { params }) => {
        const found = await readDiagramWithEtag(redis, params.diagramId)
        if (!found) throw Errors.notFound("diagram not found")

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
  const { redis } = deps
  const router = Router()

  router.get(
    "/:diagramId",
    validate(
      { params: DiagramIdParams },
      async (req, res, _next, { params }) => {
        const found = await readDiagramWithEtag(redis, params.diagramId)
        if (!found) throw Errors.notFound("diagram not found")

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
