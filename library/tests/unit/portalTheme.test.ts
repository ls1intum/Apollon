import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it, expect } from "vitest"
import { createApollonTheme, type ApollonTheme } from "@tumaet/ui/theme"
import { SWATCH_NAMES } from "@tumaet/ui/lib/color-swatch-tokens"
import { APOLLON_PORTAL_THEME_VARS } from "@/components/ui/portalTheme"

// Drift guard: portaled popups (menus, selects, tooltips, color picker) escape
// the scoped `--apollon-*` cascade and get their theme copied from this bridge.
// If the bridge omits a token a consumer can override, that popup silently stays
// unthemed. Assert the bridge is a superset of the two INDEPENDENT sources that
// define the overridable surface — the typed `createApollonTheme` tokens and the
// color-picker swatches — so dropping either from the bridge fails here.
describe("portal theme bridge covers the public token surface", () => {
  it("bridges every typed token and every color-picker swatch", () => {
    const bridged = new Set<string>(APOLLON_PORTAL_THEME_VARS)
    // `Required<ApollonTheme>` forces this to list every typed field, so a new
    // field added to the API is a compile error here until the bridge covers it.
    const allFields: Required<ApollonTheme> = {
      primary: "#000",
      primaryForeground: "#000",
      foreground: "#000",
      secondary: "#000",
      background: "#000",
      backgroundVariant: "#000",
      gray: "#000",
      grayVariant: "#000",
      grid: "#000",
      guideVertical: "#000",
      guideHorizontal: "#000",
      danger: "#000",
      surface: "#000",
      surfaceSunken: "#000",
      border: "#000",
      borderSubtle: "#000",
      radius: "4px",
    }
    const required = [
      ...Object.keys(createApollonTheme(allFields)),
      ...SWATCH_NAMES.map((name) => `--apollon-swatch-${name}`),
    ]

    expect(required.filter((cssVar) => !bridged.has(cssVar))).toEqual([])
  })

  // The shared @tumaet/ui primitives paint from `--home-*` aliases rather than
  // from `--apollon-*`. tokens.css re-declares them on `.apollon-editor` so they
  // track a scoped theme; a popup portaled to <body> leaves that subtree, so the
  // bridge has to carry every one of them. Nothing else ties the two lists
  // together, and a missing alias is invisible until an embed renders light
  // input borders on a dark surface.
  it("bridges every `--home-*` alias that tokens.css scopes to `.apollon-editor`", () => {
    // vitest runs with the library workspace as its root.
    const tokens = readFileSync(
      resolve(process.cwd(), "../packages/ui/src/styles/tokens.css"),
      "utf8"
    )
    // Several rules target `.apollon-editor` (the chrome ramp among them); the
    // aliases may live in any of them.
    const scoped = [...tokens.matchAll(/\.apollon-editor\s*\{([^}]*)\}/g)]
      .flatMap((rule) => [...rule[1].matchAll(/(--home-[\w-]+)\s*:/g)])
      .map((match) => match[1])
    if (scoped.length === 0) {
      throw new Error("no `--home-*` alias is scoped to `.apollon-editor`")
    }

    const bridged = new Set<string>(APOLLON_PORTAL_THEME_VARS)
    expect(scoped.filter((cssVar) => !bridged.has(cssVar))).toEqual([])
  })
})
