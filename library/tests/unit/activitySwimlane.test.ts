import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { dropElementConfigs } from "@/constants"
import { UMLDiagramType } from "@/types"
import type { ActivitySwimlaneProps } from "@/types"
import { flipSwimlaneChildPosition } from "@/utils"

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
