/**
 * Embed-preview service: renders a diagram to SVG and caches the result
 * keyed by `(diagramId, updatedAt)`.
 *
 * Why cache at all: SVG rendering goes through a JSDOM-backed pipeline
 * that is the most expensive thing the server does (~100–500 ms per
 * render). For a popular embedded diagram pulled by GitHub Camo, every
 * cache miss = one heavy render. By keying on `updatedAt`, the cache
 * is automatically invalidated on every diagram edit (the existing
 * `saveHead` HSETs `updatedAt`), and stays warm for unchanged diagrams.
 *
 * TTL is short (60 s) because Camo holds its own copy for ~30 days
 * regardless — the in-server cache serves direct fetches and renderers
 * behind Camo (mirrors, GitLab self-hosted, scrape bots).
 *
 * The renderer is provided as an `SvgSource` interface so tests can
 * inject an in-process implementation without spawning the worker
 * thread (which loads a `.js` file that doesn't exist in TS-source
 * test runs).
 */

import type { Redis } from "../redis"
import { k } from "../redis"
import type { Diagram } from "../types"
import type { UMLModel } from "@tumaet/apollon"
import { sanitizeSvg } from "./embed-svg"
import { logger } from "../logger"

export interface SvgRender {
  svg: string
  clip: { x: number; y: number; width: number; height: number }
}

/** A pluggable SVG renderer. Production uses the worker-backed one. */
export interface SvgSource {
  render(model: UMLModel): Promise<SvgRender>
}

export interface EmbedPreviewService {
  /**
   * Returns the rendered, sanitized SVG for the diagram. Caches in
   * Redis under `diagram:{<id>}:preview-svg` keyed by content
   * (`updatedAt`). The returned payload includes the clip rect so
   * callers can set `<svg width=>` for embedded HTML scenarios.
   */
  render(diagram: Diagram): Promise<{
    svg: string
    clip: SvgRender["clip"]
    cached: boolean
  }>
}

const CACHE_TTL_SECONDS = 60

interface CachedPayload {
  v: 1
  updatedAt: string
  svg: string
  clip: SvgRender["clip"]
}

export function createEmbedPreviewService({
  redis,
  svgSource,
}: {
  redis: Redis
  svgSource: SvgSource
}): EmbedPreviewService {
  return {
    render: async (diagram) => {
      const cacheKey = k.diagramPreviewSvg(diagram.id)
      const cachedRaw = await redis.get(cacheKey)
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as CachedPayload
          if (cached.v === 1 && cached.updatedAt === diagram.updatedAt) {
            return { svg: cached.svg, clip: cached.clip, cached: true }
          }
          // Stale (content changed since cache was written) — fall
          // through to re-render.
        } catch {
          // Garbage in cache; ignore, re-render.
        }
      }

      const rendered = await svgSource.render(diagram as unknown as UMLModel)
      const { svg, stats } = sanitizeSvg(rendered.svg)
      if (Object.keys(stats.hits).length > 0) {
        // A non-empty hit map means the upstream library leaked something
        // we strip — log loudly so it surfaces in alerts.
        logger.warn(
          {
            event: "embed.svg.sanitize.hits",
            diagramId: diagram.id,
            hits: stats.hits,
          },
          "embed SVG sanitizer stripped suspicious content"
        )
      }
      const payload: CachedPayload = {
        v: 1,
        updatedAt: diagram.updatedAt,
        svg,
        clip: rendered.clip,
      }
      await redis.set(cacheKey, JSON.stringify(payload), {
        EX: CACHE_TTL_SECONDS,
      })
      return { svg, clip: rendered.clip, cached: false }
    },
  }
}
