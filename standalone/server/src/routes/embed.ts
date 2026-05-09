import { Router } from "express"
import type { Config } from "../config"
import type { Redis } from "../redis"
import { Errors } from "../http/errors"
import { validate } from "../http/middleware/validate"
import {
  createEmbedPreviewService,
  type SvgSource,
} from "../services/embed-preview"
import { defaultSvgSource } from "../services/svg-source"
import { readDiagram } from "./diagrams"
import { DiagramIdParams } from "./_schemas"

interface Deps {
  config: Config
  redis: Redis
  /**
   * Optional override for the SVG renderer. Production omits this and
   * gets the default worker-backed renderer; tests can inject the
   * in-process renderer directly so they don't depend on the worker
   * thread's compiled `.js` artifact.
   */
  svgSource?: SvgSource
}

/**
 * Embed surface. Two routes mounted at the app level.
 *
 *   GET  /api/diagrams/:diagramId/preview.svg
 *      Public, cacheable SVG render. The diagramId is the bearer — there
 *      is no token / role / cookie. The id is a 128-bit base64url-random
 *      string (`routes/diagrams.ts:generateDiagramId`) so the URL itself
 *      is unguessable; the embed surface inherits the same access model
 *      as the editor URL.
 *
 *      Headers:
 *        - Cache-Control: public, max-age=60, stale-while-revalidate=86400
 *        - ETag: W/"<updatedAt>"
 *        - Vary: Accept
 *        - Content-Type: image/svg+xml; charset=utf-8
 *        - X-Content-Type-Options: nosniff
 *        - Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'
 *
 *      The CSP `default-src 'none'` is enforced inside the SVG when it
 *      ever ends up in a context where one applies (rare for image/svg+xml
 *      embeds, but defensive). External resource loads from inside the
 *      SVG are blocked.
 *
 *   GET  /embed/:diagramId
 *      Server-rendered HTML shell. Inline SVG + a small "Open in Apollon"
 *      link, no JS bundle. CSP `frame-ancestors *` so any host can iframe
 *      it. Suitable for GitLab snippets / Notion / Confluence / VS Code
 *      preview where iframes are accepted.
 */
export function mountEmbedApiRoutes(deps: Deps): Router {
  const router = Router()
  const svgSource = deps.svgSource ?? defaultSvgSource()
  const previewService = createEmbedPreviewService({
    redis: deps.redis,
    svgSource,
  })

  router.get(
    "/diagrams/:diagramId/preview.svg",
    validate(
      { params: DiagramIdParams },
      async (req, res, _next, { params }) => {
        const diagram = await readDiagram(deps.redis, params.diagramId)
        if (!diagram) throw Errors.notFound("diagram not found")

        // Conditional GET — the ETag is content-derived (`updatedAt`),
        // which the diagram PUT path mutates on every change.
        const etag = `W/"${diagram.updatedAt}"`
        const ifNoneMatch = req.header("if-none-match")
        if (ifNoneMatch && ifNoneMatch === etag) {
          res.setHeader("etag", etag)
          // 304 must NOT carry a body but should preserve cache headers
          // so intermediaries can refresh their freshness signals.
          res.setHeader(
            "cache-control",
            "public, max-age=60, stale-while-revalidate=86400"
          )
          res.status(304).end()
          return
        }

        const { svg } = await previewService.render(diagram)

        res.setHeader("content-type", "image/svg+xml; charset=utf-8")
        res.setHeader("etag", etag)
        res.setHeader(
          "cache-control",
          "public, max-age=60, stale-while-revalidate=86400"
        )
        res.setHeader("vary", "Accept")
        res.setHeader("x-content-type-options", "nosniff")
        // SVG-as-image renderers ignore CSP, but if anyone ever consumes
        // the response as HTML, we want a deny-all default.
        res.setHeader(
          "content-security-policy",
          "default-src 'none'; style-src 'unsafe-inline'"
        )
        res.status(200).send(svg)
      }
    )
  )

  return router
}

export function mountEmbedRoutes(deps: Deps): Router {
  const router = Router()
  const svgSource = deps.svgSource ?? defaultSvgSource()
  const previewService = createEmbedPreviewService({
    redis: deps.redis,
    svgSource,
  })

  router.get(
    "/:diagramId",
    validate(
      { params: DiagramIdParams },
      async (req, res, _next, { params }) => {
        const diagram = await readDiagram(deps.redis, params.diagramId)
        if (!diagram) throw Errors.notFound("diagram not found")

        const etag = `W/"${diagram.updatedAt}"`
        const ifNoneMatch = req.header("if-none-match")
        if (ifNoneMatch && ifNoneMatch === etag) {
          res.setHeader("etag", etag)
          res.setHeader(
            "cache-control",
            "public, max-age=60, stale-while-revalidate=86400"
          )
          res.status(304).end()
          return
        }

        const { svg, clip } = await previewService.render(diagram)
        const editorHref = buildEditorHref(req, diagram.id)
        const html = renderEmbedHtml({
          title: diagram.title || "Apollon diagram",
          svg,
          clip,
          editorHref,
        })

        res.setHeader("content-type", "text/html; charset=utf-8")
        res.setHeader("etag", etag)
        res.setHeader(
          "cache-control",
          "public, max-age=60, stale-while-revalidate=86400"
        )
        res.setHeader("x-content-type-options", "nosniff")
        // The embed page is intentionally framable from anywhere — the
        // diagramId is the access token. `frame-ancestors *` explicitly
        // permits any embedder; `default-src 'none'` blocks anything
        // that isn't inline (no JS, no remote assets).
        res.setHeader(
          "content-security-policy",
          [
            "default-src 'none'",
            "img-src 'self' data:",
            "style-src 'unsafe-inline'",
            "frame-ancestors *",
          ].join("; ")
        )
        res.status(200).send(html)
      }
    )
  )

  return router
}

function buildEditorHref(
  req: Parameters<Parameters<Router["get"]>[1]>[0],
  diagramId: string
): string {
  // Build an absolute URL from the request's own protocol + host so a
  // click-through from inside an iframe lands on the right deployment.
  // Behind a proxy, `req.protocol` honours `trust proxy` if set; else
  // falls back to the connection's literal scheme.
  const protocol = (req.protocol || "https") as string
  const host = req.get("host") ?? ""
  return `${protocol}://${host}/${encodeURIComponent(diagramId)}`
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
 * The title goes through `escapeHtml` because it lands in `<title>` and
 * inside the body — both contexts require HTML-escaped text. The svg is
 * pre-sanitized by `sanitizeSvg` upstream and is inserted verbatim.
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
<title>${safeTitle} — Apollon</title>
<style>
  :root { color-scheme: light dark; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; background: #fff; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #111; }
  @media (prefers-color-scheme: dark) {
    html, body { background: #0d1117; color: #e6edf3; }
  }
  .apollon-embed { display: flex; flex-direction: column; height: 100%; min-height: 100vh; }
  .apollon-embed__canvas { flex: 1; display: flex; align-items: center; justify-content: center; padding: 8px; overflow: auto; }
  .apollon-embed__canvas svg { max-width: 100%; max-height: 100%; height: auto; width: auto; aspect-ratio: ${w} / ${h}; }
  .apollon-embed__footer { padding: 6px 12px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(0,0,0,0.08); }
  @media (prefers-color-scheme: dark) {
    .apollon-embed__footer { border-top-color: rgba(255,255,255,0.08); }
  }
  .apollon-embed__title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px; opacity: 0.7; }
  .apollon-embed__open { color: inherit; text-decoration: none; padding: 4px 10px; border-radius: 6px; border: 1px solid currentColor; opacity: 0.85; }
  .apollon-embed__open:hover { opacity: 1; }
</style>
</head>
<body>
<main class="apollon-embed">
  <div class="apollon-embed__canvas">${svg}</div>
  <footer class="apollon-embed__footer">
    <span class="apollon-embed__title">${safeTitle}</span>
    <a class="apollon-embed__open" rel="noopener noreferrer" target="_top" href="${escapeHtmlAttr(editorHref)}">Open in Apollon</a>
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

function escapeHtmlAttr(s: string): string {
  return escapeHtml(s)
}
