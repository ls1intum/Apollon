#!/usr/bin/env node
// Guards that the dev/test-only performance probe symbols never leak into a
// production library build. The probe (the `__perf` method and the perf-counter
// leaf module) is gated behind `import.meta.env.DEV`, so a production build must
// dead-code-eliminate it. Run this AFTER building the library:
//
//   pnpm --filter @tumaet/apollon build && node scripts/check-no-perf-hooks.mjs
//
// Exits non-zero if any probe symbol is found in library/dist.

import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, "..", "library", "dist")

// The `__perf` class method survives as an empty stub (a class method cannot be
// conditionally declared), but its DEV-gated body must dead-code-eliminate to
// nothing. We assert the empty body separately below; here we forbid the
// instrumentation symbols — the load-bearing leak indicators.
//
// DERIVED from the perf-counter module, not hardcoded. A hardcoded list only
// guards the counters that already existed when it was written: a new counter
// added later ships to production and the check still passes green, which is what
// happened to the router's search counters. Reading the exports means the next one
// is covered by default, and a counter that is deliberately public has to be
// deliberately removed from this module to become so.
const perfModule = join(
  __dirname,
  "..",
  "library",
  "lib",
  "sync",
  "perfCounters.ts"
)
const perfSource = readFileSync(perfModule, "utf8")
const perfCountersType = perfSource.match(
  /export type PerfCounters = \{([\s\S]*?)^\}/m
)
if (!perfCountersType) {
  console.error(
    "[check-no-perf-hooks] PerfCounters type not found — the check would miss counter fields."
  )
  process.exit(1)
}

const FORBIDDEN_SYMBOLS = [
  // Exported bindings: `export const foo` / `export function foo`.
  ...[...perfSource.matchAll(/export\s+(?:const|function)\s+(\w+)/g)].map(
    (m) => m[1]
  ),
  // The counter fields themselves. Restrict the scan to the PerfCounters type:
  // later function-parameter types use the same indentation and may contain
  // legitimate production-domain names.
  ...[...perfCountersType[1].matchAll(/^\s{2}(\w+):\s*number$/gm)].map(
    (m) => m[1]
  ),
]

if (FORBIDDEN_SYMBOLS.length === 0) {
  console.error(
    "[check-no-perf-hooks] derived no symbols from perfCounters.ts — the check would pass vacuously."
  )
  process.exit(1)
}

const collectFiles = (dir) => {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full))
    } else if (/\.(js|mjs|cjs)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

let distFiles
try {
  distFiles = collectFiles(distDir)
} catch {
  console.error(
    `[check-no-perf-hooks] ${distDir} not found — build the library first.`
  )
  process.exit(1)
}

// Matches a `__perf` method whose body is empty (whitespace-only). Checked
// per-occurrence below so a single non-empty body can't hide behind another
// file's empty stub.
const PERF_METHOD = /__perf\(\)\s*\{([^}]*)\}/g

const offenders = []
// Comments are not code: the bundler emits `//#region lib/sync/perfCounters.ts`
// banners naming the very module we are checking for, and matching those would
// fail the build on a symbol that is not there. Strip them before scanning.
const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

for (const file of distFiles) {
  const contents = stripComments(readFileSync(file, "utf8"))
  for (const symbol of FORBIDDEN_SYMBOLS) {
    if (contents.includes(symbol)) {
      offenders.push(`${file}: ${symbol}`)
    }
  }
  if (contents.includes("__perf")) {
    const matches = [...contents.matchAll(PERF_METHOD)]
    const allEmpty =
      matches.length > 0 && matches.every((m) => m[1].trim() === "")
    if (!allEmpty) {
      offenders.push(`${file}: __perf body was not dead-code-eliminated`)
    }
  }
}

if (offenders.length > 0) {
  console.error("[check-no-perf-hooks] perf-probe symbols leaked into build:")
  for (const offender of offenders) console.error(`  ${offender}`)
  process.exit(1)
}

console.log("[check-no-perf-hooks] OK — no perf-probe symbols in library/dist.")
