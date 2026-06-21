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
 * Renders the diagram to a RAW SVG string (transparent, no chrome) through the
 * cache + single-flight, mapping queue saturation to a typed transient 503. The
 * cache key is `(id, etag)`: immutable per revision and shared by both routes,
 * which then apply their own presentation — the preview image gets the framed
 * card (`frameDiagramSvg`), the embed page just an opaque background.
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

const FRAME_STYLE = `
  .fr-card { fill: #ffffff; stroke: #d0d7de; }
  .fr-inset { fill: #ffffff; }
  .fr-divider { stroke: #d8dee4; }
  .fr-title { fill: #59636e; font-weight: 500; }
  .fr-btn { fill: #0f3a66; }
  .fr-btn-tx { fill: #ffffff; font-weight: 600; }
  .fr-btn-ar { stroke: #ffffff; }
  .fr-sh { flood-color: #1f2328; flood-opacity: 0.16; }
  .fr-card, .fr-title, .fr-btn-tx { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
  @media (prefers-color-scheme: dark) {
    .fr-card { fill: #161b22; stroke: #30363d; }
    .fr-divider { stroke: #30363d; }
    .fr-title { fill: #9198a1; }
    .fr-btn { fill: #1f6feb; }
    .fr-sh { flood-color: #000000; flood-opacity: 0.5; }
  }`

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v))

/** Truncates to `max` characters with an ellipsis, collapsing whitespace. */
function truncateLabel(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim()
  if (t.length <= max) return t
  return t.slice(0, Math.max(1, max - 1)).trimEnd() + "…"
}

/**
 * Frames the raw diagram export as a self-contained "card": a rounded, bordered
 * panel with the diagram on a white inset and a footer carrying the title + an
 * "Open in Apollon" button. The Markdown snippet wraps the whole image in a link
 * to the editor, so the footer button is a visual affordance — clicking anywhere
 * opens Apollon.
 *
 * Light/dark adaptive via an internal `prefers-color-scheme` query (honoured by
 * browsers even when the SVG is an `<img>`): the card, border, and footer follow
 * the viewer's theme while the diagram inset stays white — the library's strokes
 * are tuned for a light canvas and can't be recoloured, so in dark mode the
 * white diagram sits matted inside the dark frame. Falls back to the plain
 * opaque background if the export's geometry can't be read.
 */
function frameDiagramSvg(svg: string, title: string): string {
  const openTag = svg.match(/<svg\b[^>]*>/i)
  const vb = openTag?.[0]
    .match(/viewBox\s*=\s*"([^"]+)"/i)?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)
  if (!openTag || !vb || vb.length !== 4 || !vb.every(Number.isFinite)) {
    return withOpaqueBackground(svg)
  }
  const [minX, minY, w, h] = vb as [number, number, number, number]

  const MAT = clamp(w * 0.014, 10, 22) // dark-mode frame thickness around inset
  const FOOTER = clamp(w * 0.055, 46, 78) // footer band height
  const R = clamp(w * 0.014, 12, 26) // card corner radius
  const PAD = clamp(w * 0.03, 22, 44) // outer margin (shadow room)
  const STROKE = Math.max(1.4, w * 0.0013)
  const FONT = clamp(FOOTER * 0.32, 13, 26)
  const BTN_H = FOOTER * 0.62
  const GUTTER = FONT * 0.85

  const footerY = minY + h
  const footerMid = footerY + FOOTER / 2

  // The button label is pinned to an exact `textLength` so the box always fits
  // regardless of the viewer's system font metrics, then the box is sized from
  // that known width — no font-measurement guesswork.
  const label = "Open in Apollon"
  const arrow = FONT * 0.8
  const btnPadX = FONT * 0.95
  const btnTextW = label.length * FONT * 0.54
  const gap = FONT * 0.6
  const btnW = btnPadX * 2 + btnTextW + gap + arrow
  const btnX = minX + w - MAT - GUTTER - btnW
  const btnY = footerMid - BTN_H / 2
  const arrowX = btnX + btnW - btnPadX - arrow
  const ah = arrow * 0.34

  const titleX = minX + MAT + GUTTER
  const titleAvail = btnX - titleX - FONT * 0.8
  const maxChars = Math.max(3, Math.floor(titleAvail / (FONT * 0.56)))
  const safeTitle = escapeHtml(
    truncateLabel(title || "Apollon diagram", maxChars)
  )

  const inner = svg.slice(
    (openTag.index ?? 0) + openTag[0].length,
    svg.lastIndexOf("</svg>")
  )

  const r2 = (n: number) => Math.round(n * 100) / 100
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r2(minX - PAD)} ${r2(minY - PAD)} ${r2(w + 2 * PAD)} ${r2(h + FOOTER + 2 * PAD)}" width="${r2(w + 2 * PAD)}" height="${r2(h + FOOTER + 2 * PAD)}" shape-rendering="geometricPrecision">
<style>${FRAME_STYLE}</style>
<defs><filter id="fr-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow class="fr-sh" dx="0" dy="${r2(STROKE * 1.4)}" stdDeviation="${r2(PAD * 0.22)}"/></filter></defs>
<rect class="fr-card" filter="url(#fr-shadow)" x="${r2(minX)}" y="${r2(minY)}" width="${r2(w)}" height="${r2(h + FOOTER)}" rx="${r2(R)}" stroke-width="${r2(STROKE)}"/>
<rect class="fr-inset" x="${r2(minX + MAT)}" y="${r2(minY + MAT)}" width="${r2(w - 2 * MAT)}" height="${r2(h - MAT)}" rx="${r2(R * 0.5)}"/>
${inner}
<line class="fr-divider" x1="${r2(minX + MAT)}" y1="${r2(footerY)}" x2="${r2(minX + w - MAT)}" y2="${r2(footerY)}" stroke-width="${r2(STROKE)}"/>
<text class="fr-title" x="${r2(titleX)}" y="${r2(footerMid)}" font-size="${r2(FONT)}" dominant-baseline="central">${safeTitle}</text>
<rect class="fr-btn" x="${r2(btnX)}" y="${r2(btnY)}" width="${r2(btnW)}" height="${r2(BTN_H)}" rx="${r2(BTN_H / 2)}"/>
<text class="fr-btn-tx" x="${r2(btnX + btnPadX)}" y="${r2(footerMid)}" font-size="${r2(FONT)}" textLength="${r2(btnTextW)}" lengthAdjust="spacingAndGlyphs" dominant-baseline="central">${label}</text>
<path class="fr-btn-ar" d="M ${r2(arrowX)} ${r2(footerMid)} L ${r2(arrowX + arrow)} ${r2(footerMid)} M ${r2(arrowX + arrow - ah)} ${r2(footerMid - ah)} L ${r2(arrowX + arrow)} ${r2(footerMid)} L ${r2(arrowX + arrow - ah)} ${r2(footerMid + ah)}" fill="none" stroke-width="${r2(STROKE * 1.3)}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
}

export function mountEmbedApiRoutes(deps: Deps): Router {
  const { redis, config } = deps
  const router = Router()

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

        const raw = await renderSvg(deps, found.diagram, found.etag)
        const svg = frameDiagramSvg(
          raw,
          found.diagram.title || "Apollon diagram"
        )
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

        const raw = await renderSvg(deps, found.diagram, found.etag)
        const html = renderEmbedHtml({
          title: found.diagram.title || "Apollon diagram",
          svg: withOpaqueBackground(raw),
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
