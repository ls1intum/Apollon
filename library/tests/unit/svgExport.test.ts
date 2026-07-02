import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it, expect } from "vitest"
import { computeAppliedScale, svgToPng } from "@/export/svgToPng"
import { svgToPdf } from "@/export/svgToPdf"
import { preProcessSvgForPdf } from "@/export/preProcessSvgForPdf"
import { normalizeExportSvg } from "@/export/normalizeExportSvg"
import { RasterTooLargeError } from "@/export/exportErrors"

// resvg-wasm and the Inter ttf are normally fetched via bundler `?url` assets;
// in node we inject them directly through the documented escape hatches.
const wasmBytes = readFileSync(
  resolve(__dirname, "../../node_modules/@resvg/resvg-wasm/index_bg.wasm")
)
const fontBuffers = [
  new Uint8Array(
    readFileSync(resolve(__dirname, "../../lib/assets/fonts/Inter-Regular.ttf"))
  ),
  new Uint8Array(
    readFileSync(resolve(__dirname, "../../lib/assets/fonts/Inter-Bold.ttf"))
  ),
]

// A nested-<svg> node with a stereotype tspan stack and the Inter font-family
// chain — the exact shapes the PDF preprocessor and resvg must handle.
const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60">
  <svg x="0" y="0" width="120" height="60" viewBox="0 0 120 60" overflow="visible">
    <rect x="0" y="0" width="120" height="60" fill="#ffffff" stroke="#000"/>
    <text x="60" y="20" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="600" fill="#000">
      <tspan x="60" y="16" font-size="13.6px">«interface»</tspan>
      <tspan x="60" y="32">MyClass</tspan>
    </text>
  </svg>
</svg>`
const CLIP = { width: 120, height: 60 }

function parse(svg: string): Element {
  return new DOMParser().parseFromString(svg, "image/svg+xml").documentElement
}

describe("computeAppliedScale", () => {
  it("returns the requested scale when within budget", () => {
    expect(computeAppliedScale(100, 100, 1.5, 75_000_000, 16_384)).toBe(1.5)
  })

  it("clamps to the area budget for huge diagrams", () => {
    // 10000×10000 @1.5 = 225 MP > 75 MP budget → scale below requested.
    const scale = computeAppliedScale(10_000, 10_000, 1.5, 75_000_000, 16_384)
    expect(scale).toBeLessThan(1.5)
    expect(10_000 * scale * (10_000 * scale)).toBeLessThanOrEqual(75_000_001)
  })

  it("clamps to the per-side cap", () => {
    const scale = computeAppliedScale(20_000, 100, 1.5, 75_000_000, 16_384)
    expect(20_000 * scale).toBeLessThanOrEqual(16_384)
  })
})

describe("preProcessSvgForPdf", () => {
  it("replaces nested <svg> with <g> and drops layout-only attrs", () => {
    const root = preProcessSvgForPdf(parse(SAMPLE_SVG))
    // Only the root remains an <svg>; the inner one became a <g>.
    expect(root.querySelectorAll("svg").length).toBe(0)
    expect(root.querySelector("g")).not.toBeNull()
    expect(root.querySelector("g")!.hasAttribute("viewBox")).toBe(false)
  })

  it("translates a non-zero nested viewBox origin", () => {
    const root = preProcessSvgForPdf(
      parse(
        `<svg xmlns="http://www.w3.org/2000/svg"><svg viewBox="5 7 100 100"><rect/></svg></svg>`
      )
    )
    expect(root.querySelector("g")!.getAttribute("transform")).toBe(
      "translate(-5, -7)"
    )
  })

  it("flattens a multi-tspan <text> into standalone <text> elements", () => {
    const root = preProcessSvgForPdf(parse(SAMPLE_SVG))
    const texts = Array.from(root.querySelectorAll("text"))
    expect(texts.length).toBe(2)
    expect(texts.some((t) => t.textContent === "«interface»")).toBe(true)
    expect(texts.some((t) => t.textContent === "MyClass")).toBe(true)
    // No <text> retains <tspan> children.
    expect(root.querySelectorAll("tspan").length).toBe(0)
  })

  it("inherits the parent font-size onto split tspans, but a tspan's own size wins", () => {
    const root = preProcessSvgForPdf(
      parse(
        `<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="0" font-size="16px">` +
          `<tspan x="0" dy="0" font-size="13.6px">«interface»</tspan>` +
          `<tspan x="0" dy="18">ClassName</tspan></text></svg>`
      )
    )
    const byText = Object.fromEntries(
      Array.from(root.querySelectorAll("text")).map((t) => [
        t.textContent,
        t.getAttribute("font-size"),
      ])
    )
    expect(byText["«interface»"]).toBe("13.6px") // own size preserved
    expect(byText["ClassName"]).toBe("16px") // inherited from parent <text>
  })

  it("collapses an Inter-led font-family chain to a literal 'Inter'", () => {
    const root = preProcessSvgForPdf(parse(SAMPLE_SVG))
    for (const text of Array.from(root.querySelectorAll("text"))) {
      expect(text.getAttribute("font-family")).toBe("Inter")
    }
  })

  it("leaves a non-Inter-led font-family untouched", () => {
    const root = preProcessSvgForPdf(
      parse(
        `<svg xmlns="http://www.w3.org/2000/svg"><text font-family="Helvetica, Inter">x</text></svg>`
      )
    )
    expect(root.querySelector("text")!.getAttribute("font-family")).toBe(
      "Helvetica, Inter"
    )
  })
})

describe("normalizeExportSvg", () => {
  it("drops the italic claim abstract headers emit (no italic face is shipped)", () => {
    const doc = parse(
      `<svg xmlns="http://www.w3.org/2000/svg"><text font-style="italic">Abstract</text><text font-style="normal">Concrete</text></svg>`
    )
    normalizeExportSvg(doc)
    const texts = Array.from(doc.querySelectorAll("text"))
    expect(texts[0].hasAttribute("font-style")).toBe(false)
    expect(texts[1].getAttribute("font-style")).toBe("normal")
  })
})

describe("svgToPng", () => {
  it("rasterises to a real PNG at the requested scale", async () => {
    const result = await svgToPng(SAMPLE_SVG, CLIP, {
      scale: 2,
      background: "#ffffff",
      wasmInput: wasmBytes,
      fontBuffers,
    })
    expect(result.clamped).toBe(false)
    expect(result.appliedScale).toBe(2)
    expect(result.width).toBe(240)
    expect(result.height).toBe(120)

    const bytes = new Uint8Array(await result.blob.arrayBuffer())
    // PNG signature — proves resvg produced a real bitmap, not a 0-byte file.
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect(bytes.length).toBeGreaterThan(100)
  })

  it("reports clamped=true and a reduced scale for an over-budget diagram", async () => {
    const result = await svgToPng(SAMPLE_SVG, CLIP, {
      scale: 2,
      maxAreaPx: 10_000, // tiny budget forces a clamp
      wasmInput: wasmBytes,
      fontBuffers,
    })
    expect(result.clamped).toBe(true)
    expect(result.appliedScale).toBeLessThan(2)
  })

  it("throws a typed error on non-positive dimensions", async () => {
    await expect(
      svgToPng(SAMPLE_SVG, { width: 0, height: 60 }, { fontBuffers })
    ).rejects.toBeInstanceOf(RasterTooLargeError)
  })

  it("does not misclassify a malformed-SVG failure as too-large", async () => {
    // resvg rejects unparseable input with a plain Error, not a RangeError, so
    // it must surface as itself rather than the OOM-typed RasterTooLargeError.
    const err = await svgToPng("not an svg at all", CLIP, {
      wasmInput: wasmBytes,
      fontBuffers,
    }).catch((e) => e)
    expect(err).toBeInstanceOf(Error)
    expect(err).not.toBeInstanceOf(RasterTooLargeError)
  })
})

describe("svgToPdf", () => {
  it("produces a PDF document", async () => {
    // svg2pdf measures text via getBBox, which jsdom lacks; shim it as the
    // server does so the walk completes.
    ;(SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox =
      () => ({ x: 0, y: 0, width: 50, height: 14 }) as DOMRect

    const blob = await svgToPdf(SAMPLE_SVG, CLIP, {
      title: "t",
      fonts: { regular: fontBuffers[0], bold: fontBuffers[1] },
    })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    // "%PDF" header.
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46])

    // Fidelity guard: the embedded Inter subset must be present. jsPDF always
    // lists the 14 base-14 names regardless, so absence-of-Helvetica proves
    // nothing — but a /BaseFont /...Inter entry plus the subset's tens-of-KB
    // payload only appear when registerInter ran and svg2pdf used Inter rather
    // than dropping the 600-weight text to a base font.
    const text = Buffer.from(bytes).toString("latin1")
    expect(text).toContain("Inter")
    expect(bytes.length).toBeGreaterThan(20_000)
  })

  it("throws on non-positive dimensions", async () => {
    await expect(
      svgToPdf(SAMPLE_SVG, { width: 0, height: 1 })
    ).rejects.toThrow()
  })
})
