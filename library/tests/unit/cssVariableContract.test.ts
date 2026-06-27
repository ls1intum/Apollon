import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { CSS_VARIABLE_FALLBACKS } from "@/constants"

// Drift guard for the design-token contract.
//
// `CSS_VARIABLE_FALLBACKS` (library/lib/constants.ts) is the embed-safe source
// of truth: every `--apollon-*` custom property the renderer reads has a hard
// fallback here so a diagram still paints when the host page ships none of the
// tokens (GitHub/GitLab/iframe embeds, headless export). For that contract to
// hold, each of those variables must ALSO be:
//
//   1. documented in library/THEMING.md          — so consumers know it exists
//      and what overriding it does, and
//   2. defined in packages/ui/src/styles/tokens.css — so the webapp's own light
//      + dark themes actually supply a live value.
//
// It is trivially easy to add a fallback and forget one of the two — or to add
// a token to tokens.css/THEMING.md and forget the fallback. Either way the
// renderer and the docs/theme silently drift apart. This test fails loudly the
// moment a `CSS_VARIABLE_FALLBACKS` key is missing from either file, so the
// three stay in lockstep.
//
// Note: this is a one-directional guard (fallbacks ⊆ docs ∩ tokens). tokens.css
// intentionally defines derived/private vars (e.g. `--home-*`) that have no
// renderer fallback, so we do NOT assert the reverse.

const REPO_ROOT = resolve(__dirname, "../../..")
const THEMING_MD = resolve(REPO_ROOT, "library/THEMING.md")
const TOKENS_CSS = resolve(REPO_ROOT, "packages/ui/src/styles/tokens.css")

const themingMd = readFileSync(THEMING_MD, "utf8")
const tokensCss = readFileSync(TOKENS_CSS, "utf8")

const fallbackKeys = Object.keys(CSS_VARIABLE_FALLBACKS)

describe("CSS variable contract: CSS_VARIABLE_FALLBACKS ⊆ THEMING.md ∩ tokens.css", () => {
  it("has at least one fallback (sanity: the constant is wired up)", () => {
    expect(fallbackKeys.length).toBeGreaterThan(0)
  })

  it.each(fallbackKeys)("%s is documented in library/THEMING.md", (cssVar) => {
    expect(
      themingMd.includes(cssVar),
      `${cssVar} is in CSS_VARIABLE_FALLBACKS but missing from library/THEMING.md`
    ).toBe(true)
  })

  it.each(fallbackKeys)(
    "%s is defined in packages/ui/src/styles/tokens.css",
    (cssVar) => {
      // Match the property *declaration* (`--apollon-x:`), not an incidental
      // `var(--apollon-x, …)` reference, so a token that is only ever consumed
      // (never assigned a themed value) still counts as drift.
      const declared = new RegExp(
        `${cssVar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:`
      ).test(tokensCss)
      expect(
        declared,
        `${cssVar} is in CSS_VARIABLE_FALLBACKS but is not declared (\`${cssVar}: …\`) in packages/ui/src/styles/tokens.css`
      ).toBe(true)
    }
  )
})
