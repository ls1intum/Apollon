import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { INTER_FONT_FACE_CSS } from "@/utils/exportFonts"
import { __testing } from "@/utils/exportUtils"
import { DEFAULT_FONT_SIZE, FONT_FAMILY, LAYOUT } from "@/constants"

const { embedFontFaceCss } = __testing

// ---------------------------------------------------------------------------
// Font stack is a single source of truth
//
// Node geometry is sized by canvas measureText against FONT_FAMILY. If the
// measure font, the bundled @font-face token, and the exported font-family
// ever diverge, the editor measures one face and renders another and nodes
// overlap (the headless-export bug). These tests pin them together.
// ---------------------------------------------------------------------------
describe("FONT_FAMILY single source of truth", () => {
  it("leads with the self-hosted Inter family", () => {
    expect(FONT_FAMILY.startsWith("Inter,")).toBe(true)
  })

  it("derives LAYOUT.DEFAULT_FONT (the measure font) from FONT_FAMILY", () => {
    expect(LAYOUT.DEFAULT_FONT).toBe(
      `400 ${DEFAULT_FONT_SIZE}px ${FONT_FAMILY}`
    )
    expect(LAYOUT.DEFAULT_FONT).toContain(FONT_FAMILY)
  })
})

// ---------------------------------------------------------------------------
// Embedded font for compat-mode SVG exports
// ---------------------------------------------------------------------------
describe("INTER_FONT_FACE_CSS", () => {
  it("declares Inter at weights 400 and 700", () => {
    const faces = INTER_FONT_FACE_CSS.match(/@font-face/g) ?? []
    expect(faces).toHaveLength(2)
    expect(INTER_FONT_FACE_CSS).toContain('font-family: "Inter"')
    expect(INTER_FONT_FACE_CSS).toContain("font-weight: 400")
    expect(INTER_FONT_FACE_CSS).toContain("font-weight: 700")
  })

  it("inlines the font as a self-contained base64 woff2 data URL", () => {
    const dataUrls = INTER_FONT_FACE_CSS.match(
      /url\(data:font\/woff2;base64,[A-Za-z0-9+/=]+\)/g
    )
    expect(dataUrls).toHaveLength(2)
    // Sanity-check the payload is non-trivial (a real font, not a stub).
    expect(INTER_FONT_FACE_CSS.length).toBeGreaterThan(50_000)
  })

  it("references the same Inter family the diagram font stack leads with", () => {
    const family = FONT_FAMILY.split(",")[0].trim()
    expect(INTER_FONT_FACE_CSS).toContain(`font-family: "${family}"`)
  })
})

describe("embedFontFaceCss", () => {
  const SVG_NS = "http://www.w3.org/2000/svg"
  const makeSvg = () => {
    const svg = document.createElementNS(SVG_NS, "svg")
    const child = document.createElementNS(SVG_NS, "g")
    svg.appendChild(child)
    return svg
  }

  it("inserts the @font-face style as the first child", () => {
    const svg = makeSvg()
    embedFontFaceCss(svg, INTER_FONT_FACE_CSS)

    const first = svg.firstElementChild
    expect(first?.tagName).toBe("style")
    expect(first?.getAttribute("data-apollon-fonts")).toBe("")
    expect(first?.textContent).toContain("@font-face")
  })

  it("is idempotent — a second call does not add a second style", () => {
    const svg = makeSvg()
    embedFontFaceCss(svg, INTER_FONT_FACE_CSS)
    embedFontFaceCss(svg, INTER_FONT_FACE_CSS)
    expect(svg.querySelectorAll("style[data-apollon-fonts]")).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Size budget for the bundled woff2 — these are inlined into style.css AND the
// lazy exportFonts chunk, so guard the source bytes directly (the size-limit
// webpack preset can't measure CSS). Keep the subset lean.
// ---------------------------------------------------------------------------
describe("bundled Inter woff2 size budget", () => {
  const fontPath = (name: string) =>
    join(import.meta.dirname, "../../lib/assets/fonts", name)

  it.each(["Inter-Regular.woff2", "Inter-Bold.woff2"])(
    "%s stays under 60 KB",
    (name) => {
      const bytes = readFileSync(fontPath(name)).byteLength
      expect(bytes).toBeGreaterThan(10_000) // a real subset, not empty
      expect(bytes).toBeLessThan(60_000)
    }
  )
})
