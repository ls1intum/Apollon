import { afterEach, describe, expect, it, vi } from "vitest"
import { isAndroid, isIOS } from "./platform"

// The same Macintosh UA is reported by a desktop Mac AND by iPadOS 13+; only the
// pointer type disambiguates them, which is exactly the branch under test.
const MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

const setUserAgent = (ua: string): void => {
  Object.defineProperty(globalThis.navigator, "userAgent", {
    value: ua,
    configurable: true,
  })
}

// `(any-pointer:coarse)` is the single query the helper consults; `coarse`
// decides whether it answers true.
const setCoarsePointer = (coarse: boolean): void => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("coarse") ? coarse : false,
  }))
}

describe("platform detection", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(globalThis.navigator, "userAgent")
  })

  it("detects an iPhone as iOS", () => {
    setUserAgent(IPHONE_UA)
    setCoarsePointer(false)
    expect(isIOS()).toBe(true)
    expect(isAndroid()).toBe(false)
  })

  it("detects iPadOS reporting a Macintosh UA via its coarse pointer", () => {
    setUserAgent(MAC_UA)
    setCoarsePointer(true)
    expect(isIOS()).toBe(true)
    expect(isAndroid()).toBe(false)
  })

  it("detects Android", () => {
    setUserAgent(ANDROID_UA)
    setCoarsePointer(true)
    expect(isAndroid()).toBe(true)
    expect(isIOS()).toBe(false)
  })

  it("treats a real desktop Mac (fine pointer) as neither iOS nor Android", () => {
    setUserAgent(MAC_UA)
    setCoarsePointer(false)
    expect(isIOS()).toBe(false)
    expect(isAndroid()).toBe(false)
  })

  it("treats jsdom's default environment as neither iOS nor Android", () => {
    // Locks the assumption the removed @ionic test mock used to guarantee: under
    // the default jsdom UA the export/download flows take the browser branch.
    expect(isIOS()).toBe(false)
    expect(isAndroid()).toBe(false)
  })
})
