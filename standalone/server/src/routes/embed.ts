import { Router, type Request, type Response } from "express"
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

interface Deps {
  redis: Redis
  /** Lazy provider for the shared conversion worker pool (see `buildApp`). */
  getResource: () => ConversionResource
}

/**
 * Embed surface — two public routes that share the editor's access model: the
 * diagramId is a 128-bit base64url-random string (`diagrams.ts:generateDiagramId`)
 * so the URL itself is the unguessable bearer. No token, role, or cookie.
 *
 *   GET /api/diagrams/:diagramId/preview.svg
 *     Cacheable SVG, served as `image/svg+xml` for GitHub/GitLab READMEs
 *     (rendered through Camo's `<img>` proxy) and any other `<img>` context.
 *
 *   GET /embed/:diagramId
 *     Server-rendered HTML shell (inline SVG + "Open in Apollon" link, no JS
 *     bundle). `frame-ancestors *` so any host can iframe it — GitLab snippets,
 *     Notion, Confluence, VS Code preview.
 *
 * Both carry `Cache-Control: public, max-age=60, stale-while-revalidate=86400`
 * and a weak `ETag: W/"<headRev>"` — the same identity `saveHead` bumps — so a
 * cache populated by one writer revalidates correctly for every reader, and a
 * conditional GET short-circuits before the renderer runs.
 *
 * Security: both responses set `Content-Security-Policy: default-src 'none'`
 * (the embed page additionally allows only `img-src`, `style-src
 * 'unsafe-inline'`, and `frame-ancestors *`). With no `script-src`, an inline
 * `<script>`, an `on*=` handler, or a `javascript:` URI riding inside the
 * library-generated SVG cannot execute — so the SVG is inlined verbatim
 * without a sanitizer pass. The only HTML interpolation is the diagram title,
 * which is HTML-escaped.
 *
 * Cold start: the first embed request after boot pays the one-time worker
 * spin-up (JSDOM globals + the library's lazy module load). Camo's retry
 * behaviour absorbs it; warm it with `GET /api/converter/status` if cold p99
 * matters.
 */

const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'"
const HTML_CSP = [
  "default-src 'none'",
  "img-src 'self' data:",
  "style-src 'unsafe-inline'",
  "frame-ancestors *",
].join("; ")
const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=86400"
const RETRY_AFTER_SECONDS = 1

/** Reads the diagram and its current `headRev` (used verbatim as the ETag). */
async function readDiagramWithRev(
  redis: Redis,
  diagramId: string
): Promise<{ diagram: Diagram; headRev: string } | null> {
  const diagram = await readDiagram(redis, diagramId)
  if (!diagram) return null
  const headRev = (await redis.hGet(k.diagramMeta(diagramId), "headRev")) ?? "0"
  return { diagram, headRev }
}

const etagFor = (headRev: string): string => `W/"${headRev}"`

/**
 * Renders the diagram to an SVG string through the shared worker. Queue
 * saturation surfaces as a 503 with a real `Retry-After` header so Camo and
 * browsers back off instead of caching a hard error against the diagramId.
 * Returns the SVG string, or `null` if it already sent the 503 response.
 */
async function renderSvgOr503(
  getResource: () => ConversionResource,
  res: Response,
  diagram: Diagram
): Promise<string | null> {
  try {
    // `Diagram.version` is a plain string at the storage boundary; the library
    // renderer's `UMLModel` narrows it to `4.x.y`. The server intentionally
    // does not pin the version format (see `_schemas.ts`), so widen here — the
    // same cast `/api/converter/*` applies to its request body.
    const { data } = await getResource().render("svg", diagram as UMLModel)
    return typeof data === "string" ? data : data.toString("utf8")
  } catch (error) {
    if (error instanceof QueueFullError) {
      res.setHeader("retry-after", String(RETRY_AFTER_SECONDS))
      res.status(503).json({ error: error.message })
      return null
    }
    throw error
  }
}

export function mountEmbedApiRoutes({ redis, getResource }: Deps): Router {
  const router = Router()

  router.get(
    "/diagrams/:diagramId/preview.svg",
    validate(
      { params: DiagramIdParams },
      async (req, res, _next, { params }) => {
        const found = await readDiagramWithRev(redis, params.diagramId)
        if (!found) throw Errors.notFound("diagram not found")
        const etag = etagFor(found.headRev)

        res.setHeader("cache-control", CACHE_CONTROL)
        res.setHeader("etag", etag)
        if (req.header("if-none-match") === etag) {
          res.status(304).end()
          return
        }

        const svg = await renderSvgOr503(getResource, res, found.diagram)
        if (svg === null) return

        res.setHeader("content-type", "image/svg+xml; charset=utf-8")
        res.setHeader("x-content-type-options", "nosniff")
        // SVG-as-image renderers ignore CSP, but a deny-all default protects
        // any client that consumes the response as a top-level document.
        res.setHeader("content-security-policy", SVG_CSP)
        res.status(200).send(svg)
      }
    )
  )

  return router
}

export function mountEmbedRoutes({ redis, getResource }: Deps): Router {
  const router = Router()

  router.get(
    "/:diagramId",
    validate(
      { params: DiagramIdParams },
      async (req, res, _next, { params }) => {
        const found = await readDiagramWithRev(redis, params.diagramId)
        if (!found) throw Errors.notFound("diagram not found")
        const etag = etagFor(found.headRev)

        res.setHeader("cache-control", CACHE_CONTROL)
        res.setHeader("etag", etag)
        if (req.header("if-none-match") === etag) {
          res.status(304).end()
          return
        }

        const svg = await renderSvgOr503(getResource, res, found.diagram)
        if (svg === null) return

        const html = renderEmbedHtml({
          title: found.diagram.title || "Apollon diagram",
          svg,
          editorHref: buildEditorHref(req, found.diagram.id),
        })

        res.setHeader("content-type", "text/html; charset=utf-8")
        res.setHeader("x-content-type-options", "nosniff")
        res.setHeader("content-security-policy", HTML_CSP)
        res.setHeader("referrer-policy", "no-referrer")
        // Opt out of interest-tracking surfaces an embed has no business using
        // — both the legacy FLoC token and its Topics-API replacement.
        res.setHeader(
          "permissions-policy",
          "interest-cohort=(), browsing-topics=()"
        )
        res.status(200).send(html)
      }
    )
  )

  return router
}

/**
 * Absolute editor URL from the request's own protocol + host. Behind a reverse
 * proxy `req.protocol` honours `X-Forwarded-Proto` thanks to `trust proxy`
 * (set in `buildApp`). `encodeURIComponent` is defence-in-depth — route
 * validation already restricts the id to URL-safe chars.
 *
 * Targets the webapp's canonical `/shared/:id?view=EDIT` route. The bare
 * `/:id` route 404s without a `?view` query (it only redirects legacy native
 * links), so the view must be explicit; `EDIT` mirrors the webapp's
 * `DEFAULT_SHARED_DIAGRAM_VIEW`.
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
 * The embed HTML shell: no JS, no remote assets, ~1 KiB of inline CSS. The SVG
 * is inlined verbatim (sized by its own intrinsic `viewBox` plus the CSS
 * below); the title is HTML-escaped because it lands in `<title>` and the
 * footer.
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
