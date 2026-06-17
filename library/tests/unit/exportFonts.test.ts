import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { INTER_FONT_FACE_CSS } from "@/utils/exportFonts"
import { __testing } from "@/utils/exportUtils"

const { embedFontFaceCss } = __testing

it("INTER_FONT_FACE_CSS embeds both weights as self-contained base64 woff2", () => {
  expect(INTER_FONT_FACE_CSS).toContain("font-weight: 400")
  expect(INTER_FONT_FACE_CSS).toContain("font-weight: 700")
  const dataUrls = INTER_FONT_FACE_CSS.match(
    /url\(data:font\/woff2;base64,[A-Za-z0-9+/=]+\)/g
  )
  expect(dataUrls).toHaveLength(2)
})

describe("embedFontFaceCss", () => {
  const SVG_NS = "http://www.w3.org/2000/svg"
  const makeSvg = () => {
    const svg = document.createElementNS(SVG_NS, "svg")
    svg.appendChild(document.createElementNS(SVG_NS, "g"))
    return svg
  }

  it("inserts the @font-face style as the first child (before any <text>)", () => {
    const svg = makeSvg()
    embedFontFaceCss(svg, INTER_FONT_FACE_CSS)
    const first = svg.firstElementChild
    expect(first?.tagName).toBe("style")
    expect(first?.getAttribute("data-apollon-fonts")).toBe("")
  })

  it("is idempotent", () => {
    const svg = makeSvg()
    embedFontFaceCss(svg, INTER_FONT_FACE_CSS)
    embedFontFaceCss(svg, INTER_FONT_FACE_CSS)
    expect(svg.querySelectorAll("style[data-apollon-fonts]")).toHaveLength(1)
  })
})

// The woff2 ships base64-inlined (style.css + the lazy export chunks, ~3 copies
// on disk), where size-limit's webpack preset can't measure it — so budget the
// source bytes here. Covers Latin + Greek + Cyrillic + Vietnamese (~85 KB each);
// the ceiling guards against accidentally re-adding CJK or the full ~410 KB TTF.
it.each(["Inter-Regular.woff2", "Inter-Bold.woff2"])(
  "%s subset stays within budget (< 100 KB)",
  (name) => {
    const bytes = readFileSync(
      join(import.meta.dirname, "../../lib/assets/fonts", name)
    ).byteLength
    expect(bytes).toBeGreaterThan(10_000)
    expect(bytes).toBeLessThan(100_000)
  }
)
