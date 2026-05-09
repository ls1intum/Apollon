/**
 * Real rasterisation test for the SVG-to-PNG path.
 *
 * In production the browser worker uses `@resvg/resvg-wasm`; this test runs
 * the equivalent native binding (`@resvg/resvg-js`) against the *same*
 * Inter Regular + Bold TTFs. If text rendering ever silently regresses
 * (broken font path, glyph fallback, transparent edges turning black) this
 * test catches it before it ships — without booting wasm in jsdom.
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { Resvg } from "@resvg/resvg-js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FONTS_DIR = path.join(__dirname, "..", "..", "src", "workers", "fonts")
const FONT_FILES = [
  path.join(FONTS_DIR, "Inter-Regular.ttf"),
  path.join(FONTS_DIR, "Inter-Bold.ttf"),
]

/** Mimics Apollon's compat-mode SVG: explicit font-family + sized text. */
const SVG_WITH_TEXT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" width="200" height="80">
  <rect x="0" y="0" width="200" height="80" fill="white" stroke="black"/>
  <text x="100" y="50" text-anchor="middle" font-family="Inter" font-weight="bold" font-size="24" fill="#111">Hello</text>
</svg>`

const PNG_MAGIC = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

function render(svg: string, opts?: Parameters<typeof Resvg>[1]) {
  const resvg = new Resvg(svg, {
    background: "rgba(0,0,0,0)",
    font: {
      loadSystemFonts: false,
      fontFiles: FONT_FILES,
      defaultFontFamily: "Inter",
      ...opts?.font,
    },
    ...opts,
  })
  const rendered = resvg.render()
  return {
    pngBytes: rendered.asPng(),
    pixels: Buffer.from(rendered.pixels),
    width: rendered.width,
    height: rendered.height,
  }
}

describe("svg-to-png pipeline (real resvg-js + bundled Inter fonts)", () => {
  it("bundled font files exist on disk where the worker expects them", () => {
    for (const file of FONT_FILES) {
      expect(fs.existsSync(file)).toBe(true)
      expect(fs.statSync(file).size).toBeGreaterThan(100_000)
    }
  })

  it("renders a known SVG to a valid PNG with the right dimensions", () => {
    const { pngBytes, width, height } = render(SVG_WITH_TEXT)
    // resvg-js returns Buffer; compare bytewise rather than instance.
    expect(pngBytes.length).toBeGreaterThan(200)
    expect(Array.from(pngBytes.subarray(0, 8))).toEqual(Array.from(PNG_MAGIC))
    expect(width).toBe(200)
    expect(height).toBe(80)
  })

  it("actually rasterises the bundled Inter font (text region not blank)", () => {
    const { pixels, width, height } = render(SVG_WITH_TEXT)
    // The "Hello" text is centred at (100, 50). Sample the strip that
    // covers the text glyphs and count how many pixels are NOT white —
    // each glyph paints non-white pixels, so 0 dark pixels means the
    // font wasn't loaded and the text was silently dropped.
    let darkPixels = 0
    const yStart = Math.floor(height * 0.4)
    const yEnd = Math.floor(height * 0.7)
    const xStart = Math.floor(width * 0.3)
    const xEnd = Math.floor(width * 0.7)
    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        const i = (y * width + x) * 4
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        if (r < 200 || g < 200 || b < 200) darkPixels++
      }
    }
    // A bold 24px "Hello" produces hundreds of dark pixels in the strip.
    expect(darkPixels).toBeGreaterThan(100)
  })

  it("produces a transparent PNG when background is rgba(0,0,0,0)", () => {
    const svgNoBackground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50" height="50">
      <circle cx="25" cy="25" r="10" fill="black"/>
    </svg>`
    const { pixels, width, height } = render(svgNoBackground)
    // Top-left corner is outside the circle, should be fully transparent.
    const cornerAlpha = pixels[(0 * width + 0) * 4 + 3]
    expect(cornerAlpha).toBe(0)
    expect(width).toBe(50)
    expect(height).toBe(50)
  })

  it("renders multiple SVGs serially without leaking glyph state between them", () => {
    // First with text, then without. The font cache should be re-applied
    // each render — a regression where the second render reused the prior
    // text glyph buffer would produce mismatched dimensions.
    const a = render(SVG_WITH_TEXT)
    const b = render(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30"><circle cx="15" cy="15" r="10"/></svg>'
    )
    expect(a.width).toBe(200)
    expect(a.height).toBe(80)
    expect(b.width).toBe(30)
    expect(b.height).toBe(30)
  })
})
