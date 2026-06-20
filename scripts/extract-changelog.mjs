#!/usr/bin/env node
// @ts-check
// Render one version's CHANGELOG.md section as the GitHub Release body, regrouped
// by user-facing category (Features, Bug Fixes, ...) instead of the Changesets
// semver-bump headings (### Major/Minor/Patch Changes). The category comes from
// each entry's squash-merge commit type, recovered by asking git for the subject
// of the SHA embedded in the changeset line. When git can't resolve it (no SHA,
// git absent, or a shallow CI checkout missing the object) we fall back to the
// semver bump the author chose (major -> Breaking, minor -> Features, patch ->
// Bug Fixes); perf and docs have no dedicated fallback group, so they collapse
// into Features or Bug Fixes by the chosen bump. Releases run with full history
// (fetch-depth:0) so the accurate commit-type path is the norm.
//
// The full mapping and rationale live in one place:
// docs/contributor/development/release-notes.md (How your change gets grouped).
// TYPE_TO_CATEGORY, the commitlint type-enum, and the .github/release.yml
// fallback titles must agree; scripts/check-release-taxonomy.mjs enforces it.

import { readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

// Fixed render order (user-impact descending).
export const CATEGORIES = [
  { key: "breaking", title: "Breaking Changes" },
  { key: "feat", title: "Features" },
  { key: "fix", title: "Bug Fixes" },
  { key: "perf", title: "Performance" },
  { key: "docs", title: "Documentation" },
  { key: "deps", title: "Dependencies" },
  { key: "other", title: "Other Changes" },
]

/** @type {Record<string, string>} */
export const TYPE_TO_CATEGORY = {
  feat: "feat",
  fix: "fix",
  perf: "perf",
  docs: "docs",
  refactor: "other",
  build: "other",
  chore: "other",
  ci: "other",
  test: "other",
  style: "other",
  revert: "other",
}

// Changesets bump heading -> fallback category, used when the commit type
// can't be resolved. Mirrors the Conventional Commits semver mapping.
/** @type {Record<string, string>} */
const BUMP_TO_CATEGORY = {
  major: "breaking",
  minor: "feat",
  patch: "fix",
}

/**
 * @typedef {Object} Entry
 * @property {string | null} bump
 * @property {string[]} lines
 * @property {string} [text]
 * @property {string | null} [pr]
 * @property {string} [category]
 */

/**
 * @typedef {{ char: string, len: number } | null} Fence
 */

// CommonMark-aware fenced-code tracking. A fence opens on a run of >= 3 of the
// same marker (` or ~) and closes only on a later run of the SAME char that is
// at least as long. Returns the new fence state given the current one and a line.
/** @param {Fence} fence @param {string} line @returns {Fence} */
function fenceToggle(fence, line) {
  const m = line.match(/^(\s*)(`{3,}|~{3,})/)
  if (!m) return fence
  const run = m[2]
  const char = run[0]
  if (!fence) return { char, len: run.length }
  if (char === fence.char && run.length >= fence.len) return null
  return fence
}

/** @param {string} pkgDir @returns {string | null} */
function readChangelog(pkgDir) {
  try {
    return readFileSync(join(pkgDir, "CHANGELOG.md"), "utf8")
  } catch {
    return null
  }
}

// Capture the lines between "## <version>" and the next "## " heading,
// ignoring "## " that appears inside fenced code blocks.
/** @param {string} text @param {string} version @returns {string[] | null} */
function sectionLines(text, version) {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const start = lines.findIndex((l) => l.trim() === `## ${version}`)
  if (start === -1) return null
  /** @type {Fence} */
  let fence = null
  const out = []
  for (const line of lines.slice(start + 1)) {
    fence = fenceToggle(fence, line)
    if (!fence && /^## /.test(line)) break
    out.push(line)
  }
  return out
}

// Split a section's lines into entries. An entry begins at a top-level "- "
// bullet (column 0) and runs until the next top-level bullet. "### Minor
// Changes" style headings set the current bump for the entries that follow.
// Fence-aware so a "- " inside a code block never starts a new entry.
/** @param {string[]} lines @returns {Entry[]} */
function parseEntries(lines) {
  /** @type {Entry[]} */
  const entries = []
  /** @type {string | null} */
  let bump = null
  /** @type {Entry | null} */
  let cur = null
  /** @type {Fence} */
  let fence = null

  const flush = () => {
    if (cur) {
      cur.text = cur.lines.join("\n").replace(/\s+$/, "")
      if (cur.text) entries.push(cur)
    }
    cur = null
  }

  for (const line of lines) {
    fence = fenceToggle(fence, line)

    if (!fence) {
      const heading = line.match(/^### (Major|Minor|Patch) Changes\s*$/)
      if (heading) {
        flush()
        bump = heading[1].toLowerCase()
        continue
      }
      if (/^- /.test(line)) {
        flush()
        cur = { bump, lines: [line] }
        continue
      }
    }
    if (cur) cur.lines.push(line)
  }
  flush()
  return entries
}

// Pull the metadata we need out of an entry's first line.
const SHA_RE = /\/commit\/([0-9a-f]{7,40})/i
const PR_RE = /\/pull\/(\d+)/

/** @param {Entry} entry @returns {Entry} */
function classifyEntry(entry) {
  const first = entry.lines[0]

  // Changesets' internal cascade entry, e.g.
  // "- Updated dependencies [[`sha`](...), ...]:"
  if (/^- Updated dependencies\b/.test(first)) {
    entry.category = "deps"
    return entry
  }

  const prMatch = first.match(PR_RE)
  entry.pr = prMatch ? prMatch[1] : null

  const shaMatch = first.match(SHA_RE)
  const sha = shaMatch ? shaMatch[1] : null

  entry.category = resolveCategory(sha, entry.bump)
  return entry
}

/** @param {string | null} sha @param {string | null} bump @returns {string} */
function resolveCategory(sha, bump) {
  const subject = sha ? commitSubject(sha) : null
  const fromSubject = subject ? categoryForSubject(subject) : null
  if (fromSubject) return fromSubject
  // Fallback: the bump-type heading the entry was filed under.
  return (bump && BUMP_TO_CATEGORY[bump]) || "other"
}

// Map a Conventional Commit subject to a category, or null if it doesn't parse.
// Pure (no git) so it can be unit-tested by scripts/check-release-taxonomy.mjs.
/** @param {string} subject @returns {string | null} */
export function categoryForSubject(subject) {
  const conv = parseConventional(subject)
  if (!conv) return null
  if (conv.breaking) return "breaking"
  // build(deps)/chore(deps) are dependency bumps.
  if ((conv.type === "build" || conv.type === "chore") && conv.scope === "deps")
    return "deps"
  return TYPE_TO_CATEGORY[conv.type] ?? "other"
}

// "feat(library)!: summary" -> { type, scope, breaking }
/**
 * @param {string} subject
 * @returns {{ type: string, scope: string | null, breaking: boolean } | null}
 */
function parseConventional(subject) {
  const m = subject.match(/^([a-z]+)(?:\(([^)]+)\))?(!)?:\s/)
  if (!m) return null
  return {
    type: m[1],
    scope: m[2] ?? null,
    breaking: Boolean(m[3]),
  }
}

// Memoized, failure-tolerant git lookup. Returns null on any failure
// (shallow clone in CI, unknown object, git absent), which routes the entry
// to the bump-type fallback instead of throwing.
/** @type {Map<string, string | null>} */
const subjectCache = new Map()
/** @param {string} sha @returns {string | null} */
function commitSubject(sha) {
  const cached = subjectCache.get(sha)
  if (cached !== undefined) return cached
  /** @type {string | null} */
  let subject = null
  try {
    subject = execFileSync("git", ["log", "-1", "--format=%s", sha], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    subject = null
  }
  subjectCache.set(sha, subject || null)
  return subject || null
}

// Render the regrouped release body for one version across one or more packages.
/** @param {string} version @param {string[]} pkgDirs @returns {string} */
function render(version, pkgDirs) {
  /** @type {Entry[]} */
  const all = []
  const seen = new Set() // entry identity for cross-package dedupe

  for (const dir of pkgDirs) {
    const text = readChangelog(dir)
    if (!text) continue
    const lines = sectionLines(text, version)
    if (!lines) continue
    for (const entry of parseEntries(lines)) {
      classifyEntry(entry)
      // Identity: PR number (when present) + normalized body. This keeps the
      // genuinely-different webapp/library bodies for the same PR, while
      // collapsing byte-identical entries that appear in both packages.
      const id = `${entry.pr ?? ""}::${(entry.text ?? "").replace(/\s+/g, " ").trim()}`
      if (seen.has(id)) continue
      seen.add(id)
      all.push(entry)
    }
  }

  // Group, preserving first-seen order within each category.
  /** @type {Map<string, Entry[]>} */
  const byCategory = new Map(CATEGORIES.map((c) => [c.key, []]))
  for (const entry of all)
    byCategory.get(entry.category ?? "other")?.push(entry)

  const blocks = []
  for (const cat of CATEGORIES) {
    const items = byCategory.get(cat.key)
    if (!items || !items.length) continue
    blocks.push(`### ${cat.title}\n\n${items.map((e) => e.text).join("\n\n")}`)
  }
  return blocks.join("\n\n")
}

// Run only when invoked directly, not when imported (e.g. by the taxonomy check).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , version, ...pkgDirs] = process.argv
  if (!version || pkgDirs.length === 0) {
    console.error("usage: extract-changelog.mjs <version> <package-dir>...")
    process.exit(2)
  }
  process.stdout.write(render(version, pkgDirs))
}
