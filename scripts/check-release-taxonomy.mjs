#!/usr/bin/env node
// @ts-check
// Guardrail for the release-note taxonomy that three files share. The prose
// comments in extract-changelog.mjs and commitlint.config.mjs ask humans to
// "keep these in sync"; this turns that trust into a CI check (wired into PR
// Health Checks, like sync-library-version.mjs --check). Each assertion is
// documented inline at its section below. Pure Node, no install needed; exits 1
// with the drift on any mismatch.
//
// NOT covered (so reviewers don't over-trust this guardrail): the bump-type
// fallback path (resolveCategory's git-resolution branch) is exercised by
// behavior, not asserted here.

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  CATEGORIES,
  TYPE_TO_CATEGORY,
  categoryForSubject,
} from "./extract-changelog.mjs"
import commitlintConfig from "../commitlint.config.mjs"

/** @type {string[]} */
const errors = []

const typeEnum = /** @type {string[]} */ (
  commitlintConfig.rules["type-enum"][2]
)
const scopeEnum = /** @type {string[]} */ (
  commitlintConfig.rules["scope-enum"][2]
)
const categoryKeys = new Set(CATEGORIES.map((c) => c.key))
const categoryTitles = new Set(CATEGORIES.map((c) => c.title))

// 1. Every committable type has a category.
for (const type of typeEnum) {
  if (!(type in TYPE_TO_CATEGORY)) {
    errors.push(
      `commitlint type "${type}" has no TYPE_TO_CATEGORY mapping in extract-changelog.mjs`
    )
  }
}
// And no stale mapping points at a type the enum dropped.
for (const type of Object.keys(TYPE_TO_CATEGORY)) {
  if (!typeEnum.includes(type)) {
    errors.push(
      `TYPE_TO_CATEGORY maps "${type}", which is not in commitlint's type-enum`
    )
  }
}

// 2. Every mapping target is a real category.
for (const [type, cat] of Object.entries(TYPE_TO_CATEGORY)) {
  if (!categoryKeys.has(cat)) {
    errors.push(
      `TYPE_TO_CATEGORY maps "${type}" -> "${cat}", which is not a CATEGORIES key`
    )
  }
}

// 3. release.yml fallback titles match the CATEGORIES titles (same set + order).
const releaseYml = readFileSync(
  fileURLToPath(new URL("../.github/release.yml", import.meta.url)),
  "utf8"
)
const ymlTitles = [...releaseYml.matchAll(/^\s*-\s*title:\s*(.+?)\s*$/gm)].map(
  (m) => m[1]
)
const expectedTitles = CATEGORIES.map((c) => c.title)
if (ymlTitles.join(" | ") !== expectedTitles.join(" | ")) {
  errors.push(
    `.github/release.yml titles\n  [${ymlTitles.join(", ")}]\ndo not match CATEGORIES titles\n  [${expectedTitles.join(", ")}]`
  )
}

// 4. The release-notes.md mapping table (the declared single source of truth)
//    covers every type-enum type, and only names real category titles. We don't
//    assert per-cell type->group, because the deps/breaking/other rows carry
//    qualifier prose (scope, `!`, "non-deps"); coverage + valid titles is the
//    invariant that catches a dropped type (e.g. the historic `revert` gap) or a
//    renamed group.
const releaseNotes = readFileSync(
  fileURLToPath(
    new URL("../docs/contributor/development/release-notes.md", import.meta.url)
  ),
  "utf8"
)
const tableMatch = releaseNotes.match(/^\| PR title type.*?\n((?:\|.*\n)+)/m)
if (!tableMatch) {
  errors.push(
    "release-notes.md: could not find the 'PR title type' mapping table to validate"
  )
} else {
  const rows = tableMatch[1]
    .split("\n")
    .filter((l) => l.startsWith("|") && !/^\|\s*-+/.test(l))
  const tableTypeTokens = new Set()
  for (const row of rows) {
    const cells = row.split("|").map((c) => c.trim())
    const [firstCell, groupCell] = [cells[1] ?? "", cells[2] ?? ""]
    for (const m of firstCell.matchAll(/`([a-z]+)`/g)) tableTypeTokens.add(m[1])
    if (groupCell && !categoryTitles.has(groupCell)) {
      errors.push(
        `release-notes.md mapping table names group "${groupCell}", which is not a CATEGORIES title`
      )
    }
  }
  for (const type of typeEnum) {
    if (!tableTypeTokens.has(type)) {
      errors.push(
        `release-notes.md mapping table omits commitlint type "${type}"`
      )
    }
  }
}

// 5. overview.md's "Valid types"/"Valid scopes" lists equal the commitlint enums.
const overview = readFileSync(
  fileURLToPath(new URL("../docs/contributor/overview.md", import.meta.url)),
  "utf8"
)
/** @param {string} label @param {string[]} expected */
const checkInlineList = (label, expected) => {
  const m = overview.match(new RegExp(`${label}:\\s*((?:\`[a-z-]+\`,?\\s*)+)`))
  if (!m) {
    errors.push(`overview.md: could not find the "${label}" list to validate`)
    return
  }
  const found = [...m[1].matchAll(/`([a-z-]+)`/g)].map((x) => x[1])
  if (found.join(",") !== expected.join(",")) {
    errors.push(
      `overview.md "${label}"\n  [${found.join(", ")}]\ndo not match commitlint\n  [${expected.join(", ")}]`
    )
  }
}
checkInlineList("Valid types", typeEnum)
checkInlineList("Valid scopes", scopeEnum)

// 6. The two subject-classification couplings that live only in
//    categoryForSubject() — build/chore(deps) -> "deps", non-deps build/chore ->
//    "other", and a `!`-suffixed subject -> "breaking" — are asserted, not trusted.
/** @type {[string, string][]} */
const subjectCases = [
  ["build(deps): bump foo from 1 to 2", "deps"],
  ["chore(deps): bump bar from 3 to 4", "deps"],
  ["build(library): retune the bundler", "other"],
  ["chore(release): version packages", "other"],
  ["feat(library)!: drop the legacy export", "breaking"],
]
for (const [subject, expected] of subjectCases) {
  const got = categoryForSubject(subject)
  if (got !== expected) {
    errors.push(
      `categoryForSubject("${subject}") = "${got}", expected "${expected}"`
    )
  }
}

if (errors.length) {
  console.error("Release-note taxonomy drift:\n- " + errors.join("\n- "))
  process.exit(1)
}
console.log("Release-note taxonomy in sync.")
