import { describe, expect, it } from "vitest"
import { createApollonTheme, type ApollonTheme } from "@tumaet/apollon"
import {
  THEME_GROUPS,
  THEME_TOKENS,
} from "../../src/components/playground/theme/themeTokens"

// Guards the playground's theming surface: every typed `ApollonTheme` field
// round-trips through the REAL `createApollonTheme` onto its `--apollon-*`
// variable, no token is duplicated, and the alive CSS-variable-only bands stay
// covered.

describe("theme token catalog", () => {
  it("exposes every token exactly once (no duplicate CSS variables)", () => {
    const seen = new Set<string>()
    for (const token of THEME_TOKENS) {
      expect(seen.has(token.cssVar), `duplicate ${token.cssVar}`).toBe(false)
      seen.add(token.cssVar)
    }
  })

  it("maps each typed field to its real --apollon-* variable via createApollonTheme", () => {
    for (const token of THEME_TOKENS) {
      if (!token.field) continue
      const emitted = createApollonTheme({ [token.field]: "SENTINEL" })
      expect(emitted).toEqual({ [token.cssVar]: "SENTINEL" })
    }
  })

  it("maps a distinct --apollon-* variable for every typed field", () => {
    const fields = THEME_TOKENS.map((t) => t.field).filter(
      (f): f is keyof ApollonTheme => Boolean(f)
    )
    expect(new Set(fields).size).toBe(fields.length)
    const all = createApollonTheme(
      Object.fromEntries(fields.map((f) => [f, "x"])) as ApollonTheme
    )
    expect(Object.keys(all)).toHaveLength(fields.length)
  })

  it("drops the derived-redundant knobs from the panel", () => {
    const vars = new Set(THEME_TOKENS.map((t) => t.cssVar))
    // radius-md derives from radius; dropzone-accent-fill from dropzone-accent;
    // chrome-accent from primary — none should be a separate control.
    expect(vars.has("--apollon-radius-md")).toBe(false)
    expect(vars.has("--apollon-dropzone-accent-fill")).toBe(false)
    expect(vars.has("--apollon-chrome-accent")).toBe(false)
  })

  it("still covers the alive CSS-variable-only bands", () => {
    const vars = new Set(THEME_TOKENS.map((t) => t.cssVar))
    // One representative per band — a band is added/removed as a unit.
    for (const v of [
      "--apollon-radius",
      "--apollon-shadow",
      "--apollon-interactive-selection",
      "--apollon-dropzone-accent",
      "--apollon-on-collaboration-cursor",
      "--apollon-collaboration-color-1",
      "--apollon-swatch-slate",
      "--apollon-assessment-positive-text",
      "--apollon-chrome-radius-sm",
    ] as const) {
      expect(vars.has(v), `missing ${v}`).toBe(true)
    }
  })

  it("gives length tokens slider bounds and color/shadow tokens none", () => {
    for (const token of THEME_TOKENS) {
      if (token.type === "length") {
        expect(typeof token.min).toBe("number")
        expect(typeof token.max).toBe("number")
        expect(token.min).toBeLessThan(token.max!)
      } else {
        expect(token.min).toBeUndefined()
        expect(token.max).toBeUndefined()
      }
    }
  })

  it("tiers every group; feature groups can be made visible", () => {
    const ids = THEME_GROUPS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const group of THEME_GROUPS) {
      expect(["essential", "advanced", "feature"]).toContain(group.tier)
      // A feature group must tell the user how to see its effect: either an
      // auto-reveal context or a written note.
      if (group.tier === "feature") {
        expect(Boolean(group.reveal) || Boolean(group.note)).toBe(true)
      }
    }

    // Essentials must lead.
    expect(THEME_GROUPS[0].tier).toBe("essential")
  })
})
