#!/usr/bin/env node
// Extract the changelog section for a specific version from a package's
// CHANGELOG.md. The release workflows use it to set the GitHub Release body
// from the Changesets-owned changelog instead of GitHub's --generate-notes,
// so the Release reads in the curated voice authors wrote per PR.
//
// Usage: node scripts/extract-changelog.mjs <package-dir> <version>
//   e.g. node scripts/extract-changelog.mjs library 4.5.0
//
// Prints the section body (without the "## x.y.z" heading) to stdout. Prints
// nothing and exits 0 when the file or the section is absent, so callers can
// fall back to generated notes (e.g. a manual bump that carried no changeset).

import { readFileSync } from "node:fs"
import { join } from "node:path"

const [, , pkgDir, version] = process.argv
if (!pkgDir || !version) {
  console.error("usage: extract-changelog.mjs <package-dir> <version>")
  process.exit(2)
}

let text
try {
  text = readFileSync(join(pkgDir, "CHANGELOG.md"), "utf8")
} catch {
  process.exit(0) // no changelog yet — caller falls back to generated notes
}

// Changesets writes one "## X.Y.Z" heading per release. Capture everything
// from the matching heading up to the next "## " heading.
const lines = text.split("\n")
const start = lines.findIndex((line) => line.trim() === `## ${version}`)
if (start === -1) process.exit(0)

const rest = lines.slice(start + 1)
const end = rest.findIndex((line) => /^## /.test(line))
const body = (end === -1 ? rest : rest.slice(0, end)).join("\n").trim()

process.stdout.write(body)
