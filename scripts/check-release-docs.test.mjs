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

  it("flags every config regression on the bad fixture", () => {
    const errors = runChecks(badFixture).join("\n")
    assert.match(errors, /CLAUDE\.md/)
    assert.match(errors, /`fixed` must pair/)
    assert.match(errors, /`updateInternalDependencies` must be "patch"/)
    assert.match(errors, /`changelog` must use @changesets\/changelog-github/)
  })
})
