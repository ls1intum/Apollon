import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ErCrowsFootMarker } from "@/components/svgs/edges/ErCrowsFootMarker"
import {
  deriveErCfEdgeRender,
  getDefaultEdgeType,
  swapErCfCardinalities,
} from "@/utils"
import { CustomEdgeProps } from "@/edges/EdgeProps"

// A crow's-foot end marker = a "max" symbol at the entity (bar for one, a
// 3-line foot for many) plus a "min" symbol set back toward the line (bar for
// mandatory, circle for optional).
const POINT = { x: 50, y: 50 }
const renderMarker = (
  cardinality: Parameters<typeof ErCrowsFootMarker>[0]["cardinality"],
  direction = 0
) =>
  render(
    <svg>
      <ErCrowsFootMarker
        point={POINT}
        direction={direction}
        cardinality={cardinality}
      />
    </svg>
  )

const lineXs = (c: HTMLElement) =>
  [...c.querySelectorAll("line")].map((l) => Number(l.getAttribute("x1")))

describe("ErCrowsFootMarker composition", () => {
  it("draws two bars for exactly-one (||)", () => {
    const { container } = renderMarker("ExactlyOne")
    expect(container.querySelectorAll("line")).toHaveLength(2)
    expect(container.querySelectorAll("circle")).toHaveLength(0)
  })

  it("draws a bar and an optional circle for zero-or-one (o|)", () => {
    const { container } = renderMarker("ZeroOrOne")
    expect(container.querySelectorAll("line")).toHaveLength(1)
    expect(container.querySelectorAll("circle")).toHaveLength(1)
  })

  it("draws a crow's foot and a mandatory bar for one-or-many (|<)", () => {
    const { container } = renderMarker("OneOrMany")
    expect(container.querySelectorAll("line")).toHaveLength(4) // 3-line foot + bar
    expect(container.querySelectorAll("circle")).toHaveLength(0)
  })

  it("draws a crow's foot and an optional circle for zero-or-many (o<)", () => {
    const { container } = renderMarker("ZeroOrMany")
    expect(container.querySelectorAll("line")).toHaveLength(3)
    expect(container.querySelectorAll("circle")).toHaveLength(1)
  })
})

describe("ErCrowsFootMarker geometry", () => {
  // direction = 0 points into the entity along +x, so symbols extend back (−x).
  it("puts the max symbol at the entity and the min symbol further back", () => {
    const { container } = renderMarker("ExactlyOne")
    const xs = lineXs(container).sort((a, b) => a - b)
    // Max bar sits on the entity point; min bar is set back toward the line by
    // MIN_OFFSET_NEAR (= 9). Both bars are vertical (perpendicular to +x).
    expect(xs).toEqual([50 - 9, 50])
    // The max bar is a vertical segment of full height 2*BAR_HALF (= 12).
    const maxBar = [...container.querySelectorAll("line")].find(
      (l) => l.getAttribute("x1") === "50"
    )!
    expect(maxBar.getAttribute("x2")).toBe("50") // vertical
    const span = Math.abs(
      Number(maxBar.getAttribute("y1")) - Number(maxBar.getAttribute("y2"))
    )
    expect(span).toBe(12)
  })

  it("keeps the optional circle clear of the crow's foot", () => {
    const { container } = renderMarker("ZeroOrMany")
    const apexX = Math.min(...lineXs(container)) // foot apex is the furthest-back line point
    const circleX = Number(
      container.querySelector("circle")!.getAttribute("cx")
    )
    // The ring sits behind the foot apex, not on top of it.
    expect(circleX).toBeLessThan(apexX)
  })

  it("mirrors the layout for the opposite end (direction = π)", () => {
    const { container } = renderMarker("ExactlyOne", Math.PI)
    // Reversed direction puts the min bar on the +x side of the entity point.
    expect(Math.max(...lineXs(container))).toBeGreaterThan(POINT.x)
  })
})

describe("crow's-foot diagram wiring", () => {
  it("defaults a new edge to the crow's-foot relationship", () => {
    expect(getDefaultEdgeType("EntityRelationshipCrowsFoot")).toBe(
      "ErCfRelationship"
    )
  })
})

describe("deriveErCfEdgeRender", () => {
  const left = { x: 0, y: 0 }
  const right = { x: 10, y: 0 }
  const straight = "M 0 0 L 10 0" // horizontal source→target
  // L-shaped step path: leaves the source going DOWN, enters the target going RIGHT.
  const bent = "M 0 0 L 0 10 L 10 10"

  it("is dashed only when explicitly non-identifying", () => {
    const d = (id?: boolean) =>
      deriveErCfEdgeRender(
        id === undefined ? undefined : ({ identifying: id } as CustomEdgeProps),
        straight,
        left,
        right
      ).dashed
    expect(d(false)).toBe(true)
    expect(d(true)).toBe(false)
    // Undefined defaults to identifying (solid), matching the popover toggle.
    expect(d(undefined)).toBe(false)
  })

  it("orients each marker along the path's end segment (straight)", () => {
    const { source, target } = deriveErCfEdgeRender(
      undefined,
      straight,
      left,
      right
    )
    expect(target.direction).toBeCloseTo(0) // segment enters target going +x
    expect(source.direction).toBeCloseTo(Math.PI) // reverse of leaving the source
    expect(source.point).toEqual(left)
    expect(target.point).toEqual(right)
  })

  it("follows the path round a bend (markers track the step route)", () => {
    const { source, target } = deriveErCfEdgeRender(
      undefined,
      bent,
      left,
      right
    )
    // Last segment enters the target going +x; first segment leaves the source
    // going +y (down), so the marker points back up (−y).
    expect(target.direction).toBeCloseTo(0)
    expect(source.direction).toBeCloseTo(-Math.PI / 2)
  })

  it("maps source/target cardinality to the matching end, with defaults", () => {
    const withData = deriveErCfEdgeRender(
      {
        sourceCardinality: "OneOrMany",
        targetCardinality: "ZeroOrOne",
      } as CustomEdgeProps,
      straight,
      left,
      right
    )
    expect(withData.source.cardinality).toBe("OneOrMany")
    expect(withData.target.cardinality).toBe("ZeroOrOne")

    const defaults = deriveErCfEdgeRender(undefined, straight, left, right)
    expect(defaults.source.cardinality).toBe("ExactlyOne")
    expect(defaults.target.cardinality).toBe("ZeroOrMany")
  })
})

describe("swapErCfCardinalities", () => {
  it("exchanges the two ends so markers follow a Swap Ends", () => {
    expect(
      swapErCfCardinalities({
        sourceCardinality: "ExactlyOne",
        targetCardinality: "ZeroOrMany",
      } as CustomEdgeProps)
    ).toEqual({
      sourceCardinality: "ZeroOrMany",
      targetCardinality: "ExactlyOne",
    })
  })
})
