import type { ApollonTheme } from "@tumaet/apollon"
import { THEME_TOKENS, type ThemeToken } from "./themeTokens"

const TOKEN_BY_VAR = new Map<string, ThemeToken>(
  THEME_TOKENS.map((t) => [t.cssVar, t])
)

/**
 * Render the current overrides as the idiomatic embed snippet: typed fields go
 * through `createApollonTheme`, the CSS-variable-only bands are spread in
 * alongside it. When dark is active, emit `dataTheme="dark"` on the tag —
 * scoped `dataTheme` themes the whole editor (canvas, chrome, and portaled
 * menus/pickers), so it's the right lever for a dark editor on any page.
 * Mirrors how a host applies the theme, so the playground doubles as a
 * copy-paste starting point.
 */
export const buildThemeSnippet = (
  overrides: Record<string, string>,
  dark = false
): string => {
  const entries = Object.entries(overrides)

  const typed = entries
    .map(([cssVar, value]) => ({
      field: TOKEN_BY_VAR.get(cssVar)?.field,
      value,
    }))
    .filter((e): e is { field: keyof ApollonTheme; value: string } =>
      Boolean(e.field)
    )

  const rawVars = entries.filter(([cssVar]) => !TOKEN_BY_VAR.get(cssVar)?.field)

  const darkProp = dark ? '  dataTheme="dark"' : null
  // Only relevant once dark is on: clarify that this darkens the editor, not the
  // surrounding page.
  const darkNote = dark
    ? '// dataTheme darkens THIS editor. For a fully dark page, set\n// data-theme="dark" on <html> instead and the editor inherits it.'
    : null

  const preface = [darkNote].filter(Boolean).join("\n")
  const prefaceBlock = preface ? `\n\n${preface}` : ""

  if (typed.length === 0 && rawVars.length === 0) {
    const tag = darkProp ? `<Apollon\n${darkProp}\n/>` : "<Apollon />"
    return `import { Apollon } from "@tumaet/apollon"${prefaceBlock}
${tag}`
  }

  const themeLines: string[] = ["  theme={{"]

  if (typed.length > 0) {
    themeLines.push("    ...createApollonTheme({")
    for (const { field, value } of typed) {
      themeLines.push(`      ${field}: ${JSON.stringify(value)},`)
    }
    themeLines.push("    }),")
  }

  for (const [cssVar, value] of rawVars) {
    themeLines.push(`    ${JSON.stringify(cssVar)}: ${JSON.stringify(value)},`)
  }

  themeLines.push("  }}")

  const importLine =
    typed.length > 0
      ? `import { Apollon, createApollonTheme } from "@tumaet/apollon"`
      : `import { Apollon } from "@tumaet/apollon"`

  const propLines = [darkProp, themeLines.join("\n")].filter(Boolean).join("\n")

  return `${importLine}${prefaceBlock}
<Apollon
${propLines}
/>`
}
