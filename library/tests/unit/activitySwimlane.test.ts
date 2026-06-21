import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { dropElementConfigs, DROPS } from "@/constants"
import { UMLDiagramType } from "@/types"
import type { ActivitySwimlaneProps } from "@/types"
import {
  flipSwimlaneChildPosition,
  getLaneOffsets,
  laneIndexAtOffset,
  materializeLaneSizes,
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

  it("uses absolute sizes; the last lane absorbs the remainder", () => {
    // Resizing the swimlane must only change the last lane, not every separator:
    // the two fixed lanes keep 120/100 at any total width.
    const at400 = getLaneOffsets([{ size: 120 }, { size: 100 }, {}], 400)
    expect(at400.map((o) => o.extent)).toEqual([120, 100, 180])
    const at500 = getLaneOffsets([{ size: 120 }, { size: 100 }, {}], 500)
    // Only the last lane grew; the interior separators (120, 220) are unmoved.
    expect(at500.map((o) => o.extent)).toEqual([120, 100, 280])
    expect(at500.map((o) => o.start)).toEqual(at400.map((o) => o.start))
  })

  it("laneIndexAtOffset finds the lane containing a coordinate", () => {
    const offsets = getLaneOffsets([{ size: 120 }, { size: 100 }, {}], 400)
    expect(laneIndexAtOffset(offsets, 10)).toBe(0)
    expect(laneIndexAtOffset(offsets, 150)).toBe(1)
    expect(laneIndexAtOffset(offsets, 350)).toBe(2)
    expect(laneIndexAtOffset(offsets, 9999)).toBe(2)
  })

  it("materializeLaneSizes pins every lane's current extent", () => {
    const sized = materializeLaneSizes(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      300
    )
    expect(sized.map((l) => l.size)).toEqual([150, 150])
  })
})

describe("resizeLaneDivider", () => {
  const lanes = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ]

  it("moves the boundary in px, conserving the total (balanced)", () => {
    // 400px, two equal lanes (200/200); drag the divider +40px.
    const next = resizeLaneDivider(lanes, 0, 40, 400)
    expect(next[0].size).toBeCloseTo(240)
    expect(next[1].size).toBeCloseTo(160)
    expect((next[0].size ?? 0) + (next[1].size ?? 0)).toBeCloseTo(400)
  })

  it("clamps so neither lane shrinks below the minimum", () => {
    // Drag far past B's room: B floors at MIN_LANE_EXTENT (40), A takes the rest.
    const next = resizeLaneDivider(lanes, 0, 9999, 400)
    expect(next[0].size).toBeCloseTo(360)
    expect(next[1].size).toBeCloseTo(40)
  })

  it("ignores an out-of-range divider index", () => {
    expect(resizeLaneDivider(lanes, 1, 40, 400)).toBe(lanes)
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
