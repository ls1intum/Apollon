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

const css = readFileSync(resolve(__dirname, "../src/styles/tokens.css"), "utf8")

/** The selector of the rule block that declares `prop` (comments stripped). */
function declaringSelector(prop: string): string {
  const declIdx = css.indexOf(`${prop}:`)
  if (declIdx === -1) return "<undeclared>"
  const openBrace = css.lastIndexOf("{", declIdx)
  const prevClose = css.lastIndexOf("}", openBrace)
  return css
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
