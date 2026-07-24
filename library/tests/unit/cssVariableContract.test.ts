import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { SWATCH_NAMES } from "@tumaet/ui/lib/color-swatch-tokens"
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

// The color-picker swatches are the one token family a user can paint directly
// onto exported geometry (as `var(--apollon-swatch-*)` with no inline fallback),
// so unlike the general one-directional guard above they MUST have a compat
// fallback or the element vanishes from every headless/embed export (issue
// #828). And because the fallback duplicates a hex that really lives in
// tokens.css, guard the VALUE too: each fallback must equal the light-theme
// `--primitive-swatch-*` the swatch resolves to, so retuning the palette can't
// silently ship a stale export color.
//
// tokens.css layers `--apollon-swatch-red: var(--primitive-swatch-red)` and
// `--primitive-swatch-red: #dc2626`; the hex lives in the primitive, defined
// once for light (`:root`, authored first) and again for the dark override.
// Compat export is always light (like every other entry in the fallback map),
// so read the first — i.e. light — declaration of each primitive.
const lightPrimitiveHex = (name: string): string | undefined =>
  tokensCss.match(
    new RegExp(`--primitive-swatch-${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`)
  )?.[1]

describe("swatch tokens ⊆ CSS_VARIABLE_FALLBACKS (export must never blank or drift a swatch)", () => {
  it.each(SWATCH_NAMES)(
    "--apollon-swatch-%s exports the light-theme primitive hex",
    (name) => {
      const fallback = CSS_VARIABLE_FALLBACKS[`--apollon-swatch-${name}`]
      expect(
        fallback,
        `--apollon-swatch-${name} has no CSS_VARIABLE_FALLBACKS entry; a swatch of this color would export invisible`
      ).toBeDefined()
      expect(
        fallback,
        `--apollon-swatch-${name} fallback ${fallback} != light --primitive-swatch-${name} ${lightPrimitiveHex(name)} in tokens.css — retune both together`
      ).toBe(lightPrimitiveHex(name))
    }
  )
})
