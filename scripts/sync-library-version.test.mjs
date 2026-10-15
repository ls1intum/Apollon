import { test } from "node:test"
import assert from "node:assert/strict"
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

test("version sync updates CDN links without rewriting release history", () => {
  const root = mkdtempSync(join(tmpdir(), "apollon-version-sync-"))
  try {
    mkdirSync(join(root, "scripts"))
    mkdirSync(join(root, "library"))
    copyFileSync(
      new URL("./sync-library-version.mjs", import.meta.url),
      join(root, "scripts/sync-library-version.mjs")
    )
    writeFileSync(
      join(root, "library/package.json"),
      JSON.stringify({ version: "5.4.0" })
    )
    writeFileSync(
      join(root, "README.md"),
      "https://esm.sh/@tumaet/apollon@5.3.1/model\n"
    )
    const history = "Updated dependencies: @tumaet/apollon@5.3.1\n"
    writeFileSync(join(root, "library/CHANGELOG.md"), history)
    const run = (...args) =>
      spawnSync(
        process.execPath,
        [join(root, "scripts/sync-library-version.mjs"), ...args],
        { encoding: "utf8" }
      )
    assert.equal(run("--check").status, 1)
    assert.equal(run().status, 0)
    assert.equal(
      readFileSync(join(root, "README.md"), "utf8"),
      "https://esm.sh/@tumaet/apollon@5.4.0/model\n"
    )
    assert.equal(
      readFileSync(join(root, "library/CHANGELOG.md"), "utf8"),
      history
    )
    assert.equal(run("--check").status, 0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
