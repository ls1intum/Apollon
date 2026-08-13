import { describe, expect, it } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"

/**
 * The editor stylesheet must not ask Chrome to composite anything that sits
 * over the canvas.
 *
 * Three properties force a composited layer, and a composited layer keeps its
 * own raster: `backdrop-filter` (which additionally renders everything beneath
 * it into a backdrop surface — the zoomed canvas), and animations of `opacity`
 * or `transform`. A layer is rasterised at the scale it had when it was built
 * and rasterised asynchronously when it is new, so under
 * `.react-flow__viewport`'s zoom transform the result is a stale, scaled copy:
 * nodes soften after a zoom until a pan forces a re-raster, and affordances
 * fading in make the node beneath them blur for a few frames.
 *
 * Colour is paint-only, so `fill` / `stroke` / `background-color` transitions
 * stay allowed and are how visibility changes should be softened here.
 */
const css = fs.readFileSync(
  path.join(__dirname, "..", "..", "lib", "styles", "app.css"),
  "utf-8"
)

/** Declaration bodies, with comments stripped so prose can discuss the rule. */
const declarations = css
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("}")
  .map((block) => block.slice(block.indexOf("{") + 1))

describe("canvas raster stability", () => {
  it("never applies a live backdrop-filter", () => {
    const live = declarations.filter((d) =>
      /backdrop-filter:\s*(?!none)(?!var\(--apollon-chrome-glass-blur\))\S/.test(
        d
      )
    )
    expect(live).toEqual([])
  })

  it("keeps the glass blur token off by default", () => {
    const tokens = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "packages",
        "ui",
        "src",
        "styles",
        "tokens.css"
      ),
      "utf-8"
    )
    expect(tokens).toMatch(/--apollon-chrome-glass-blur:\s*none;/)
    expect(tokens).not.toMatch(/--apollon-chrome-glass-blur:\s*(saturate|blur)/)
  })

  it("never transitions opacity or transform", () => {
    const offenders = declarations.filter((d) => {
      const match = /transition:([^;]*);/.exec(d)
      return match ? /\b(opacity|transform)\b/.test(match[1]) : false
    })
    expect(offenders).toEqual([])
  })

  it("hides canvas affordances with transparent paint, not opacity", () => {
    // The hover path: flipping opacity on these would rebuild an effect node
    // per element and flip the layer's LCD-text eligibility, which discards the
    // whole tiling. Transparent paint keeps them hit-testable and focusable,
    // which `visibility: hidden` would not.
    const blocks = css.replace(/\/\*[\s\S]*?\*\//g, "").split("}")
    const hoverAffordances = declarations.filter(
      (d, i) =>
        /opacity:\s*[01](\s|;|$)/.test(d) &&
        /react-flow__(handle|resize-control)/.test(blocks[i].split("{")[0])
    )
    expect(hoverAffordances).toEqual([])
  })

  it("keeps the edge hit ribbon invisible", () => {
    // `.edge-overlay` is the click surface for an edge body, widened in
    // assessment so relationships are easy to acquire. Painting it turns that
    // width into a visible band across the diagram — which is exactly what a
    // rule that set `opacity: 0.45` on it did. Only the edge path may carry
    // selection colour. The quiz element picker is the one deliberate
    // exception and is scoped to its own `--picker` class.
    const painted = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("}")
      .filter((block) => {
        const [selector, body = ""] = block.split("{")
        return (
          /\.edge-overlay\s*$/.test(selector.trim()) &&
          !/apollon-highlight--picker/.test(selector) &&
          /opacity:\s*0?\.\d/.test(body)
        )
      })
      .map((block) => block.split("{")[0].trim())
    expect(painted).toEqual([])
  })

  it("never fades a full-canvas overlay with opacity", () => {
    // `.scroll-overlay` spans the whole canvas. Giving it an opacity between 0
    // and 1 puts a transparency effect node directly over the diagram — the
    // same trap as the affordances above, at full size. Its visibility is a
    // background-colour change instead.
    const painted = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("}")
      .filter((block) => {
        const [selector, body = ""] = block.split("{")
        return (
          /\.scroll-overlay(--[a-z]+)?\s*$/.test(selector.trim()) &&
          /(^|[^-])opacity:/.test(body)
        )
      })
      .map((block) => block.split("{")[0].trim())
    expect(painted).toEqual([])
  })

  it("never leaves an entry animation filling, which pins the layer", () => {
    const offenders = declarations.filter((d) =>
      /animation:[^;]*\b(both|forwards)\b/.test(d)
    )
    expect(offenders).toEqual([])
  })
})
