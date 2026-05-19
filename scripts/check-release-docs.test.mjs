import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { resolve } from "node:path"
import { runChecks } from "./check-release-docs.mjs"

const repoRoot = resolve(import.meta.dirname, "..")
const badFixture = resolve(import.meta.dirname, "fixtures/bad")

describe("check-release-docs", () => {
  it("passes on the actual repo", () => {
    assert.deepEqual(runChecks(repoRoot), [])
  })

  it("flags every regression on the bad fixture", () => {
    const errors = runChecks(badFixture)
    const joined = errors.join("\n")
    // No CLAUDE.md present at all -> first check trips with an ENOENT.
    assert.match(joined, /CLAUDE\.md:/)
    // Wrong `fixed`, `updateInternalDependencies`, `access`, and renderer.
    assert.match(joined, /`fixed` must lock/)
    assert.match(joined, /`updateInternalDependencies` must be "patch"/)
    assert.match(joined, /`access` must be "public"/)
    assert.match(joined, /`changelog` must use @changesets\/changelog-github/)
    // Hand-written bullet without a PR link.
    assert.match(joined, /library\/CHANGELOG\.md:7 bullet does not start with/)
  })
})
