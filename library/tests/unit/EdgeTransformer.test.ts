import { describe, it, expect } from "vitest"
import {
  hydrateEdgeData,
  transformEdges,
} from "@/services/migration/EdgeTransformer"
import {
  UMLDiagramType,
  type ApollonEdge,
  type DiagramEdgeType,
  type UMLModel,
} from "@/typings"

function makeEdge(overrides: Partial<ApollonEdge> = {}): ApollonEdge {
  return {
    id: "edge-1",
    source: "node-1",
    target: "node-2",
    type: "ClassUnidirectional" as DiagramEdgeType,
    sourceHandle: "right",
    targetHandle: "left",
    data: {
      label: "uses",
      points: [
        { x: 100, y: 200 },
        { x: 150, y: 200 },
        { x: 200, y: 300 },
      ],
    },
    ...overrides,
  }
}

function makeModel(edges: ApollonEdge[]): UMLModel {
  return {
    version: "4.0.0",
    id: "test-model",
    title: "Test",
    type: UMLDiagramType.ClassDiagram,
    nodes: [],
    edges,
    assessments: {},
  }
}

describe("EdgeTransformer", () => {
  describe("hydrateEdgeData", () => {
    it("leaves a clean edge untouched (same reference, no copy)", () => {
      const edge = makeEdge()
      expect(hydrateEdgeData(edge)).toBe(edge)
    })

    it("strips stale computedSegments while preserving points and not mutating the input", () => {
      const edge = makeEdge({
        data: {
          points: [{ x: 0, y: 0 }],
          computedSegments: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      })

      const result = hydrateEdgeData(edge)

      expect(result).not.toBe(edge)
      expect(result.data).not.toHaveProperty("computedSegments")
      expect(result.data.points).toEqual([{ x: 0, y: 0 }])
      // The original is left intact.
      expect(edge.data).toHaveProperty("computedSegments")
    })

    it("normalizes null/absent data to canonical edge data without throwing", () => {
      const malformed = makeEdge({
        data: null as unknown as ApollonEdge["data"],
      })

      expect(() => hydrateEdgeData(malformed)).not.toThrow()
      expect(hydrateEdgeData(malformed).data).toEqual({ points: [] })
    })

    it("hydrates missing or malformed legacy points", () => {
      const missing = makeEdge({
        data: { label: "legacy" } as ApollonEdge["data"],
      })
      const malformed = makeEdge({
        data: { points: "legacy" } as unknown as ApollonEdge["data"],
      })

      expect(hydrateEdgeData(missing).data).toEqual({
        label: "legacy",
        points: [],
      })
      expect(hydrateEdgeData(malformed).data).toEqual({ points: [] })
    })
  })

  describe("transformEdges", () => {
    it("returns a new model only when an edge was actually changed", () => {
      const model = makeModel([
        makeEdge({ id: "e1" }),
        makeEdge({
          id: "e2",
          data: { points: [], computedSegments: [{ x: 0, y: 0 }] },
        }),
      ])

      const result = transformEdges(model)

      expect(result).not.toBe(model)
      expect(result.edges[1].data).not.toHaveProperty("computedSegments")
      // The unchanged edge keeps its identity.
      expect(result.edges[0]).toBe(model.edges[0])
    })

    it("returns the same model when there is nothing to strip", () => {
      const model = makeModel([makeEdge()])
      expect(transformEdges(model)).toBe(model)
    })

    it("handles an empty edge array", () => {
      const model = makeModel([])
      expect(transformEdges(model)).toBe(model)
    })
  })
})
