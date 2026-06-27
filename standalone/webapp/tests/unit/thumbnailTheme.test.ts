import { describe, expect, it } from "vitest"
import {
  applyDarkThemeToThumbnailSvg,
  getCachedThumbnailSources,
  toSvgDataUrl,
} from "../../src/utils/thumbnailTheme"

const svg = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`

describe("applyDarkThemeToThumbnailSvg", () => {
  it("recolors near-black strokes/fills to the light dark-mode stroke", () => {
    const out = applyDarkThemeToThumbnailSvg(
      svg(`<path stroke="#000" fill="#000000"/>`)
    )
    expect(out).toContain('stroke="#ffffff"')
    expect(out).toContain('fill="#ffffff"')
  })

  it("recolors a near-white FILL to the dark surface fill", () => {
    const out = applyDarkThemeToThumbnailSvg(svg(`<rect fill="#ffffff"/>`))
    expect(out).toContain('fill="#13161c"')
  })

  it("leaves a near-white STROKE untouched (role-gated)", () => {
    const out = applyDarkThemeToThumbnailSvg(svg(`<rect stroke="#ffffff"/>`))
    expect(out).toContain('stroke="#ffffff"')
    expect(out).not.toContain("#13161c")
  })

  it("leaves non-color keywords untouched", () => {
    const out = applyDarkThemeToThumbnailSvg(
      svg(`<rect fill="none" stroke="currentColor"/>`)
    )
    expect(out).toContain('fill="none"')
    expect(out).toContain('stroke="currentColor"')
  })

  it("rewrites colors expressed via the style attribute", () => {
    const out = applyDarkThemeToThumbnailSvg(
      svg(`<path style="stroke:#000;fill:#fff"/>`)
    )
    expect(out).toContain("stroke:#ffffff")
    expect(out).toContain("fill:#13161c")
  })

  it("returns the input unchanged when it is not valid SVG", () => {
    expect(applyDarkThemeToThumbnailSvg("not svg")).toBe("not svg")
  })
})

describe("getCachedThumbnailSources", () => {
  it("returns null for an empty source", () => {
    expect(getCachedThumbnailSources("empty", null)).toBeNull()
  })

  it("memoizes the light data URL across calls with the same key", () => {
    const source = svg(`<rect fill="#000"/>`)
    const first = getCachedThumbnailSources("memo", source)
    const second = getCachedThumbnailSources("memo", source)
    expect(first?.lightDataUrl).toBe(second?.lightDataUrl)
  })

  it("falls back to the light URL for dark until computed eagerly", () => {
    const source = svg(`<path stroke="#000000" d="M0 0"/>`)
    const lazy = getCachedThumbnailSources("lazy-only", source)
    expect(lazy?.darkDataUrl).toBe(lazy?.lightDataUrl)
  })

  it("produces a distinct dark data URL when computed eagerly", () => {
    const source = svg(`<path stroke="#000000" d="M0 0"/>`)
    const eager = getCachedThumbnailSources("eager", source, { eager: true })
    expect(eager?.darkDataUrl).not.toBe(eager?.lightDataUrl)
  })

  it("bounds the cache by evicting old entries (no unbounded growth)", () => {
    // Eviction is observed indirectly: an evicted entry loses its eagerly-computed
    // dark variant, so a later non-eager read falls back to dark === light. Insert
    // comfortably more than the 300-entry cap of newer keys so the victim — older
    // than all of them — is evicted regardless of any entries earlier tests left.
    const darkSvg = svg(`<path stroke="#000000" d="M0 0"/>`)
    const filler = svg(`<rect/>`)
    getCachedThumbnailSources("victim", darkSvg, { eager: true })
    for (let i = 0; i < 320; i++) {
      getCachedThumbnailSources(`fill-${i}`, filler)
    }
    const after = getCachedThumbnailSources("victim", darkSvg)
    expect(after?.darkDataUrl).toBe(after?.lightDataUrl)
  })
})

describe("toSvgDataUrl", () => {
  it("percent-encodes the SVG so '#' cannot break the data URL", () => {
    const url = toSvgDataUrl(`<svg><rect fill="#000"/></svg>`)
    expect(url.startsWith("data:image/svg+xml;utf8,")).toBe(true)
    expect(url).not.toContain("#")
    expect(url).toContain("%23")
  })
})
