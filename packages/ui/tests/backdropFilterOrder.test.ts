import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// The CSS minifier collapses an identical-value vendor-prefix pair to the last
// declaration, so `backdrop-filter` before `-webkit-backdrop-filter` ships as
// webkit-only and the glass blur dies in Chrome/Firefox. This guards the order
// in the hand-written CSS so it can't regress on a dependency bump.

const REPO_ROOT = resolve(__dirname, "../../..")

const CSS_FILES = [
  "packages/ui/src/styles/components.css",
  "library/lib/styles/app.css",
]

// Matches the broken order: an unprefixed decl immediately followed by the
// same-value -webkit- decl. `-webkit-` first, or a lone decl, is safe.
const BROKEN_ORDER =
  /(?<![-\w])backdrop-filter:\s*([^;]+);\s*-webkit-backdrop-filter:\s*\1\s*;/g

describe("backdrop-filter vendor-prefix ordering", () => {
  for (const file of CSS_FILES) {
    it(`${file} lists -webkit-backdrop-filter before the standard property`, () => {
      const css = readFileSync(resolve(REPO_ROOT, file), "utf-8")
      const offenders = [...css.matchAll(BROKEN_ORDER)].map((m) =>
        m[0].replace(/\s+/g, " ").trim()
      )
      expect(
        offenders,
        `Put -webkit-backdrop-filter BEFORE backdrop-filter in ${file}, or ` +
          `lightningcss drops the standard property and the blur breaks in ` +
          `Chrome/Firefox.`
      ).toEqual([])
    })
  }
})
