import { describe, it, expect } from "vitest"
import Ajv from "ajv"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { dropElementConfigs } from "@/constants"
import { UMLDiagramType } from "@/types"
import type { ActivitySwimlaneProps } from "@/types"

describe("activity swimlane — palette drop config", () => {
  const config = dropElementConfigs[UMLDiagramType.ActivityDiagram].find(
    (c) => c.type === "activitySwimlane"
  )

  it("registers a vertical swimlane whose lanes have unique ids and non-empty names", () => {
    expect(config).toBeDefined()
    const data = config!.defaultData as ActivitySwimlaneProps
    expect(data.orientation).toBe("vertical")
    expect(data.lanes.length).toBeGreaterThanOrEqual(2)
    expect(new Set(data.lanes.map((l) => l.id)).size).toBe(data.lanes.length)
    expect(data.lanes.every((l) => l.name.length > 0)).toBe(true)
  })
})

describe("activity swimlane — schema", () => {
  const schema = JSON.parse(
    readFileSync(
      join(import.meta.dirname, "../../schema/uml-model-4.schema.json"),
      "utf8"
    )
  )
  const validate = new Ajv({
    allowUnionTypes: true,
    strict: false,
  }).compile(schema)

  it("accepts the activitySwimlane node type in a persisted model", () => {
    const model = {
      version: "4.0.0",
      id: "d1",
      title: "Activity",
      type: "ActivityDiagram",
      nodes: [
        {
          id: "swimlane-1",
          type: "activitySwimlane",
          position: { x: 0, y: 0 },
          width: 400,
          height: 200,
          measured: { width: 400, height: 200 },
          data: {
            name: "",
            orientation: "vertical",
            lanes: [
              { id: "lane-1", name: "Customer" },
              { id: "lane-2", name: "System" },
            ],
          },
        },
      ],
      edges: [],
      assessments: {},
    }

    expect(validate(model) || JSON.stringify(validate.errors, null, 2)).toBe(
      true
    )
  })
})
