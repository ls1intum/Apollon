/**
 * Embed-preview service.
 *
 * # What it is
 *
 * A thin coalescing layer in front of the JSDOM-backed SVG renderer.
 * Every render is keyed by `(diagramId, updatedAt)`; concurrent
 * requests for the same key share a single in-flight Promise, and the
 * result is held in a small in-process LRU for the duration of the
 * HTTP `max-age` window so direct (non-Camo) refetches inside that
 * window skip the worker entirely.
 *
 * # Why not Redis
 *
 * The route serves `Cache-Control: public, max-age=60,
 * stale-while-revalidate=86400` plus a strong-correlated `ETag`, so
 * downstream caches (GitHub Camo, Cloudflare, browser, mirrors) handle
 * 99% of the deduplication. A Redis cache with the SAME 60-second TTL
 * would only ever fire in the narrow window where downstream caches
 * just expired AND the diagram has not been edited — and the
 * conditional-GET path returns 304 in that exact case without ever
 * reaching the renderer. The Redis round-trip on every hit was pure
 * tax. This file used to do that; the in-process map is strictly
 * better:
 *
 *   - It dedupes thundering-herd renders (Redis cannot — both racers
 *     observe a miss and both render).
 *   - It avoids a Redis round-trip on every embed request.
 *   - It self-evicts via LRU bound and TTL; no orphan keys, no key
 *     namespace to manage.
 *
 * # Bound
 *
 * Cache size is bounded at `LRU_MAX` entries; oldest evicted on add.
 * In-flight Promises are stored in a parallel map (`inflight`) keyed
 * by the same `(id, updatedAt)` so two concurrent requests for the
 * same content share one render. Once the render resolves, the entry
 * is moved into the LRU and the inflight slot is cleared.
 */

import type { Diagram } from "../types"
import type { UMLModel } from "@tumaet/apollon"
import { LibrarySchemaVersion } from "../routes/_schemas"

export interface SvgRender {
  svg: string
  clip: { x: number; y: number; width: number; height: number }
}

/** A pluggable SVG renderer. Production uses the worker-backed one. */
export interface SvgSource {
  render(model: UMLModel): Promise<SvgRender>
}

export interface EmbedPreviewService {
  render(diagram: Diagram): Promise<{
    svg: string
    clip: SvgRender["clip"]
    cached: boolean
  }>
}

interface CacheEntry {
  payload: { svg: string; clip: SvgRender["clip"] }
  expiresAtMs: number
}

const DEFAULT_TTL_MS = 60_000
const LRU_MAX = 64

function toUmlModel(d: Diagram): UMLModel {
  // Project the renderer-relevant fields. Server-only metadata
  // (`createdAt`, `updatedAt`) is dropped because UMLModel doesn't
  // declare it.
  //
  // We re-validate `version` here even though the API boundary
  // already does: the diagram could have been written to Redis
  // before the schema was tightened, or by a future internal caller
  // that bypasses route validation. Throwing on a malformed version
  // surfaces the inconsistency loudly instead of silently shipping
  // a renderer-incompatible payload. Zod doesn't narrow strings to
  // template-literal types — the explicit cast asserts the same
  // invariant the schema just enforced.
  LibrarySchemaVersion.parse(d.version)
  const model: UMLModel = {
    version: d.version as UMLModel["version"],
    id: d.id,
    title: d.title,
    type: d.type,
    nodes: d.nodes,
    edges: d.edges,
    assessments: d.assessments,
  }
  if (d.interactive !== undefined) model.interactive = d.interactive
  return model
}

export interface CreateEmbedPreviewOpts {
  svgSource: SvgSource
  /** Override TTL for the in-process cache. Defaults to 60 s, matching the route's HTTP `max-age`. */
  ttlMs?: number
  /** Override LRU bound. Defaults to 64 entries — well above active-diagram-per-host load. */
  lruMax?: number
  /**
   * Optional clock override for tests. The service reads `now()` once
   * per cache check; injecting a controllable clock makes TTL behavior
   * deterministic without `vi.useFakeTimers()`.
   */
  now?: () => number
}

export function createEmbedPreviewService(
  opts: CreateEmbedPreviewOpts
): EmbedPreviewService {
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS
  const lruMax = opts.lruMax ?? LRU_MAX
  const now = opts.now ?? (() => Date.now())

  // Insertion-order Map gives us LRU-on-touch by re-inserting on hit.
  const cache = new Map<string, CacheEntry>()
  const inflight = new Map<string, Promise<SvgRender>>()

  function key(d: Diagram): string {
    return `${d.id}:${d.updatedAt}`
  }

  function touch(k: string, entry: CacheEntry): void {
    cache.delete(k)
    cache.set(k, entry)
    while (cache.size > lruMax) {
      const oldest = cache.keys().next().value
      if (oldest === undefined) break
      cache.delete(oldest)
    }
  }

  return {
    render: async (diagram) => {
      const k = key(diagram)
      const cached = cache.get(k)
      if (cached && cached.expiresAtMs > now()) {
        // Re-insert to mark as recently used.
        touch(k, cached)
        return { ...cached.payload, cached: true }
      }
      // Coalesce: if another request is already rendering this exact
      // (id, updatedAt), wait on its Promise instead of starting a
      // second worker job. The wrapper async function clears the
      // inflight slot via try/finally — both fulfilled and rejected
      // renders free the slot, and there's no orphan `.finally()`
      // chain to produce unhandled rejections.
      let promise = inflight.get(k)
      if (!promise) {
        promise = (async () => {
          try {
            return await opts.svgSource.render(toUmlModel(diagram))
          } finally {
            inflight.delete(k)
          }
        })()
        inflight.set(k, promise)
      }
      const rendered = await promise
      // SVG sanitization happens inside `ConversionService.convertToSvg`
      // (worker + in-process paths both share that single seam) so the
      // payload reaching us is already DOMPurify-cleaned.
      const entry: CacheEntry = {
        payload: { svg: rendered.svg, clip: rendered.clip },
        expiresAtMs: now() + ttlMs,
      }
      touch(k, entry)
      return { ...entry.payload, cached: false }
    },
  }
}
