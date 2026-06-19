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
 * Embed surface — two public routes. The diagramId is the unguessable bearer
 * (128-bit base64url, see `diagrams.ts:generateDiagramId`); there is no token
 * or cookie, so embedding adds no privilege over holding the URL.
 *
 *   GET /api/diagrams/:diagramId/preview.svg  — cacheable `image/svg+xml` for
 *     `<img>`/Camo embedding in GitHub & GitLab READMEs.
 *   GET /embed/:diagramId  — iframe-friendly HTML shell (inline SVG + an "Open
 *     in Apollon" link, no JS), `frame-ancestors *` for Notion/Confluence/etc.
 *
 * Both serve a weak `ETag` (= `headRev`, the identity `saveHead` bumps) so a
 * conditional GET short-circuits before the renderer runs, and a deny-all CSP.
 * With no `script-src`, script in the library-generated SVG cannot execute, so
 * it is inlined verbatim without a sanitizer.
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

/** Honours the list and `*` forms of If-None-Match, not just a single token. */
function ifNoneMatch(header: string | undefined, etag: string): boolean {
  if (!header) return false
  if (header.trim() === "*") return true
  return header.split(",").some((tag) => tag.trim() === etag)
}

/**
 * Shared preamble: load the diagram, 404 if missing, and short-circuit a fresh
 * conditional GET with 304. Returns the diagram + etag when a render is needed,
 * or `null` when it already sent the 304. Cache headers are set here (304) and
 * on the 200 paths only — never before the render, so a 503/500 is not cached.
 */
async function loadOrNotModified(
  redis: Redis,
  req: Request,
  res: Response,
  diagramId: string
): Promise<{ diagram: Diagram; etag: string } | null> {
  const found = await readDiagramWithRev(redis, diagramId)
  if (!found) throw Errors.notFound("diagram not found")
  const etag = etagFor(found.headRev)
  if (ifNoneMatch(req.header("if-none-match"), etag)) {
    res.setHeader("cache-control", CACHE_CONTROL)
    res.setHeader("etag", etag)
    res.status(304).end()
    return null
  }
  return { diagram: found.diagram, etag }
}

/** Renders to an SVG string; queue saturation becomes a typed transient 503. */
async function renderSvg(
  getResource: () => ConversionResource,
  diagram: Diagram
): Promise<string> {
  try {
    // Storage keeps `version` as a plain string; widen to the renderer's
    // `UMLModel` — the same cast `/api/converter/*` applies to its input.
    const { data } = await getResource().render("svg", diagram as UMLModel)
    return typeof data === "string" ? data : data.toString("utf8")
  } catch (error) {
    if (error instanceof QueueFullError) throw Errors.rendererBusy()
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
        const loaded = await loadOrNotModified(
          redis,
          req,
          res,
          params.diagramId
        )
        if (!loaded) return
        const svg = await renderSvg(getResource, loaded.diagram)

        res.setHeader("content-type", "image/svg+xml; charset=utf-8")
        res.setHeader("etag", loaded.etag)
        res.setHeader("cache-control", CACHE_CONTROL)
        res.setHeader("x-content-type-options", "nosniff")
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
        const loaded = await loadOrNotModified(
          redis,
          req,
          res,
          params.diagramId
        )
        if (!loaded) return
        const svg = await renderSvg(getResource, loaded.diagram)

        const html = renderEmbedHtml({
          title: loaded.diagram.title || "Apollon diagram",
          svg,
          editorHref: buildEditorHref(req, loaded.diagram.id),
        })

        res.setHeader("content-type", "text/html; charset=utf-8")
        res.setHeader("etag", loaded.etag)
        res.setHeader("cache-control", CACHE_CONTROL)
        res.setHeader("x-content-type-options", "nosniff")
        res.setHeader("content-security-policy", HTML_CSP)
        res.setHeader("referrer-policy", "no-referrer")
        // Opt out of FLoC and its Topics-API successor.
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
 * Absolute editor URL from req protocol + host (honours `X-Forwarded-Proto` via
 * `trust proxy`). Targets `/shared/:id?view=EDIT` — the bare `/:id` route 404s
 * without a `?view`, and `EDIT` mirrors the webapp's default shared view.
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
