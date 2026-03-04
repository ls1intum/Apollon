import { describe, it, expect } from "vitest"
import {
  parseDiagramType,
  mapFromReactFlowNodeToApollonNode,
  mapFromReactFlowEdgeToApollonEdge,
} from "@/utils/diagramTypeUtils"
import { UMLDiagramType } from "@/types/DiagramType"
import type { Node, Edge } from "@xyflow/react"

// ---------------------------------------------------------------------------
// parseDiagramType
// ---------------------------------------------------------------------------

describe("parseDiagramType", () => {
  it("returns the value if it is a valid UMLDiagramType", () => {
    expect(parseDiagramType("ClassDiagram")).toBe("ClassDiagram")
    expect(parseDiagramType("BPMN")).toBe("BPMN")
    expect(parseDiagramType("Flowchart")).toBe("Flowchart")
    expect(parseDiagramType("Sfc")).toBe("Sfc")
  })

  it("returns fallback for an invalid value", () => {
    expect(parseDiagramType("Invalid")).toBe("ClassDiagram")
  })

  it("returns fallback for undefined", () => {
    expect(parseDiagramType(undefined)).toBe("ClassDiagram")
  })

  it("returns fallback for null", () => {
    expect(parseDiagramType(null)).toBe("ClassDiagram")
  })

  it("returns fallback for a number", () => {
    expect(parseDiagramType(42)).toBe("ClassDiagram")
  })

  it("uses custom fallback", () => {
    expect(parseDiagramType("nope", UMLDiagramType.BPMN)).toBe("BPMN")
  })

  it("recognizes all valid diagram types", () => {
    const allTypes = Object.values(UMLDiagramType)
    for (const t of allTypes) {
      expect(parseDiagramType(t)).toBe(t)
    }
  })
})

// ---------------------------------------------------------------------------
// mapFromReactFlowNodeToApollonNode
// ---------------------------------------------------------------------------

describe("mapFromReactFlowNodeToApollonNode", () => {
  it("maps basic node fields correctly", () => {
    const node: Node = {
      id: "n1",
      position: { x: 10, y: 20 },
      data: { name: "Test" },
      type: "class",
      width: 200,
      height: 150,
      measured: { width: 180, height: 140 },
    } as Node
    const result = mapFromReactFlowNodeToApollonNode(node)
    expect(result.id).toBe("n1")
    expect(result.position).toEqual({ x: 10, y: 20 })
    expect(result.width).toBe(200)
    expect(result.height).toBe(150)
    expect(result.type).toBe("class")
    expect(result.data).toEqual({ name: "Test" })
    expect(result.measured).toEqual({ width: 180, height: 140 })
  })

  it("defaults width and height to 0 when undefined", () => {
    const node: Node = {
      id: "n2",
      position: { x: 0, y: 0 },
      data: {},
      type: "class",
    } as Node
    const result = mapFromReactFlowNodeToApollonNode(node)
    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
  })

  it("defaults measured to {width:0, height:0} when undefined", () => {
    const node: Node = {
      id: "n3",
      position: { x: 0, y: 0 },
      data: {},
      type: "class",
    } as Node
    const result = mapFromReactFlowNodeToApollonNode(node)
    expect(result.measured).toEqual({ width: 0, height: 0 })
  })

  it("includes parentId when present", () => {
    const node: Node = {
      id: "c",
      position: { x: 0, y: 0 },
      data: {},
      type: "class",
      parentId: "p",
    } as Node
    const result = mapFromReactFlowNodeToApollonNode(node)
    expect(result.parentId).toBe("p")
  })

  it("parentId is undefined when not present", () => {
    const node: Node = {
      id: "n",
      position: { x: 0, y: 0 },
      data: {},
      type: "class",
    } as Node
    const result = mapFromReactFlowNodeToApollonNode(node)
    expect(result.parentId).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// mapFromReactFlowEdgeToApollonEdge
// ---------------------------------------------------------------------------

describe("mapFromReactFlowEdgeToApollonEdge", () => {
  it("maps basic edge fields correctly", () => {
    const edge: Edge = {
      id: "e1",
      source: "s",
      target: "t",
      type: "ClassInheritance",
      sourceHandle: "sh",
      targetHandle: "th",
      data: {
        points: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
      },
    } as unknown as Edge
    const result = mapFromReactFlowEdgeToApollonEdge(edge)
    expect(result.id).toBe("e1")
    expect(result.source).toBe("s")
    expect(result.target).toBe("t")
    expect(result.type).toBe("ClassInheritance")
    expect(result.sourceHandle).toBe("sh")
    expect(result.targetHandle).toBe("th")
    expect(result.data.points).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ])
  })

  it("defaults handles to empty string when undefined", () => {
    const edge: Edge = {
      id: "e2",
      source: "s",
      target: "t",
      type: "ClassDependency",
      data: {},
    } as unknown as Edge
    const result = mapFromReactFlowEdgeToApollonEdge(edge)
    expect(result.sourceHandle).toBe("")
    expect(result.targetHandle).toBe("")
  })

  it("defaults points to empty array when undefined", () => {
    const edge: Edge = {
      id: "e3",
      source: "s",
      target: "t",
      type: "ClassDependency",
      data: {},
    } as unknown as Edge
    const result = mapFromReactFlowEdgeToApollonEdge(edge)
    expect(result.data.points).toEqual([])
  })

  it("defaults points to empty array when not an array", () => {
    const edge: Edge = {
      id: "e4",
      source: "s",
      target: "t",
      type: "ClassDependency",
      data: { points: "not-an-array" },
    } as unknown as Edge
    const result = mapFromReactFlowEdgeToApollonEdge(edge)
    expect(result.data.points).toEqual([])
  })

  it("preserves additional data properties", () => {
    const edge: Edge = {
      id: "e5",
      source: "s",
      target: "t",
      type: "ClassDependency",
      data: { points: [], custom: "value" },
    } as unknown as Edge
    const result = mapFromReactFlowEdgeToApollonEdge(edge)
    expect(result.data.custom).toBe("value")
  })
})
