#!/usr/bin/env node
// Runs before `changeset version`: make the standalone app track the LIBRARY's
// bump TYPE. Changesets' updateInternalDependencies only ever cascades a patch,
// so a library minor/major would otherwise land as a standalone patch. If the
// pending @tumaet/apollon bump (minor or major) outranks the standalone's own
// pending bump, inject a matching changeset for @tumaet/webapp (its fixed pair
// @tumaet/server follows). The standalone can still bump HIGHER on its own —
// this only raises a floor, and never touches the library.

import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const DIR = process.argv[2] || ".changeset"
const RANK = { patch: 1, minor: 2, major: 3 }
const LIBRARY = "@tumaet/apollon"
const STANDALONE = ["@tumaet/webapp", "@tumaet/server"]
const INJECTED = "zz-standalone-tracks-library.md"

// Highest pending bump per package, read from changeset frontmatter.
const highest = {}
for (const file of readdirSync(DIR)) {
  if (!file.endsWith(".md") || file === "README.md" || file === INJECTED)
    continue
  const frontmatter = readFileSync(join(DIR, file), "utf8").match(
    /^---\r?\n([\s\S]*?)\r?\n---/
  )
  if (!frontmatter) continue
  for (const line of frontmatter[1].split(/\r?\n/)) {
    const match = line.match(
      /^\s*["']?(@[\w.-]+\/[\w.-]+)["']?\s*:\s*(patch|minor|major)\s*$/
    )
    if (!match) continue
    const [, pkg, bump] = match
    if (!highest[pkg] || RANK[bump] > RANK[highest[pkg]]) highest[pkg] = bump
  }
}

const libRank = RANK[highest[LIBRARY]] || 0
const stdRank = Math.max(...STANDALONE.map((pkg) => RANK[highest[pkg]] || 0))

// Only elevate for a library minor/major that outranks the standalone's own bump.
if (libRank >= RANK.minor && libRank > stdRank) {
  const bump = highest[LIBRARY]
  writeFileSync(
    join(DIR, INJECTED),
    `---\n"${STANDALONE[0]}": ${bump}\n---\n\nShips the latest \`${LIBRARY}\` editor release.\n`
  )
  console.log(
    `cascade-standalone-bump: raised standalone to ${bump} to match ${LIBRARY}`
  )
} else {
  console.log("cascade-standalone-bump: no elevation needed")
}
