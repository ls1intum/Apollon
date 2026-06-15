#!/usr/bin/env node
// Extract one version's section from one or more CHANGELOG.md files, for the
// release workflows to use as the GitHub Release body instead of GitHub's
// auto-generated notes. With several packages (the fixed webapp+server pair) it
// merges the non-empty sections and drops exact duplicates — so a server-only
// changeset still surfaces, and a library-cascade patch (identical in both)
// shows once. Prints nothing and exits 0 when no package has a section, so
// callers fall back to --generate-notes (e.g. a release with no changeset).

import { readFileSync } from "node:fs"
import { join } from "node:path"

const [, , version, ...pkgDirs] = process.argv
if (!version || pkgDirs.length === 0) {
  console.error("usage: extract-changelog.mjs <version> <package-dir>...")
  process.exit(2)
}

function sectionFor(pkgDir) {
  let text
  try {
    text = readFileSync(join(pkgDir, "CHANGELOG.md"), "utf8")
  } catch {
    return "" // no changelog yet
  }
  // Changesets writes one "## X.Y.Z" heading per release. Capture from the
  // matching heading to the next one — ignoring "## " lines inside fenced code
  // blocks (backtick or tilde) so a changeset documenting markdown can't
  // truncate the section.
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const start = lines.findIndex((line) => line.trim() === `## ${version}`)
  if (start === -1) return ""
  let inFence = false
  const body = []
  for (const line of lines.slice(start + 1)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (!inFence && /^## /.test(line)) break
    body.push(line)
  }
  return body.join("\n").trim()
}

const sections = []
for (const dir of pkgDirs) {
  const section = sectionFor(dir)
  if (section && !sections.includes(section)) sections.push(section)
}

process.stdout.write(sections.join("\n\n"))
