import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// Durability guard for the scoped-theme fix. Every color derived from a themeable
// base (`--apollon-background`/`-foreground`/`-primary`) must be declared on a
// selector that ALSO matches `.apollon-editor`, not `:root` alone: an unregistered
// custom property resolves its color-mix()/var() at the declaring element and
// inherits the frozen value, so a `:root`-only declaration ignores a scoped
// `dataTheme`/`theme` override on the mount node and stays light. This fails if a
// refactor collapses any of them back to `:root`.

const SCOPED_DERIVED_COLORS = [
  "--apollon-chrome-surface",
  "--apollon-chrome-surface-hover",
  "--apollon-chrome-surface-active",
  "--apollon-chrome-border",
  "--apollon-chrome-border-strong",
  "--apollon-chrome-text",
  "--apollon-chrome-text-muted",
  "--apollon-chrome-accent",
  "--apollon-chrome-accent-contrast",
  "--apollon-chrome-glass",
  "--apollon-chrome-glass-solid",
  // Foreground-derived hover veil painted inside the editor — same freeze class.
  "--apollon-hover-neutral",
]

const tokenCss = readFileSync(
  resolve(__dirname, "../src/styles/tokens.css"),
  "utf8"
)
const componentCss = readFileSync(
  resolve(__dirname, "../src/styles/components.css"),
  "utf8"
)

/** The selector of the rule block that declares `prop` (comments stripped). */
function declaringSelector(prop: string): string {
  const declIdx = tokenCss.indexOf(`${prop}:`)
  if (declIdx === -1) return "<undeclared>"
  const openBrace = tokenCss.lastIndexOf("{", declIdx)
  const prevClose = tokenCss.lastIndexOf("}", openBrace)
  return tokenCss
    .slice(prevClose + 1, openBrace)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim()
}

describe("derived theme-dependent colors are scoped for re-resolution", () => {
  it("declares every scoped-derived color on a .apollon-editor selector", () => {
    const misscoped = SCOPED_DERIVED_COLORS.filter(
      (prop) => !declaringSelector(prop).includes(".apollon-editor")
    )
    expect(misscoped).toEqual([])
  })
})

describe("public labeled chrome action", () => {
  it("uses the same neutral interaction tokens as the icon control", () => {
    expect(componentCss).toMatch(
      /\.apollon-chrome-actionbtn:hover:not\(:disabled\)\s*\{\s*background:\s*var\(--apollon-chrome-surface-hover\)/
    )
    expect(componentCss).toMatch(
      /\.apollon-chrome-actionbtn:active:not\(:disabled\)\s*\{\s*background:\s*var\(--apollon-chrome-surface-active\)/
    )
    expect(componentCss).toMatch(
      /\.apollon-chrome-actionbtn\s*\{[\s\S]*?border-radius:\s*var\(--apollon-chrome-radius-sm\)/
    )
    expect(componentCss).not.toMatch(
      /\.apollon-chrome-actionbtn:hover:not\(:disabled\)\s*\{[^}]*--apollon-chrome-accent/
    )
  })
})
