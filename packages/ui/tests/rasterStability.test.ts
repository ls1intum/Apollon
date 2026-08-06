import { describe, expect, it } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"

/**
 * Design-system counterpart to the editor's `canvasRasterStability` test.
 *
 * Two engine behaviours make text render soft, and both are reachable from
 * ordinary utility classes:
 *
 *  - `backdrop-filter` renders everything painted beneath the element into a
 *    surface to sample. On a full-viewport modal overlay that is the entire
 *    page, which then composites through a texture.
 *  - A non-integral translation disables subpixel text anti-aliasing for the
 *    layer. Centring a popup with `top-1/2 left-1/2 -translate-x-1/2
 *    -translate-y-1/2` lands on a half pixel whenever its width or height is
 *    odd — permanently, not only while animating. Grid or flex centring has no
 *    transform to be fractional.
 */
const componentsDir = path.join(__dirname, "..", "src", "components")
const sources = fs
  .readdirSync(componentsDir)
  .filter((f) => f.endsWith(".tsx") && !f.endsWith(".stories.tsx"))
  .map((f) => ({
    file: f,
    // Comments discuss these patterns by name; only real class strings count.
    text: fs
      .readFileSync(path.join(componentsDir, f), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, ""),
  }))

describe("design-system raster stability", () => {
  it("no component blurs its backdrop", () => {
    const offenders = sources
      .filter(({ text }) => /backdrop-blur|backdrop-filter:/.test(text))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it("no component centres a fixed surface with a 50% transform", () => {
    const offenders = sources
      .filter(
        ({ text }) =>
          /-translate-x-1\/2/.test(text) &&
          /-translate-y-1\/2/.test(text) &&
          /\bfixed\b/.test(text)
      )
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it("the shared stylesheet ships no live backdrop-filter", () => {
    const css = fs.readFileSync(
      path.join(__dirname, "..", "src", "styles", "components.css"),
      "utf-8"
    )
    const live = (
      css.replace(/\/\*[\s\S]*?\*\//g, "").match(/backdrop-filter:[^;]+/g) ?? []
    )
      .map((d) => d.split(":")[1].trim())
      // `none`, plus the glass token — the one seam a host may flip back on,
      // which defaults to `none` (asserted in the editor's own raster test).
      .filter((v) => v !== "none" && v !== "var(--apollon-chrome-glass-blur)")
    expect(live).toEqual([])
  })
})
