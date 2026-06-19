import { describe, it, expect } from "vitest"
import { SvgPreviewCache } from "./svg-preview-cache.js"

describe("SvgPreviewCache", () => {
  it("renders once and serves the repeat from cache", async () => {
    const cache = new SvgPreviewCache()
    let calls = 0
    const produce = async () => {
      calls++
      return "<svg/>"
    }
    expect(await cache.render("a:1", produce)).toBe("<svg/>")
    expect(await cache.render("a:1", produce)).toBe("<svg/>")
    expect(calls).toBe(1)
  })

  it("coalesces concurrent renders for the same key into one", async () => {
    const cache = new SvgPreviewCache()
    let calls = 0
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const produce = async () => {
      calls++
      await gate
      return "<svg/>"
    }
    const inflight = Array.from({ length: 8 }, () =>
      cache.render("a:1", produce)
    )
    // All 8 joined a single in-flight render before it resolved.
    expect(calls).toBe(1)
    release()
    expect(await Promise.all(inflight)).toEqual(Array(8).fill("<svg/>"))
    expect(calls).toBe(1)
  })

  it("renders different keys independently", async () => {
    const cache = new SvgPreviewCache()
    let calls = 0
    const produce = async () => `${++calls}`
    await cache.render("a:1", produce)
    await cache.render("a:2", produce)
    expect(calls).toBe(2)
  })

  it("does not cache a failed render (transient errors must not pin)", async () => {
    const cache = new SvgPreviewCache()
    let calls = 0
    const failOnce = async () => {
      calls++
      if (calls === 1) throw new Error("boom")
      return "<svg/>"
    }
    await expect(cache.render("a:1", failOnce)).rejects.toThrow("boom")
    // The failure was not cached, so the retry renders again and succeeds.
    expect(await cache.render("a:1", failOnce)).toBe("<svg/>")
    expect(calls).toBe(2)
  })

  it("evicts least-recently-used entries past the cap", async () => {
    const cache = new SvgPreviewCache(2)
    const produce = (v: string) => async () => v
    await cache.render("a", produce("A"))
    await cache.render("b", produce("B"))
    await cache.render("a", produce("A2")) // touch a → a is now MRU, b is LRU
    await cache.render("c", produce("C")) // inserts c, evicts b (LRU)

    let calls = 0
    const counted = async () => {
      calls++
      return "fresh"
    }
    await cache.render("a", counted) // still cached → no render
    await cache.render("c", counted) // still cached → no render
    expect(calls).toBe(0)
    await cache.render("b", counted) // evicted → must render
    expect(calls).toBe(1)
  })
})
