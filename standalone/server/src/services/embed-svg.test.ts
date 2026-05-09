/**
 * Unit tests for the embed SVG sanitizer. The library's
 * `exportModelAsSvg` produces React-escaped output today, so the
 * sanitizer is defence-in-depth — these tests pin the contract so a
 * future regression in the library doesn't slip past us.
 */
import { describe, it, expect } from "vitest"
import { sanitizeSvg } from "./embed-svg"

describe("sanitizeSvg", () => {
  it("strips <script> blocks and counts the hit", () => {
    const dirty = `<svg><script>alert(1)</script><rect/></svg>`
    const { svg, stats } = sanitizeSvg(dirty)
    expect(svg).toBe(`<svg><rect/></svg>`)
    expect(stats.hits["script"]).toBe(1)
  })

  it("strips self-closing <script />", () => {
    const dirty = `<svg><script src="x.js"/><rect/></svg>`
    const { svg, stats } = sanitizeSvg(dirty)
    expect(svg).not.toContain("script")
    expect(stats.hits["script-self-closing"]).toBe(1)
  })

  it("strips <foreignObject> blocks and any nested HTML", () => {
    const dirty = `<svg><foreignObject><div onclick="x()">x</div></foreignObject></svg>`
    const { svg, stats } = sanitizeSvg(dirty)
    expect(svg).toBe(`<svg></svg>`)
    expect(stats.hits["foreignObject"]).toBe(1)
  })

  it("strips on*= event-handler attributes (double-quoted)", () => {
    const dirty = `<svg><circle onclick="evil()" cx="0"/></svg>`
    const { svg, stats } = sanitizeSvg(dirty)
    expect(svg).toBe(`<svg><circle cx="0"/></svg>`)
    expect(stats.hits["on*-attr"]).toBe(1)
  })

  it("strips on*= event-handler attributes (single-quoted)", () => {
    const dirty = `<svg><circle onmouseover='evil()'/></svg>`
    const { svg, stats } = sanitizeSvg(dirty)
    expect(svg).not.toContain("onmouseover")
    expect(stats.hits["on*-attr-single"]).toBe(1)
  })

  it("strips javascript: URIs in href / xlink:href", () => {
    const dirty = `<svg><a href="javascript:evil()" xlink:href='javascript:foo'><text>x</text></a></svg>`
    const { svg, stats } = sanitizeSvg(dirty)
    expect(svg).not.toMatch(/javascript:/i)
    expect(stats.hits["javascript-uri"]).toBe(2)
  })

  it("returns identical SVG and an empty hits map on a clean input", () => {
    const clean = `<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>`
    const { svg, stats } = sanitizeSvg(clean)
    expect(svg).toBe(clean)
    expect(stats.hits).toEqual({})
  })

  it("composes — multiple categories of hit in one pass", () => {
    const dirty = `<svg>
      <script>alert(1)</script>
      <foreignObject><div/></foreignObject>
      <a href="javascript:x">click</a>
      <rect onclick="y()"/>
    </svg>`
    const { svg, stats } = sanitizeSvg(dirty)
    expect(svg).not.toContain("script")
    expect(svg).not.toContain("foreignObject")
    expect(svg).not.toMatch(/javascript:/i)
    expect(svg).not.toContain("onclick")
    expect(stats.hits["script"]).toBe(1)
    expect(stats.hits["foreignObject"]).toBe(1)
    expect(stats.hits["javascript-uri"]).toBe(1)
    expect(stats.hits["on*-attr"]).toBe(1)
  })
})
