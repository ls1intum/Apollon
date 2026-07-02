import { describe, it, expect } from "vitest"
import {
  getCustomColorsFromData,
  getCustomColorsFromDataForEdge,
} from "@/utils/layoutUtils"
import { DefaultNodeProps } from "@/types"

// Regression coverage for the "elements render solid black" bug: when a node
// carries no explicit colors, the color helpers must emit `var(--apollon-*, …)`
// references that include a LITERAL fallback. An undefined CSS variable makes
// an SVG `fill`/`stroke` collapse to black, so a missing fallback ships as a
// visible defect on any host that does not define the theme variables.

describe("getCustomColorsFromData", () => {
  it("emits themed var() references with a literal fallback when data has no colors", () => {
    const { strokeColor, fillColor, textColor } = getCustomColorsFromData({
      name: "Class",
    } as DefaultNodeProps)

    expect(fillColor).toBe("var(--apollon-background, #ffffff)")
    expect(strokeColor).toBe("var(--apollon-foreground, #000000)")
    expect(textColor).toBe("var(--apollon-foreground, #000000)")
  })

  it("passes through explicit colors from data unchanged", () => {
    expect(
      getCustomColorsFromData({
        name: "Class",
        fillColor: "#fafafa",
        strokeColor: "#222222",
        textColor: "#333333",
      })
    ).toEqual({
      fillColor: "#fafafa",
      strokeColor: "#222222",
      textColor: "#333333",
    })
  })
})

describe("getCustomColorsFromDataForEdge", () => {
  it("emits a themed var() reference with a literal fallback", () => {
    const { strokeColor, textColor } = getCustomColorsFromDataForEdge()

    expect(strokeColor).toBe("var(--apollon-foreground, #000000)")
    expect(textColor).toBe("var(--apollon-foreground, #000000)")
  })

  it("passes through explicit edge colors unchanged", () => {
    expect(
      getCustomColorsFromDataForEdge({
        strokeColor: "#222222",
        textColor: "#333333",
      })
    ).toEqual({ strokeColor: "#222222", textColor: "#333333" })
  })
})
