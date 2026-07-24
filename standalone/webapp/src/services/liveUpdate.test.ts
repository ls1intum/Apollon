import { describe, it, expect } from "vitest"
import {
  isLiveUpdateManifest,
  shouldApplyUpdate,
  type LiveUpdateManifest,
} from "./liveUpdate"

const manifest = (
  over: Partial<LiveUpdateManifest> = {}
): LiveUpdateManifest => ({
  version: "5.2.0",
  url: "https://example/apollon-5.2.0.zip",
  ...over,
})

describe("isLiveUpdateManifest", () => {
  it("accepts an object with string version + url", () => {
    expect(isLiveUpdateManifest({ version: "5.2.0", url: "u" })).toBe(true)
  })

  it("rejects missing fields, wrong types, and non-objects", () => {
    expect(isLiveUpdateManifest({ version: "5.2.0" })).toBe(false)
    expect(isLiveUpdateManifest({ url: "u" })).toBe(false)
    expect(isLiveUpdateManifest({ version: 5, url: "u" })).toBe(false)
    expect(isLiveUpdateManifest(null)).toBe(false)
    expect(isLiveUpdateManifest("x")).toBe(false)
  })
})

describe("shouldApplyUpdate", () => {
  it("applies any real version over the shipped-in 'builtin' bundle", () => {
    expect(shouldApplyUpdate(manifest(), "5.1.1", "builtin")).toBe(true)
  })

  it("only moves forward: rejects equal or older manifests", () => {
    expect(
      shouldApplyUpdate(manifest({ version: "5.2.0" }), "5.1.1", "5.2.0")
    ).toBe(false)
    expect(
      shouldApplyUpdate(manifest({ version: "5.1.9" }), "5.1.1", "5.2.0")
    ).toBe(false)
    expect(
      shouldApplyUpdate(manifest({ version: "5.2.1" }), "5.1.1", "5.2.0")
    ).toBe(true)
  })

  it("never applies past the native shell (minNativeVersion boundary)", () => {
    const m = manifest({ minNativeVersion: "5.2.0" })
    expect(shouldApplyUpdate(m, "5.1.9", "builtin")).toBe(false) // native below
    expect(shouldApplyUpdate(m, "5.2.0", "builtin")).toBe(true) // native equal
    expect(shouldApplyUpdate(m, "5.3.0", "builtin")).toBe(true) // native above
  })
})
