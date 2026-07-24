import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// This file is compiled into the published `@tumaet/apollon` style.css, so any
// selector that can match host DOM restyles every embedding page — an unscoped
// `border-color` on `*` repainted host form controls until it was scoped.
// Anchoring is the invariant; an allowlist catches `input`/`button`/`::selection`
// that a denylist of known-bad selectors would wave through.

const css = readFileSync(
  resolve(__dirname, "../src/styles/components.css"),
  "utf8"
)

/** Leading compound of every selector in the file, `@layer` nesting included. */
function leadingCompounds(): string[] {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{/g)]
    .flatMap((m) => m[1].split(";").pop()!.split(","))
    .map((s) => s.trim().split(/[\s>+~]/)[0])
    .filter((s) => s && !s.startsWith("@"))
}

describe("published CSS cannot restyle host DOM", () => {
  it("anchors every selector to a [data-slot] or .apollon- element", () => {
    expect(
      leadingCompounds().filter((s) => !/\[data-slot|\.apollon-/.test(s))
    ).toEqual([])
  })
})
