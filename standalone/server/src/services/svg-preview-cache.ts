/**
 * In-process render cache + single-flight for the embed surface.
 *
 * The embed SVG for a `(diagramId, headRev)` is deterministic and immutable —
 * it only changes when a PUT bumps `headRev` (which mints a fresh key). The hot
 * consumer is a fan-out proxy (GitHub Camo / Fastly) that hammers the origin
 * with the SAME key on every cold edge, and `stale-while-revalidate` provably
 * does not prevent that stampede (the HTTP cache is empty exactly on a cold POP
 * / deploy / TTL expiry). Two cheap in-process layers absorb it:
 *
 *   - single-flight: N concurrent requests for the same key collapse to ONE
 *     render; the rest await the same promise. This is what saves a small box
 *     from a viral README — without it, a burst spins up N identical renders.
 *   - LRU: sequential repeats across time are served from memory, so steady
 *     state is ~one render per save (writes are rare, reads are many).
 *
 * No TTL: a key is immutable, so entries never go stale — eviction is pure LRU
 * by capacity. Failures are not cached (a transient 503/500 must not pin to a
 * key). A deleted diagram 404s upstream before reaching the cache. This needs
 * no Redis and no deployer tuning; the bound is a fixed, small entry count
 * (~tens of KB each), safe from a 512 MB VM to a big box.
 */
export class SvgPreviewCache {
  private readonly lru = new Map<string, string>()
  private readonly inflight = new Map<string, Promise<string>>()
  private readonly maxEntries: number

  constructor(
    maxEntries = Number(process.env.CONVERTER_PREVIEW_CACHE_MAX ?? 256)
  ) {
    this.maxEntries = Math.max(1, maxEntries)
  }

  /**
   * Returns the cached SVG for `key`, joins an in-flight render for it, or runs
   * `produce()` once and caches the result. `produce` rejections propagate to
   * all joiners and are not cached.
   */
  async render(key: string, produce: () => Promise<string>): Promise<string> {
    const cached = this.lru.get(key)
    if (cached !== undefined) {
      // Move to most-recently-used.
      this.lru.delete(key)
      this.lru.set(key, cached)
      return cached
    }

    const existing = this.inflight.get(key)
    if (existing) return existing

    const promise = produce()
      .then((svg) => {
        this.store(key, svg)
        return svg
      })
      .finally(() => this.inflight.delete(key))
    this.inflight.set(key, promise)
    return promise
  }

  private store(key: string, svg: string) {
    this.lru.set(key, svg)
    while (this.lru.size > this.maxEntries) {
      const oldest = this.lru.keys().next().value
      if (oldest === undefined) break
      this.lru.delete(oldest)
    }
  }
}
