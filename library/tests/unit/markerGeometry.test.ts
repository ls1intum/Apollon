import { describe, expect, it } from "vitest"
import { getMarkerHalfHeight } from "@/components/svgs/edges"
import { MARKER_CONFIGS } from "@/constants"

// The aggregation/composition diamond and the inheritance triangle sit side by
// side in a class diagram, so what a reader perceives is their proportions, not
// their absolute sizes. These pin the relationships that set the diamond's size.

// Both shapes are inscribed in their bounding box, so width * height / 2 is
// their exact area — a proxy for visual weight.
const inkArea = (id: keyof typeof MARKER_CONFIGS) => {
  const { size, widthFactor, heightFactor } = MARKER_CONFIGS[id]
  return (size * widthFactor * (size * heightFactor)) / 2
}

const height = (id: keyof typeof MARKER_CONFIGS) => getMarkerHalfHeight(id) * 2

describe("class diagram marker geometry", () => {
  it("draws both diamonds identically apart from the fill", () => {
    const { filled: _b, ...black } = MARKER_CONFIGS["black-rhombus"]
    const { filled: _w, ...white } = MARKER_CONFIGS["white-rhombus"]
    expect(black).toEqual(white)
    expect(MARKER_CONFIGS["black-rhombus"].filled).toBe(true)
    expect(MARKER_CONFIGS["white-rhombus"].filled).toBe(false)
  })

  it("gives the diamond at least the inheritance triangle's visual weight", () => {
    // draw.io puts the diamond at ~1.32x the triangle's area, Mermaid at 1.0x.
    expect(inkArea("black-rhombus")).toBeGreaterThanOrEqual(
      inkArea("white-triangle")
    )
  })

  it("keeps the diamond no taller than the inheritance triangle", () => {
    // Height is the extent perpendicular to the edge: how far a marker overhangs
    // the node border it points at.
    expect(height("black-rhombus")).toBeLessThanOrEqual(
      height("white-triangle")
    )
  })

  it("keeps the diamond's thickness in the band used by reference tools", () => {
    // draw.io 0.588 (diamondThin), PlantUML 0.667, Mermaid 0.706.
    const { widthFactor, heightFactor } = MARKER_CONFIGS["black-rhombus"]
    const aspect = heightFactor / widthFactor
    expect(aspect).toBeGreaterThanOrEqual(0.588)
    expect(aspect).toBeLessThanOrEqual(0.706)
  })

  it("keeps the diamond small enough to render unscaled in the edge-type dropdown", () => {
    // EdgeTypePreviewIcon shrinks markers whose half-height exceeds 11; only the
    // node-scale interface socket should need that.
    expect(getMarkerHalfHeight("black-rhombus")).toBeLessThanOrEqual(11)
  })
})
