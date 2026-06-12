import { describe, expect, it } from "vitest"
import {
  isRestorableEditorPath,
  readNavFrom,
} from "../../src/lib/navProvenance"

describe("isRestorableEditorPath", () => {
  it.each([
    "/local/abc",
    "/local/abc?view=edit",
    "/playground",
    "/playground?seed=1",
  ])("accepts the store-backed editor route %s", (path) => {
    expect(isRestorableEditorPath(path)).toBe(true)
  })

  it.each([
    // Open-redirect / injection vectors must never be honored as a back target.
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    // /shared re-fetches over the network, so it is not a lossless return.
    "/shared/abc",
    // Chrome and unrelated routes.
    "/imprint",
    "/privacy",
    "",
    // Near-misses that must not slip past the anchored allowlist.
    "/localx",
    "/local",
    "/local/",
    "/playgroundx",
  ])("rejects %s", (path) => {
    expect(isRestorableEditorPath(path)).toBe(false)
  })

  it("rejects nullish input", () => {
    expect(isRestorableEditorPath(undefined)).toBe(false)
    expect(isRestorableEditorPath(null)).toBe(false)
  })
})

describe("readNavFrom", () => {
  it("returns the stamped origin string", () => {
    expect(readNavFrom({ from: "/local/abc" })).toBe("/local/abc")
  })

  it("ignores absent, null, or non-string state", () => {
    expect(readNavFrom(null)).toBeUndefined()
    expect(readNavFrom(undefined)).toBeUndefined()
    expect(readNavFrom({})).toBeUndefined()
    expect(readNavFrom({ from: 42 })).toBeUndefined()
  })
})
