#!/usr/bin/env node
// Extract one version's section from a package's CHANGELOG.md, for the release
// workflows to use as the GitHub Release body instead of GitHub's
// auto-generated notes. Prints the section to stdout; prints nothing and exits
// 0 when the file or section is absent, so callers fall back to --generate-notes
// (e.g. a release that carried no changeset).

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

// Changesets writes one "## X.Y.Z" heading per release. Capture from the
// matching heading to the next one — ignoring "## " lines inside fenced code
// blocks so a changeset that documents markdown can't truncate the section.
const lines = text.replace(/\r\n/g, "\n").split("\n")
const start = lines.findIndex((line) => line.trim() === `## ${version}`)
if (start === -1) process.exit(0)

let inFence = false
const body = []
for (const line of lines.slice(start + 1)) {
  if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
  if (!inFence && /^## /.test(line)) break
  body.push(line)
}

process.stdout.write(body.join("\n").trim())
