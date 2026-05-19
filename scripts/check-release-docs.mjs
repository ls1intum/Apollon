#!/usr/bin/env node
// Two invariants Changesets and the convention cannot self-enforce:
//   1. CLAUDE.md is a symlink to AGENTS.md. Windows checkouts materialise
//      symlinks as regular files containing the target path; that would
//      silently fork the agent contract into two files.
//   2. `.changeset/config.json` keeps three fields Changesets does not
//      default: `fixed` pairs `@tumaet/webapp` with `@tumaet/server`,
//      `updateInternalDependencies` is `"patch"`, and the GitHub changelog
//      renderer is selected. Dropping any of these silently breaks
//      the standalone webapp/server pairing or the per-PR + author links.
//
// Used by `npm run check:release-docs`; exported as `runChecks(root)` so the
// test alongside this file can run it against fixtures.

import { readFileSync, lstatSync, readlinkSync } from "node:fs"
import { resolve } from "node:path"

export function runChecks(root) {
  const errors = []
  checkSymlink(root, errors)
  checkChangesetConfig(root, errors)
  return errors
}

function checkSymlink(root, errors) {
  try {
    const stat = lstatSync(resolve(root, "CLAUDE.md"))
    if (!stat.isSymbolicLink()) {
      errors.push(
        "CLAUDE.md is a regular file; expected a symlink to AGENTS.md."
      )
      return
    }
    const target = readlinkSync(resolve(root, "CLAUDE.md"))
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
  const fixed = JSON.stringify(cfg.fixed ?? [])
  if (fixed !== '[["@tumaet/webapp","@tumaet/server"]]') {
    errors.push(
      `.changeset/config.json: \`fixed\` must pair @tumaet/webapp with @tumaet/server; got ${fixed}.`
    )
  }
  if (cfg.updateInternalDependencies !== "patch") {
    errors.push(
      `.changeset/config.json: \`updateInternalDependencies\` must be "patch"; got ${JSON.stringify(cfg.updateInternalDependencies)}.`
    )
  }
  const renderer = Array.isArray(cfg.changelog)
    ? cfg.changelog[0]
    : cfg.changelog
  if (renderer !== "@changesets/changelog-github") {
    errors.push(
      `.changeset/config.json: \`changelog\` must use @changesets/changelog-github; got ${JSON.stringify(renderer)}.`
    )
  }
  // `@tumaet/webapp` and `@tumaet/server` are `private: true`. The standalone
  // Docker release pipeline depends on Changesets versioning them, which only
  // happens when `privatePackages.version` is true. The Changesets default
  // historically varies across major versions; setting it explicitly defends
  // against a silent breakage on future Changesets upgrades.
  if (cfg.privatePackages?.version !== true) {
    errors.push(
      `.changeset/config.json: \`privatePackages.version\` must be true so @tumaet/webapp and @tumaet/server (private) still get versioned; got ${JSON.stringify(cfg.privatePackages?.version)}.`
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
