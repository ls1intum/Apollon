import { describe, it, expect, vi } from "vitest"
import {
  getAllDescendants,
  getAllNodesToInclude,
  getRelevantEdges,
  getEdgesToRemove,
  createClipboardData,
  createNewNodeDataWithNewIds,
  materializeClipboardData,
  type ClipboardData,
} from "@/utils/copyPasteUtils"

import type { Node, Edge } from "@xyflow/react"

// Mock generateUUID to return predictable values; keep the rest of the barrel real.
vi.mock("@/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils")>()
  let counter = 0
  return {
    ...actual,
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
    const result = getRelevantEdges(["e1"], [], edges)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("e1")
  })

  it("carries an edge whose endpoints are both copied, even when unselected", () => {
    // Ctrl/Cmd+click selects nodes only — without this, duplicating two clicked
    // classes would drop the association between them.
    const edges = [makeEdge("e1", "a", "b"), makeEdge("outgoing", "a", "far")]
    const result = getRelevantEdges(["a", "b"], ["a", "b"], edges)
    expect(result.map((e) => e.id)).toEqual(["e1"])
  })

  it("returns empty array when no edges match", () => {
    const edges = [makeEdge("e1", "a", "b")]
    expect(getRelevantEdges(["nope"], [], edges)).toEqual([])
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
  it("carries a selected node's descendants, and the edges among them", () => {
    const nodes = [makeNode("p", 0, 0), makeNode("c", 10, 10, "p")]
    const edges = [makeEdge("e1", "p", "c")]
    const result = createClipboardData(["p"], nodes, edges)

    expect(result.nodes.map((n) => n.id)).toEqual(["p", "c"])
    expect(result.edges.map((e) => e.id)).toEqual(["e1"])
  })

  it("creates clipboard with empty selections", () => {
    const result = createClipboardData([], [], [])
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
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

// ---------------------------------------------------------------------------
// materializeClipboardData
// ---------------------------------------------------------------------------

describe("materializeClipboardData", () => {
  const makeClipboard = (nodes: Node[], edges: Edge[] = []): ClipboardData => ({
    nodes,
    edges,
  })

  it("produces a fresh, offset, selected copy with its edges remapped", () => {
    const edge = {
      ...makeEdge("e1", "a", "b"),
      data: { points: [{ x: 5, y: 5 }] },
    } as Edge
    const clip = makeClipboard(
      [
        {
          ...makeNode("a", 100, 100),
          data: { attributes: [{ id: "attr", name: "x" }] },
        } as Node,
        makeNode("b", 300, 100),
      ],
      [edge, makeEdge("dangling", "a", "not-copied")]
    )

    const result = materializeClipboardData(clip, 2)

    // Two pastes in: 100 + 2 × PASTE_OFFSET_PX. A zero offset would stack the
    // copy invisibly on top of its original.
    const [a, b] = result.nodes
    expect(a.position).toEqual({ x: 140, y: 140 })
    expect(b.position).toEqual({ x: 340, y: 140 })
    expect(a.selected).toBe(true)
    // Fresh ids throughout, nested attributes included — a collision would make
    // the copy and its original edit as one.
    expect(new Set([a.id, b.id, "a", "b"]).size).toBe(4)
    expect(
      (a.data as { attributes: { id: string }[] }).attributes[0].id
    ).not.toBe("attr")
    // An edge to a node that wasn't copied has no endpoint left to attach to.
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].source).toBe(a.id)
    expect(result.edges[0].target).toBe(b.id)
    // Waypoints are absolute, so they travel with the nodes — otherwise the
    // copy's edge routes back through the original.
    expect(result.edges[0].data?.points).toEqual([{ x: 45, y: 45 }])
    expect(result.newElementIds).toEqual([a.id, b.id, result.edges[0].id])
  })

  it("keeps a child where it sits in its parent, which carries the offset", () => {
    // Child positions are parent-relative: offsetting the child as well would
    // drift it 20px further into its own parent on every paste.
    const clip = makeClipboard([
      makeNode("p", 50, 50),
      makeNode("c", 10, 10, "p"),
    ])

    const result = materializeClipboardData(clip, 3)

    const parent = result.nodes.find((n) => !n.parentId)!
    const child = result.nodes.find((n) => n.parentId)!
    expect(child.parentId).toBe(parent.id)
    expect(parent.position).toEqual({ x: 110, y: 110 })
    expect(child.position).toEqual({ x: 10, y: 10 })
  })
})
