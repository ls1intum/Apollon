import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// Durability guard for scoped-dark theming. A custom property is substituted at
// computed-value time on its declaring element: an `--apollon-x: var(--primitive-y)`
// declared only at :root freezes to the light value and inherits that frozen value
// into a scoped `[data-theme="dark"]` mount — it does NOT re-resolve against the
// mount's dark primitive. So a theme-varying token must be re-declared in the dark
// block, or a scoped `<Apollon dataTheme="dark">` renders it light-on-dark. Two
// classes are guarded: (1) tokens mapping 1:1 to a primitive that carries a dark
// delta (derived from the CSS below), and (2) tokens flipped in dark by a literal
// or a different primitive, whose light primitive has NO dark delta (pinned
// explicitly — the mapping check can't see these).

const css = readFileSync(resolve(__dirname, "../src/styles/tokens.css"), "utf8")
  // Strip comments so prose examples (`--apollon-x: var(--primitive-y)`) don't match.
  .replace(/\/\*[\s\S]*?\*\//g, "")

const darkIdx = css.search(
  /:root\[data-theme="dark"\],\s*\[data-theme="dark"\]\s*\{/
)
// Bound the dark region to the rule's own braces. The block is flat (no nested
// rules), so the first `}` after its `{` closes it — this keeps a token declared in
// a trailing @media block from falsely counting as a dark re-declaration.
const darkOpen = css.indexOf("{", darkIdx)
const darkClose = css.indexOf("}", darkOpen)
const light = css.slice(0, darkIdx)
const dark = css.slice(darkIdx, darkClose + 1)

const apollonToPrimitive = new Map<string, string>()
for (const m of light.matchAll(
  /(--apollon-[\w-]+):\s*var\((--primitive-[\w-]+)/g
)) {
  if (!apollonToPrimitive.has(m[1])) apollonToPrimitive.set(m[1], m[2])
}
const primitiveHasDarkDelta = new Set(
  [...dark.matchAll(/(--primitive-[\w-]+):/g)].map((m) => m[1])
)
const apollonRedeclaredInDark = new Set(
  [...dark.matchAll(/(--apollon-[\w-]+):/g)].map((m) => m[1])
)

// Theme-varying ink/surface tokens whose LIGHT value maps to a primitive with no
// dark delta, so the dark block flips them via a literal or a different primitive.
// Invisible to the mapping check above, so pinned here.
const LITERAL_DARK_TOKENS = [
  "--apollon-foreground",
  "--apollon-background",
  "--apollon-background-variant",
  "--apollon-gray",
  "--apollon-gray-variant",
]

describe("scoped-dark theming has no frozen tokens", () => {
  it("re-declares every --apollon token mapped to a dark-delta primitive", () => {
    expect(darkIdx).toBeGreaterThan(0)
    expect(darkClose).toBeGreaterThan(darkOpen)
    expect(apollonToPrimitive.size).toBeGreaterThan(10)

    const frozen = [...apollonToPrimitive.entries()]
      .filter(
        ([tok, prim]) =>
          primitiveHasDarkDelta.has(prim) && !apollonRedeclaredInDark.has(tok)
      )
      .map(([tok, prim]) => `${tok} -> ${prim}`)
    expect(frozen).toEqual([])
  })

  it("re-declares theme-varying tokens flipped by a literal in dark", () => {
    const missing = LITERAL_DARK_TOKENS.filter(
      (tok) => !apollonRedeclaredInDark.has(tok)
    )
    expect(missing).toEqual([])
  })
})
