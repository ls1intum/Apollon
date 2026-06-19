import { describe, it, expect } from "vitest"
import type { UMLModel } from "@tumaet/apollon"
import {
  assertValidNodeGeometry,
  InvalidModelGeometryError,
} from "../services/node-geometry.js"

const node = (over: Record<string, unknown> = {}) => ({
  id: "n1",
  type: "class",
  position: { x: 0, y: 0 },
  width: 160,
  height: 60,
  measured: { width: 160, height: 60 },
  data: { name: "X" },
  ...over,
})

const model = (nodes: unknown[]): UMLModel =>
  ({
    version: "4.0.0",
    id: "d",
    title: "t",
    type: "ClassDiagram",
    nodes,
    edges: [],
    assessments: {},
  }) as UMLModel

describe("assertValidNodeGeometry", () => {
  it("passes nodes with real positive dimensions", () => {
    expect(() => assertValidNodeGeometry(model([node()]))).not.toThrow()
  })

  it.each([
    ["missing width", { width: undefined }],
    ["zero width (the `?? 100` gap)", { width: 0 }],
    ["NaN height", { height: NaN }],
    ["missing measured", { measured: undefined }],
    ["zero measured height", { measured: { width: 160, height: 0 } }],
  ])(
    "throws InvalidModelGeometryError on %s, naming the node",
    (_label, over) => {
      expect(() => assertValidNodeGeometry(model([node(over)]))).toThrow(
        InvalidModelGeometryError
      )
      try {
        assertValidNodeGeometry(model([node(over)]))
      } catch (e) {
        expect((e as InvalidModelGeometryError).code).toBe(
          "INVALID_MODEL_GEOMETRY"
        )
        expect((e as Error).message).toContain('"n1"')
      }
    }
  )
})
