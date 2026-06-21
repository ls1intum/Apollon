import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { dropElementConfigs, DROPS } from "@/constants"
import { UMLDiagramType } from "@/types"
import type { ActivitySwimlaneProps } from "@/types"
import {
  flipSwimlaneChildPosition,
  getLaneOffsets,
  laneFractions,
  resizeLaneDivider,
} from "@/utils"

describe("activity swimlane — registration", () => {
  it("is registered in the Activity palette with a renderable default", () => {
    const config = dropElementConfigs[UMLDiagramType.ActivityDiagram].find(
      (c) => c.type === "activitySwimlane"
    )
    expect(config).toBeDefined()
    // The SVG and popover assume at least one lane to divide the frame.
    const data = config!.defaultData as ActivitySwimlaneProps
    expect(data.lanes.length).toBeGreaterThanOrEqual(1)
  })

  it("is included in the published model schema's node-type enum", () => {
    // Guards against forgetting to regenerate the schema (pnpm gen:schema)
    // when the node type is added — otherwise saved models fail to validate.
    const schema = JSON.parse(
      readFileSync(
        join(import.meta.dirname, "../../schema/uml-model-4.schema.json"),
        "utf8"
      )
    )
    expect(schema.definitions.DiagramNodeType.enum).toContain(
      "activitySwimlane"
    )
  })

  it("keeps every Activity palette item near the default size", () => {
    // The sidebar shares one Math.min(scale) across the palette, so an oversized
    // item shrinks every sibling. Pin that invariant so it can't regress.
    for (const config of dropElementConfigs[UMLDiagramType.ActivityDiagram]) {
      expect(config.width).toBeLessThanOrEqual(DROPS.DEFAULT_ELEMENT_WIDTH * 2)
      expect(config.height).toBeLessThanOrEqual(DROPS.DEFAULT_ELEMENT_WIDTH * 2)
    }
  })
})

describe("lane geometry", () => {
  it("divides the axis equally when no lane has a size", () => {
    const offsets = getLaneOffsets([{}, {}, {}], 300)
    expect(offsets).toEqual([
      { start: 0, extent: 100 },
      { start: 100, extent: 100 },
      { start: 200, extent: 100 },
    ])
  })

  it("respects per-lane sizes and normalizes them", () => {
    // sizes 1:3 of a 400px axis -> 100 / 300, regardless of absolute scale.
    const offsets = getLaneOffsets([{ size: 0.25 }, { size: 0.75 }], 400)
    expect(offsets).toEqual([
      { start: 0, extent: 100 },
      { start: 100, extent: 300 },
    ])
  })

  it("laneFractions always sums to 1", () => {
    const sum = laneFractions([{ size: 2 }, { size: 1 }, {}]).reduce(
      (a, b) => a + b,
      0
    )
    expect(sum).toBeCloseTo(1)
  })
})

describe("resizeLaneDivider", () => {
  const lanes = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ]

  it("moves the boundary, conserving the total (balanced)", () => {
    const next = resizeLaneDivider(lanes, 0, 0.1, 0.05)
    expect(next[0].size).toBeCloseTo(0.6)
    expect(next[1].size).toBeCloseTo(0.4)
    expect((next[0].size ?? 0) + (next[1].size ?? 0)).toBeCloseTo(1)
  })

  it("clamps so neither lane shrinks below the minimum", () => {
    const next = resizeLaneDivider(lanes, 0, 0.9, 0.1)
    expect(next[0].size).toBeCloseTo(0.9) // capped: B can't go below 0.1
    expect(next[1].size).toBeCloseTo(0.1)
  })

  it("ignores an out-of-range divider index", () => {
    expect(resizeLaneDivider(lanes, 1, 0.1, 0.05)).toBe(lanes)
  })
})

describe("flipSwimlaneChildPosition", () => {
  it("transposes a child that comfortably fits the swapped frame", () => {
    // 20x20 child well inside a 440x280 -> 280x440 flip: pure transpose.
    expect(
      flipSwimlaneChildPosition(
        { position: { x: 100, y: 40 }, width: 20, height: 20 },
        280,
        440
      )
    ).toEqual({ x: 40, y: 100 })
  })

  it("clamps a wide child that would overflow the new cross-axis edge", () => {
    // The real bug: a 150-wide action near the right of a 440x280 swimlane.
    // Transposed corner (150,360) would put its right edge at 300 > 280.
    const flipped = flipSwimlaneChildPosition(
      { position: { x: 360, y: 150 }, width: 150, height: 50 },
      280,
      440
    )
    expect(flipped.x + 150).toBeLessThanOrEqual(280)
    expect(flipped.y + 50).toBeLessThanOrEqual(440)
    expect(flipped.x).toBeGreaterThanOrEqual(0)
  })

  it("clamps a child that would overflow the new bottom edge", () => {
    // position.x (400) becomes the transposed corner.y; clamp into [0, 440-50].
    const flipped = flipSwimlaneChildPosition(
      { position: { x: 400, y: 10 }, width: 50, height: 50 },
      280,
      440
    )
    expect(flipped.y).toBe(390)
  })

  it("never strands a child outside a child-larger-than-frame edge case", () => {
    const flipped = flipSwimlaneChildPosition(
      { position: { x: 10, y: 10 }, width: 999, height: 999 },
      280,
      440
    )
    expect(flipped).toEqual({ x: 0, y: 0 })
  })
})
