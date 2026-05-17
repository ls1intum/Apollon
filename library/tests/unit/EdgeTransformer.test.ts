import { describe, it, expect } from "vitest"
import {
  hydrateEdgeData,
  transformEdges,
  validateEdgeMigration,
} from "@/services/migration/EdgeTransformer"
import type { ApollonEdge, UMLModel } from "@/typings"

function makeLegacyEdge(overrides: Partial<ApollonEdge> = {}): ApollonEdge {
  return {
    id: "edge-1",
    source: "node-1",
    target: "node-2",
    type: "ClassUnidirectional" as any,
    sourceHandle: "right",
    targetHandle: "left",
    data: {
      label: "uses",
      sourceMultiplicity: "1",
      targetMultiplicity: "*",
      sourceRole: "",
      targetRole: "",
      isManuallyLayouted: false,
      points: [
        { x: 100, y: 200 },
        { x: 150, y: 200 },
        { x: 150, y: 300 },
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
    type: "ClassDiagram" as any,
    nodes: [],
    edges,
    assessments: {},
  }
}

describe("EdgeTransformer", () => {
  describe("hydrateEdgeData", () => {
    it("injects userWaypoints and routingMode into legacy edge data", () => {
      const legacy = makeLegacyEdge()
      const hydrated = hydrateEdgeData(legacy)

      expect(hydrated.data.userWaypoints).toEqual([])
      expect(hydrated.data.routingMode).toBe("auto")
    })

    it("preserves legacy points array as fallback", () => {
      const legacy = makeLegacyEdge()
      const hydrated = hydrateEdgeData(legacy)

      expect(hydrated.data.points).toEqual([
        { x: 100, y: 200 },
        { x: 150, y: 200 },
        { x: 150, y: 300 },
        { x: 200, y: 300 },
      ])
    })

    it("sets routingMode to 'manual' for manually layouted edges", () => {
      const legacy = makeLegacyEdge({
        data: {
          isManuallyLayouted: true,
          points: [],
        },
      })
      const hydrated = hydrateEdgeData(legacy)

      expect(hydrated.data.routingMode).toBe("manual")
    })

    it("does not re-hydrate already migrated edges", () => {
      const migrated = makeLegacyEdge({
        data: {
          userWaypoints: [{ x: 50, y: 50 }],
          routingMode: "manual",
        },
      })
      const result = hydrateEdgeData(migrated)

      // Should return the same object reference (no-op)
      expect(result).toBe(migrated)
    })

    it("strips stale computed geometry from migrated edges", () => {
      const migrated = makeLegacyEdge({
        data: {
          userWaypoints: [{ x: 50, y: 50 }],
          routingMode: "manual",
          computedSegments: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      })

      const result = hydrateEdgeData(migrated)

      expect(result).not.toBe(migrated)
      expect(result.data).not.toHaveProperty("computedSegments")
      expect(result.data.userWaypoints).toEqual([{ x: 50, y: 50 }])
      expect(result.data.routingMode).toBe("manual")
    })

    it("does not mutate the original edge", () => {
      const legacy = makeLegacyEdge()
      const original = { ...legacy.data }
      hydrateEdgeData(legacy)

      // Original data should be unchanged
      expect(legacy.data).toEqual(original)
    })
  })

  describe("transformEdges", () => {
    it("hydrates all edges in a model", () => {
      const model = makeModel([
        makeLegacyEdge({ id: "e1" }),
        makeLegacyEdge({ id: "e2" }),
        makeLegacyEdge({ id: "e3" }),
      ])

      const result = transformEdges(model)

      for (const edge of result.edges) {
        expect(edge.data.userWaypoints).toEqual([])
        expect(edge.data.routingMode).toBe("auto")
      }
    })

    it("returns same model if all edges already migrated", () => {
      const model = makeModel([
        makeLegacyEdge({
          data: {
            userWaypoints: [],
            routingMode: "auto",
          },
        }),
      ])

      const result = transformEdges(model)
      expect(result).toBe(model)
    })

    it("handles empty edge array", () => {
      const model = makeModel([])
      const result = transformEdges(model)
      expect(result).toBe(model)
    })
  })

  describe("validateEdgeMigration", () => {
    it("returns empty array for valid model", () => {
      const model = makeModel([
        makeLegacyEdge({
          data: { userWaypoints: [], routingMode: "auto" },
        }),
      ])
      const result = transformEdges(model)
      expect(validateEdgeMigration(result)).toEqual([])
    })

    it("identifies edges with missing userWaypoints", () => {
      const model = makeModel([makeLegacyEdge({ id: "bad-edge" })])
      const failures = validateEdgeMigration(model)
      expect(failures).toContain("bad-edge")
    })
  })
})
