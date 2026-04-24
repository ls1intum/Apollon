import { describe, it, expect } from "vitest"
import {
  layoutTextInEllipse,
  toCanvasFont,
  wrapTextInRect,
} from "@/utils/svgTextLayout"

// The jsdom canvas mock (see tests/setup.ts) reports width = text.length * 8,
// which makes layout math predictable for these assertions.

describe("toCanvasFont", () => {
  it("produces a canvas font shorthand from a spec", () => {
    expect(toCanvasFont({ fontSize: 14 })).toBe(
      "normal 400 14px Inter, system-ui, Avenir, Helvetica, Arial, sans-serif"
    )
  })

  it("respects custom weight, style, and family", () => {
    expect(
      toCanvasFont({
        fontSize: 16,
        fontWeight: 600,
        fontStyle: "italic",
        fontFamily: "Arial",
      })
    ).toBe("italic 600 16px Arial")
  })
})

describe("wrapTextInRect", () => {
  it("returns an empty result for empty input", () => {
    const result = wrapTextInRect("", 200, { fontSize: 14 })
    expect(result.lines).toEqual([])
    expect(result.maxLineWidth).toBe(0)
    expect(result.overflow).toBe(false)
  })

  it("wraps text across multiple lines when a rectangle is narrow", () => {
    // 8 px/char (mock) → "hello" = 40 px, "world" = 40 px, plus a space = 8 px.
    // Width 50 forces one word per line.
    const result = wrapTextInRect("hello world", 50, { fontSize: 14 })
    expect(result.lines.length).toBe(2)
    expect(result.lines[0].trimEnd()).toBe("hello")
    expect(result.lines[1].trimEnd()).toBe("world")
    expect(result.overflow).toBe(false)
  })

  it("keeps the text on one line when it fits", () => {
    const result = wrapTextInRect("hello world", 500, { fontSize: 14 })
    expect(result.lines).toEqual(["hello world"])
  })

  it("truncates lines when maxLines is specified and marks overflow", () => {
    const result = wrapTextInRect(
      "one two three four five six",
      40,
      { fontSize: 14 },
      { maxLines: 2 }
    )
    expect(result.lines.length).toBe(2)
    expect(result.overflow).toBe(true)
  })
})

describe("layoutTextInEllipse", () => {
  it("returns nothing for empty input", () => {
    const layout = layoutTextInEllipse("", 200, 100, { fontSize: 14 }, 17)
    expect(layout.lines).toEqual([])
    expect(layout.blockHeight).toBe(0)
  })

  it("uses a single line when the text comfortably fits", () => {
    const layout = layoutTextInEllipse("Short", 400, 200, { fontSize: 14 }, 17)
    expect(layout.lines.length).toBe(1)
    expect(layout.lineOffsets).toEqual([0])
  })

  it("wraps long text into multiple lines", () => {
    const layout = layoutTextInEllipse(
      "One two three four five six seven eight nine ten",
      180,
      80,
      { fontSize: 14 },
      17
    )
    expect(layout.lines.length).toBeGreaterThan(1)
    // Offsets must be symmetric around zero for a centered block.
    const offsets = layout.lineOffsets
    const sum = offsets.reduce((a, b) => a + b, 0)
    expect(Math.abs(sum)).toBeLessThan(0.001)
  })

  it("places lines inside the vertical bounds of the ellipse", () => {
    const height = 120
    const layout = layoutTextInEllipse(
      "aa bb cc dd ee ff gg hh ii jj kk",
      200,
      height,
      { fontSize: 14 },
      17,
      { paddingY: 4 }
    )
    const maxAllowed = height / 2 - 4
    for (const offset of layout.lineOffsets) {
      expect(Math.abs(offset) + 17 / 2).toBeLessThanOrEqual(maxAllowed + 0.001)
    }
  })

  it("gives lines at ellipse extremities a narrower available width", () => {
    // With two lines the top and bottom lines sit near the ellipse edge where
    // the horizontal diameter is smaller than at the center — so each laid-out
    // line's measured width should be less than the ellipse's major axis.
    const width = 300
    const layout = layoutTextInEllipse(
      "aaa bbb ccc ddd eee fff ggg hhh iii jjj kkk lll",
      width,
      80,
      { fontSize: 14 },
      17
    )
    expect(layout.lines.length).toBeGreaterThanOrEqual(2)
    for (const line of layout.lines) {
      expect(line.width).toBeLessThan(width)
    }
  })
})
