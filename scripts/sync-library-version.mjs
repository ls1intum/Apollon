// @ts-check
// Rewrites the pinned `@tumaet/apollon@X.Y.Z` esm.sh URLs in the README and
// docs to match library/package.json. They must name an exact version (an
// unpinned URL resolves to `latest` and breaks consumers' embeds), and no
// bundler rewrites them, so the `changeset:version` script runs this writer and
// PR Health Checks run `--check` to block any drift from merging.
//
//   node scripts/sync-library-version.mjs           # rewrite to current version
//   node scripts/sync-library-version.mjs --check    # exit 1 if anything drifts

import { readFileSync, writeFileSync, readdirSync } from "node:fs"
import { join, relative, extname } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = fileURLToPath(new URL("..", import.meta.url))

const { version } = JSON.parse(
  readFileSync(join(repoRoot, "library", "package.json"), "utf8")
)

const PIN_RE = /(@tumaet\/apollon@)(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/g

const SCANNED_EXTENSIONS = new Set([".md", ".mdx", ".ts", ".tsx", ".html"])
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".context",
  ".claude",
  ".tmp",
])

/** @param {string} dir @returns {string[]} */
function collectFiles(dir) {
  /** @type {string[]} */
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      files.push(...collectFiles(join(dir, entry.name)))
    } else if (SCANNED_EXTENSIONS.has(extname(entry.name))) {
      files.push(join(dir, entry.name))
    }
  }
  return files
}

const checkOnly = process.argv.includes("--check")

/** @type {string[]} */
const drifted = []
/** @type {string[]} */
const updated = []

for (const file of collectFiles(repoRoot)) {
  const original = readFileSync(file, "utf8")
  if (!original.includes("@tumaet/apollon@")) continue

  const next = original.replace(PIN_RE, `$1${version}`)
  if (next === original) continue

  const rel = relative(repoRoot, file)
  if (checkOnly) {
    drifted.push(rel)
  } else {
    writeFileSync(file, next)
    updated.push(rel)
  }
}

if (checkOnly) {
  if (drifted.length > 0) {
    console.error(
      `\n✗ ${drifted.length} file(s) reference a @tumaet/apollon CDN version other than ${version}:\n` +
        drifted.map((f) => `  - ${f}`).join("\n") +
        `\n\nRun \`pnpm sync:version\` to fix.\n`
    )
    process.exit(1)
  }
  console.log(`✓ All @tumaet/apollon CDN references match ${version}`)
} else if (updated.length > 0) {
  console.log(
    `Synced ${updated.length} file(s) to @tumaet/apollon@${version}:\n` +
      updated.map((f) => `  - ${f}`).join("\n")
  )
} else {
  console.log(`Nothing to sync — already at ${version}`)
}
