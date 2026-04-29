import { describe, expect, it } from "vitest"
import { diffModel } from "@/utils/diffModel"
import type { UMLModel } from "@/typings"

const blank: UMLModel = {
  version: "4.0.0",
  id: "diag-1",
  title: "Test",
  type: "ClassDiagram" as UMLModel["type"],
  nodes: [],
  edges: [],
  assessments: {},
}

function classNode(
  id: string,
  name: string,
  x = 0,
  y = 0
): UMLModel["nodes"][number] {
  return {
    id,
    width: 200,
    height: 100,
    type: "ClassRegular" as UMLModel["nodes"][number]["type"],
    position: { x, y },
    data: { name },
    measured: { width: 200, height: 100 },
  }
}

function classEdge(
  id: string,
  source: string,
  target: string,
  type: UMLModel["edges"][number]["type"] = "ClassAssociation" as UMLModel["edges"][number]["type"]
): UMLModel["edges"][number] {
  return {
    id,
    source,
    target,
    type,
    sourceHandle: "right",
    targetHandle: "left",
    data: { points: [] },
  }
}

describe("diffModel", () => {
  it("returns empty diff when models are identical", () => {
    const a: UMLModel = {
      ...blank,
      nodes: [classNode("n1", "Customer")],
      edges: [],
    }
    const diff = diffModel(a, a)
    expect(diff.totals.nodesAdded).toBe(0)
    expect(diff.totals.nodesRemoved).toBe(0)
    expect(diff.totals.nodesChanged).toBe(0)
  })

  it("detects added nodes", () => {
    const a = { ...blank, nodes: [classNode("n1", "Customer")] }
    const b = {
      ...blank,
      nodes: [classNode("n1", "Customer"), classNode("n2", "Order")],
    }
    const diff = diffModel(a, b)
    expect(diff.added.nodes).toHaveLength(1)
    expect(diff.added.nodes[0]?.id).toBe("n2")
    expect(diff.added.nodes[0]?.name).toBe("Order")
    expect(diff.totals.nodesAdded).toBe(1)
  })

  it("detects removed nodes", () => {
    const a = {
      ...blank,
      nodes: [classNode("n1", "Customer"), classNode("n2", "Order")],
    }
    const b = { ...blank, nodes: [classNode("n1", "Customer")] }
    const diff = diffModel(a, b)
    expect(diff.removed.nodes).toHaveLength(1)
    expect(diff.removed.nodes[0]?.id).toBe("n2")
    expect(diff.totals.nodesRemoved).toBe(1)
  })

  it("detects renamed nodes (data.name change)", () => {
    const a = { ...blank, nodes: [classNode("n1", "Customer")] }
    const b = { ...blank, nodes: [classNode("n1", "User")] }
    const diff = diffModel(a, b)
    expect(diff.changed.nodes).toHaveLength(1)
    expect(diff.changed.nodes[0]?.id).toBe("n1")
    expect(diff.changed.nodes[0]?.fields).toContain("data.name")
    expect(diff.changed.nodes[0]?.name).toBe("User") // prefers `after` name
  })

  it("detects moved nodes (position change)", () => {
    const a = { ...blank, nodes: [classNode("n1", "Customer", 0, 0)] }
    const b = { ...blank, nodes: [classNode("n1", "Customer", 100, 50)] }
    const diff = diffModel(a, b)
    expect(diff.changed.nodes).toHaveLength(1)
    expect(diff.changed.nodes[0]?.fields).toContain("position")
  })

  it("detects added edges", () => {
    const nodes = [classNode("n1", "A"), classNode("n2", "B")]
    const a = { ...blank, nodes }
    const b = { ...blank, nodes, edges: [classEdge("e1", "n1", "n2")] }
    const diff = diffModel(a, b)
    expect(diff.totals.edgesAdded).toBe(1)
    expect(diff.added.edges[0]?.id).toBe("e1")
  })

  it("detects removed edges", () => {
    const nodes = [classNode("n1", "A"), classNode("n2", "B")]
    const a = { ...blank, nodes, edges: [classEdge("e1", "n1", "n2")] }
    const b = { ...blank, nodes }
    const diff = diffModel(a, b)
    expect(diff.totals.edgesRemoved).toBe(1)
  })

  it("is order-invariant (input ordering does not affect result)", () => {
    const n1 = classNode("n1", "A")
    const n2 = classNode("n2", "B")
    const a = { ...blank, nodes: [n1, n2] }
    const b = { ...blank, nodes: [n2, n1] }
    const diff = diffModel(a, b)
    expect(diff.totals.nodesAdded).toBe(0)
    expect(diff.totals.nodesRemoved).toBe(0)
    expect(diff.totals.nodesChanged).toBe(0)
  })

  it("supports deeply nested data field changes", () => {
    const a = {
      ...blank,
      nodes: [
        {
          ...classNode("n1", "A"),
          data: { name: "A", attributes: ["x"] },
        },
      ],
    }
    const b = {
      ...blank,
      nodes: [
        {
          ...classNode("n1", "A"),
          data: { name: "A", attributes: ["x", "y"] },
        },
      ],
    }
    const diff = diffModel(a, b)
    expect(diff.changed.nodes).toHaveLength(1)
    expect(diff.changed.nodes[0]?.fields).toContain("data.attributes")
  })

  it("falls back to alternate name keys (label, title, text, content)", () => {
    const node = {
      ...classNode("n1", ""),
      data: { label: "MyClass" },
    }
    const a = { ...blank, nodes: [node] }
    const b = { ...blank, nodes: [] }
    const diff = diffModel(a, b)
    expect(diff.removed.nodes[0]?.name).toBe("MyClass")
  })

  it("classifies pure add+remove of independent nodes correctly", () => {
    const a = { ...blank, nodes: [classNode("n1", "Old")] }
    const b = { ...blank, nodes: [classNode("n2", "New")] }
    const diff = diffModel(a, b)
    expect(diff.totals.nodesAdded).toBe(1)
    expect(diff.totals.nodesRemoved).toBe(1)
    expect(diff.totals.nodesChanged).toBe(0)
  })

  it("totals align with detail arrays", () => {
    const a = {
      ...blank,
      nodes: [classNode("n1", "A"), classNode("n2", "B")],
      edges: [classEdge("e1", "n1", "n2")],
    }
    const b = {
      ...blank,
      nodes: [classNode("n1", "A-renamed"), classNode("n3", "C")],
      edges: [classEdge("e1", "n1", "n3")],
    }
    const diff = diffModel(a, b)
    expect(diff.totals.nodesAdded).toBe(diff.added.nodes.length)
    expect(diff.totals.nodesRemoved).toBe(diff.removed.nodes.length)
    expect(diff.totals.nodesChanged).toBe(diff.changed.nodes.length)
    expect(diff.totals.edgesAdded).toBe(diff.added.edges.length)
    expect(diff.totals.edgesRemoved).toBe(diff.removed.edges.length)
    expect(diff.totals.edgesChanged).toBe(diff.changed.edges.length)
  })
})
