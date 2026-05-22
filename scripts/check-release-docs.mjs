#!/usr/bin/env node
// Guards fields in .changeset/config.json that Changesets cannot infer from
// schema alone, plus the CLAUDE.md → AGENTS.md symlink (Windows checkouts
// can clobber symlinks to regular files; git tracks mode 120000 so the
// breakage is visible on Linux CI).

import { readFileSync, lstatSync, readlinkSync } from "node:fs"
import { resolve } from "node:path"
import { isDeepStrictEqual } from "node:util"

export function runChecks(root) {
  const errors = []
  checkSymlink(root, errors)
  checkChangesetConfig(root, errors)
  return errors
}

function checkSymlink(root, errors) {
  const path = resolve(root, "CLAUDE.md")
  try {
    if (!lstatSync(path).isSymbolicLink()) {
      errors.push(
        "CLAUDE.md is a regular file; expected a symlink to AGENTS.md."
      )
      return
    }
    const target = readlinkSync(path)
    if (target !== "AGENTS.md") {
      errors.push(
        `CLAUDE.md symlink points at '${target}', expected AGENTS.md.`
      )
    }
  } catch (e) {
    errors.push(`CLAUDE.md: ${e.message}`)
  }
}

function checkChangesetConfig(root, errors) {
  let cfg
  try {
    cfg = JSON.parse(
      readFileSync(resolve(root, ".changeset/config.json"), "utf8")
    )
  } catch (e) {
    errors.push(`.changeset/config.json: ${e.message}`)
    return
  }
  const expectedFixed = [["@tumaet/webapp", "@tumaet/server"]]
  if (!isDeepStrictEqual(cfg.fixed, expectedFixed)) {
    errors.push(
      `.changeset/config.json: \`fixed\` must be ${JSON.stringify(expectedFixed)}; got ${JSON.stringify(cfg.fixed)}.`
    )
  }
  if (cfg.updateInternalDependencies !== "patch") {
    errors.push(
      `.changeset/config.json: \`updateInternalDependencies\` must be "patch"; got ${JSON.stringify(cfg.updateInternalDependencies)}.`
    )
  }
  if (cfg.changelog?.[0] !== "@changesets/changelog-github") {
    errors.push(
      `.changeset/config.json: \`changelog\` must use @changesets/changelog-github; got ${JSON.stringify(cfg.changelog)}.`
    )
  }
  if (cfg.privatePackages?.version !== true) {
    errors.push(
      `.changeset/config.json: \`privatePackages.version\` must be true so @tumaet/webapp and @tumaet/server get versioned; got ${JSON.stringify(cfg.privatePackages?.version)}.`
    )
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = runChecks(resolve(import.meta.dirname, ".."))
  if (errors.length) {
    console.error("Release-docs check failed:")
    for (const e of errors) console.error("  - " + e)
    process.exit(1)
  }
  console.log("Release-docs check passed.")
}
