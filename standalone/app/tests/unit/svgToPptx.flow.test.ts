import { describe, expect, it } from "vitest"
import PptxGenJS from "pptxgenjs"
import JSZip from "jszip"
import {
  computeSlideViewport,
  renderSvgToSlide,
} from "../../src/utils/svgToPptx"

const FIXTURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
  <g>
    <g transform="translate(40, 40)">
      <svg width="160" height="80" viewBox="0 0 160 80">
        <rect x="0" y="0" width="160" height="80" fill="#FFFFFF" stroke="#111111" stroke-width="1"/>
        <text x="80" y="44" text-anchor="middle" font-family="Inter" font-size="14" font-weight="bold" fill="#111111">Customer</text>
      </svg>
    </g>
  </g>
  <g>
    <path d="M 200 80 L 280 80" stroke="#111111" stroke-width="1.5" fill="none"/>
    <polygon data-inline-marker="black-triangle" points="280,80 268,74 268,86" fill="#111111" stroke="#111111" stroke-width="1"/>
    <text x="240" y="70" text-anchor="middle" font-family="Inter" font-size="11" fill="#111111">label</text>
  </g>
</svg>`

const CLIP = { x: 0, y: 0, width: 400, height: 200 }

async function buildPptx(opts: {
  slideCanvas?: { width: number; height: number }
  fit?: "shrink" | "fill" | "actual"
}): Promise<{ slideXml: string; slideWidth: number; slideHeight: number }> {
  const pres = new PptxGenJS()
  const viewport = computeSlideViewport(CLIP, opts.slideCanvas, opts.fit)
  pres.defineLayout({
    name: "FLOW_TEST",
    width: viewport.slideWidth,
    height: viewport.slideHeight,
  })
  pres.layout = "FLOW_TEST"
  const slide = pres.addSlide()
  renderSvgToSlide(FIXTURE_SVG, CLIP, pres, slide, {
    background: "FFFFFF",
    fontFace: "Inter",
    viewport,
  })
  const bytes = (await pres.write({ outputType: "arraybuffer" })) as ArrayBuffer
  const zip = await JSZip.loadAsync(bytes)
  const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string")
  return {
    slideXml,
    slideWidth: viewport.slideWidth,
    slideHeight: viewport.slideHeight,
  }
}

describe("svgToPptx — flow", () => {
  it("emits one shape per visible SVG element on a fit-to-content slide", async () => {
    const { slideXml } = await buildPptx({})
    // 1 rect (class box) + 1 path (edge body) + 1 polygon (arrowhead) = 3 shapes
    // Plus 2 text boxes (Customer label + edge label) = 5 total <p:sp>.
    const spCount = (slideXml.match(/<p:sp\b/g) ?? []).length
    expect(spCount).toBeGreaterThanOrEqual(5)
  })

  it("places each label as a separate sibling shape (independently animatable)", async () => {
    const { slideXml } = await buildPptx({})
    const txBodies = (slideXml.match(/<p:txBody\b/g) ?? []).length
    // The two SVG <text> nodes both produce sibling text-boxes in PPTX.
    expect(txBodies).toBeGreaterThanOrEqual(2)
  })

  it("widescreen 16:9 slide canvas has the documented dimensions in EMU", async () => {
    const { slideWidth, slideHeight } = await buildPptx({
      slideCanvas: { width: 13.333, height: 7.5 },
      fit: "shrink",
    })
    expect(slideWidth).toBeCloseTo(13.333, 5)
    expect(slideHeight).toBeCloseTo(7.5, 5)
  })

  it("Standard 4:3 slide canvas honors the user's choice", async () => {
    const { slideWidth, slideHeight } = await buildPptx({
      slideCanvas: { width: 10, height: 7.5 },
      fit: "shrink",
    })
    expect(slideWidth).toBe(10)
    expect(slideHeight).toBe(7.5)
  })

  it("custGeom path emission produces an <a:custGeom> in the slide XML", async () => {
    const { slideXml } = await buildPptx({})
    expect(slideXml).toContain("<a:custGeom>")
  })

  it("emits the chosen font face into the OOXML", async () => {
    const { slideXml } = await buildPptx({})
    expect(slideXml).toContain('typeface="Inter"')
  })
})
