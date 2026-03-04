import { describe, it, expect, vi } from "vitest"
import {
  calculateRelativePosition,
  getAllDescendants,
  getAllNodesToInclude,
  getRelevantEdges,
  buildParentChildRelations,
  getEdgesToRemove,
  createClipboardData,
  createNewNodeDataWithNewIds,
} from "@/utils/copyPasteUtils"
import type { Node, Edge } from "@xyflow/react"

// Mock generateUUID to return predictable values
vi.mock("@/utils", () => {
  let counter = 0
  return {
    generateUUID: () => `uuid-${++counter}`,
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, x = 0, y = 0, parentId?: string): Node {
  return { id, position: { x, y }, data: {}, parentId } as Node
}

function makeEdge(id: string, source: string, target: string): Edge {
  return { id, source, target, data: {} } as Edge
}

// ---------------------------------------------------------------------------
// calculateRelativePosition
// ---------------------------------------------------------------------------

describe("calculateRelativePosition", () => {
  it("returns the difference between child and parent positions", () => {
    const child = makeNode("c", 150, 200)
    const parent = makeNode("p", 100, 50)
    expect(calculateRelativePosition(child, parent)).toEqual({
      x: 50,
      y: 150,
    })
  })

  it("returns negative values when child is above/left of parent", () => {
    const child = makeNode("c", 10, 10)
    const parent = makeNode("p", 100, 100)
    expect(calculateRelativePosition(child, parent)).toEqual({
      x: -90,
      y: -90,
    })
  })

  it("returns zero when same position", () => {
    const child = makeNode("c", 50, 50)
    const parent = makeNode("p", 50, 50)
    expect(calculateRelativePosition(child, parent)).toEqual({ x: 0, y: 0 })
  })
})

// ---------------------------------------------------------------------------
// getAllDescendants
// ---------------------------------------------------------------------------

describe("getAllDescendants", () => {
  it("returns empty array when no children exist", () => {
    const nodes = [makeNode("a"), makeNode("b")]
    expect(getAllDescendants(["a"], nodes)).toEqual([])
  })

  it("finds direct children", () => {
    const nodes = [
      makeNode("p"),
      makeNode("c1", 0, 0, "p"),
      makeNode("c2", 0, 0, "p"),
    ]
    const descendants = getAllDescendants(["p"], nodes)
    expect(descendants).toHaveLength(2)
    expect(descendants.map((n) => n.id).sort()).toEqual(["c1", "c2"])
  })

  it("finds grandchildren recursively", () => {
    const nodes = [
      makeNode("p"),
      makeNode("c", 0, 0, "p"),
      makeNode("gc", 0, 0, "c"),
    ]
    const descendants = getAllDescendants(["p"], nodes)
    expect(descendants).toHaveLength(2)
    expect(descendants.map((n) => n.id)).toContain("gc")
  })

  it("returns empty for empty nodeIds", () => {
    const nodes = [makeNode("a")]
    expect(getAllDescendants([], nodes)).toEqual([])
  })

  it("handles multiple starting nodeIds", () => {
    const nodes = [
      makeNode("p1"),
      makeNode("p2"),
      makeNode("c1", 0, 0, "p1"),
      makeNode("c2", 0, 0, "p2"),
    ]
    const descendants = getAllDescendants(["p1", "p2"], nodes)
    expect(descendants).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// getAllNodesToInclude
// ---------------------------------------------------------------------------

describe("getAllNodesToInclude", () => {
  it("includes selected nodes and their descendants", () => {
    const nodes = [makeNode("p"), makeNode("c", 0, 0, "p"), makeNode("other")]
    const result = getAllNodesToInclude(["p"], nodes)
    expect(result.map((n) => n.id).sort()).toEqual(["c", "p"])
  })

  it("returns only selected nodes when no descendants exist", () => {
    const nodes = [makeNode("a"), makeNode("b")]
    const result = getAllNodesToInclude(["a"], nodes)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("a")
  })

  it("returns empty for empty selectedIds", () => {
    const nodes = [makeNode("a")]
    expect(getAllNodesToInclude([], nodes)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getRelevantEdges
// ---------------------------------------------------------------------------

describe("getRelevantEdges", () => {
  it("returns edges matching selectedElementIds", () => {
    const edges = [makeEdge("e1", "a", "b"), makeEdge("e2", "c", "d")]
    const result = getRelevantEdges(["e1"], edges)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("e1")
  })

  it("returns empty array when no edges match", () => {
    const edges = [makeEdge("e1", "a", "b")]
    expect(getRelevantEdges(["nope"], edges)).toEqual([])
  })

  it("returns empty array for empty selectedElementIds", () => {
    const edges = [makeEdge("e1", "a", "b")]
    expect(getRelevantEdges([], edges)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// buildParentChildRelations
// ---------------------------------------------------------------------------

describe("buildParentChildRelations", () => {
  it("builds relations for child nodes whose parentId is in nodeIds", () => {
    const parent = makeNode("p", 10, 20)
    const child = makeNode("c", 30, 50, "p")
    const result = buildParentChildRelations([parent, child], ["p", "c"])
    expect(result).toEqual([
      {
        parentId: "p",
        childId: "c",
        relativePosition: { x: 20, y: 30 },
      },
    ])
  })

  it("skips nodes whose parentId is not in nodeIds", () => {
    const child = makeNode("c", 0, 0, "external")
    const result = buildParentChildRelations([child], ["c"])
    expect(result).toEqual([])
  })

  it("returns empty for nodes with no parents", () => {
    const a = makeNode("a")
    const b = makeNode("b")
    expect(buildParentChildRelations([a, b], ["a", "b"])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getEdgesToRemove
// ---------------------------------------------------------------------------

describe("getEdgesToRemove", () => {
  it("includes directly selected edges", () => {
    const edges = [makeEdge("e1", "a", "b"), makeEdge("e2", "c", "d")]
    const result = getEdgesToRemove(["e1"], [], edges)
    expect(result.has("e1")).toBe(true)
    expect(result.has("e2")).toBe(false)
  })

  it("includes edges connected to expanded nodes", () => {
    const edges = [makeEdge("e1", "a", "b"), makeEdge("e2", "c", "d")]
    const result = getEdgesToRemove([], ["a"], edges)
    expect(result.has("e1")).toBe(true)
    expect(result.has("e2")).toBe(false)
  })

  it("includes edges where expanded node is target", () => {
    const edges = [makeEdge("e1", "x", "y")]
    const result = getEdgesToRemove([], ["y"], edges)
    expect(result.has("e1")).toBe(true)
  })

  it("deduplicates when an edge is both selected and connected", () => {
    const edges = [makeEdge("e1", "a", "b")]
    const result = getEdgesToRemove(["e1"], ["a"], edges)
    expect(result.size).toBe(1)
  })

  it("returns empty set when nothing matches", () => {
    const edges = [makeEdge("e1", "a", "b")]
    const result = getEdgesToRemove([], [], edges)
    expect(result.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// createClipboardData
// ---------------------------------------------------------------------------

describe("createClipboardData", () => {
  it("creates clipboard data with nodes, edges, and relations", () => {
    const nodes = [makeNode("p", 0, 0), makeNode("c", 10, 10, "p")]
    const edges = [makeEdge("e1", "p", "c")]
    const result = createClipboardData(["p", "e1"], nodes, edges)

    expect(result.nodes).toHaveLength(2) // p + descendant c
    expect(result.edges).toHaveLength(1)
    expect(result.parentChildRelations.length).toBeGreaterThanOrEqual(1)
    expect(result.timestamp).toBeGreaterThan(0)
  })

  it("creates clipboard with empty selections", () => {
    const result = createClipboardData([], [], [])
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
    expect(result.parentChildRelations).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// createNewNodeDataWithNewIds
// ---------------------------------------------------------------------------

describe("createNewNodeDataWithNewIds", () => {
  it("returns null/undefined as-is", () => {
    expect(createNewNodeDataWithNewIds(null)).toBeNull()
    expect(createNewNodeDataWithNewIds(undefined)).toBeUndefined()
  })

  it("generates new UUIDs for attributes", () => {
    const data = {
      name: "MyClass",
      attributes: [
        { id: "old-1", name: "attr1" },
        { id: "old-2", name: "attr2" },
      ],
    }
    const result = createNewNodeDataWithNewIds(data)
    expect(result.attributes).toHaveLength(2)
    expect(result.attributes[0].id).not.toBe("old-1")
    expect(result.attributes[0].name).toBe("attr1")
    expect(result.attributes[1].id).not.toBe("old-2")
  })

  it("generates new UUIDs for methods", () => {
    const data = {
      methods: [{ id: "old-m", name: "doStuff" }],
    }
    const result = createNewNodeDataWithNewIds(data)
    expect(result.methods[0].id).not.toBe("old-m")
    expect(result.methods[0].name).toBe("doStuff")
  })

  it("generates new UUIDs for actionRows", () => {
    const data = {
      actionRows: [{ id: "old-ar", name: "step" }],
    }
    const result = createNewNodeDataWithNewIds(data)
    expect(result.actionRows[0].id).not.toBe("old-ar")
    expect(result.actionRows[0].name).toBe("step")
  })

  it("preserves data without sub-elements unchanged", () => {
    const data = { name: "Simple", value: 42 }
    const result = createNewNodeDataWithNewIds(data)
    expect(result.name).toBe("Simple")
    expect(result.value).toBe(42)
  })

  it("does not modify the original data object", () => {
    const data = {
      attributes: [{ id: "original", name: "a" }],
    }
    createNewNodeDataWithNewIds(data)
    expect(data.attributes[0].id).toBe("original")
  })
})
