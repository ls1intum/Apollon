#!/usr/bin/env node
// Mechanical invariants for the release-tooling contract:
//   1. CLAUDE.md is a symlink to AGENTS.md (Windows materialises symlinks
//      as text files containing the target path, so explicit defence is
//      needed if anyone re-creates CLAUDE.md from a Windows checkout).
//   2. Every CHANGELOG bullet under a ### Major/Minor/Patch Changes
//      heading links to its source PR or commit, so a future
//      `changeset version` does not produce a mixed-shape file.
//   3. .changeset/config.json keeps the load-bearing fields the
//      release-notes guide promises (fixed standalone pair,
//      patch-internal follow-along, github changelog renderer).
//
// Used by `npm run check:release-docs` and exported as `runChecks(root)`
// so the test alongside this file can run it against fixtures.

import { readFileSync, lstatSync, readlinkSync } from "node:fs"
import { resolve } from "node:path"

export const bulletPrefix =
  /^(\[#\d+\]\(https:\/\/github\.com\/[^)]+\)|\[`[0-9a-f]{7,}`\]\(|Released in lockstep)/

export function runChecks(root) {
  const errors = []
  checkSymlink(root, errors)
  checkChangesetConfig(root, errors)
  checkChangelogs(root, errors)
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
      `.changeset/config.json: \`fixed\` must lock @tumaet/webapp and @tumaet/server in lockstep; got ${fixed}.`
    )
  }
  if (cfg.updateInternalDependencies !== "patch") {
    errors.push(
      `.changeset/config.json: \`updateInternalDependencies\` must be "patch" so a library minor patches the standalone; got ${JSON.stringify(cfg.updateInternalDependencies)}.`
    )
  }
  if (cfg.access !== "public") {
    errors.push(
      `.changeset/config.json: \`access\` must be "public" for the library publish; got ${JSON.stringify(cfg.access)}.`
    )
  }
  const renderer = Array.isArray(cfg.changelog)
    ? cfg.changelog[0]
    : cfg.changelog
  if (renderer !== "@changesets/changelog-github") {
    errors.push(
      `.changeset/config.json: \`changelog\` must use @changesets/changelog-github so bullets carry PR + author links; got ${JSON.stringify(renderer)}.`
    )
  }
}

function checkChangelogs(root, errors) {
  const files = [
    "library/CHANGELOG.md",
    "standalone/webapp/CHANGELOG.md",
    "standalone/server/CHANGELOG.md",
    "vscode-extension/CHANGELOG.md",
  ]
  for (const file of files) {
    const text = readFileSync(resolve(root, file), "utf8")
    let inVersionBullets = false
    text.split("\n").forEach((line, i) => {
      if (line.startsWith("### ")) {
        inVersionBullets = true
        return
      }
      if (line.startsWith("## ")) {
        inVersionBullets = false
        return
      }
      if (!inVersionBullets) return
      const m = line.match(/^- (.*)$/)
      if (!m) return
      if (!bulletPrefix.test(m[1])) {
        errors.push(
          `${file}:${i + 1} bullet does not start with [#NNN](pr-url), [\`sha\`](commit-url), or "Released in lockstep": ${line}`
        )
      }
    })
  }
}

// Only run when invoked directly, not when imported by the test.
if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = runChecks(resolve(import.meta.dirname, ".."))
  if (errors.length) {
    console.error("Release-docs check failed:")
    for (const e of errors) console.error("  - " + e)
    process.exit(1)
  }
  console.log("Release-docs check passed.")
}
