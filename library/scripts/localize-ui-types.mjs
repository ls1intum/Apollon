// Post-build: localise the @tumaet/ui type re-exports in the peer (`./react`)
// declaration bundle.
//
// @tumaet/ui is a PRIVATE workspace package whose runtime is inlined into the
// published dist (Vite lib mode). The rolled-up default entry (`dist/index.d.ts`)
// already inlines its types via api-extractor. The peer build emits per-file
// declarations and cannot inline an external package, so it leaves a bare
// `from "@tumaet/ui/theme"` import that consumers couldn't resolve.
//
// This copies @tumaet/ui's generated theme declaration into dist/react and
// rewrites the import to a relative path, keeping the published `./react`
// types self-contained (no dependency on the unpublished private package).

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const libRoot = resolve(here, "..")

const srcTheme = resolve(libRoot, "../packages/ui/dist/theme.d.ts")
const destTheme = resolve(libRoot, "dist/react/theme.d.ts")
const reactIndex = resolve(libRoot, "dist/react/index.d.ts")

if (!existsSync(srcTheme)) {
  throw new Error(
    `localize-ui-types: missing ${srcTheme}. Run \`pnpm --filter @tumaet/ui run build:types\` first.`
  )
}

copyFileSync(srcTheme, destTheme)

const before = readFileSync(reactIndex, "utf8")
const after = before.replaceAll(`from '@tumaet/ui/theme'`, `from './theme'`)
if (after === before) {
  // Nothing to rewrite — fail loudly so a tooling change doesn't silently ship
  // an unresolvable import.
  throw new Error(
    `localize-ui-types: no '@tumaet/ui/theme' import found in ${reactIndex}`
  )
}
writeFileSync(reactIndex, after)
