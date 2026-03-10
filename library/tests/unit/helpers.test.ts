import { describe, it, expect } from "vitest"
import {
  getAssessmentNameForArtemis,
  getEdgeAssessmentDataById,
  getNodeAssessmentDataByNodeElementId,
} from "@/utils/helpers"
import type {
  UMLModel,
  ApollonNode,
  ApollonEdge,
  DiagramEdgeType,
} from "@/typings"
import type { DiagramNodeType } from "@/nodes/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModel(overrides: Partial<UMLModel> = {}): UMLModel {
  return {
    version: "4.0.0",
    id: "model-1",
    title: "Test",
    type: "ClassDiagram",
    nodes: [],
    edges: [],
    assessments: {},
    ...overrides,
  } as UMLModel
}

function makeNode(overrides: Partial<ApollonNode>): ApollonNode {
  return overrides as unknown as ApollonNode
}

function makeEdge(
  overrides: Partial<ApollonEdge> & { type: string }
): ApollonEdge {
  return overrides as unknown as ApollonEdge
}

// ---------------------------------------------------------------------------
// getAssessmentNameForArtemis
// ---------------------------------------------------------------------------

describe("getAssessmentNameForArtemis", () => {
  it("returns name and type for a matching node", () => {
    const model = makeModel({
      nodes: [makeNode({ id: "n1", type: "class", data: { name: "MyClass" } })],
    })
    const result = getAssessmentNameForArtemis("n1", model)
    expect(result).toEqual({ name: "MyClass", type: "class" })
  })

  it("falls back to node type when data.name is missing", () => {
    const model = makeModel({
      nodes: [makeNode({ id: "n1", type: "class", data: {} })],
    })
    const result = getAssessmentNameForArtemis("n1", model)
    expect(result).toEqual({ name: "class", type: "class" })
  })

  it("falls back to 'Unnamed Node' when both data.name and type are falsy", () => {
    const model = makeModel({
      nodes: [
        makeNode({
          id: "n1",
          type: undefined as unknown as DiagramNodeType,
          data: {},
        }),
      ],
    })
    const result = getAssessmentNameForArtemis("n1", model)
    expect(result).toEqual({ name: "Unnamed Node", type: undefined })
  })

  it("returns edge name with type symbol for a matching edge", () => {
    const model = makeModel({
      nodes: [
        makeNode({ id: "s", type: "class", data: { name: "Source" } }),
        makeNode({ id: "t", type: "class", data: { name: "Target" } }),
      ],
      edges: [
        makeEdge({
          id: "e1",
          source: "s",
          target: "t",
          type: "ClassInheritance",
          data: {} as ApollonEdge["data"],
        }),
      ],
    })
    const result = getAssessmentNameForArtemis("e1", model)
    expect(result).toBeDefined()
    expect(result!.name).toContain("Source")
    expect(result!.name).toContain("Target")
    expect(result!.name).toContain("--▶") // inheritance symbol
    expect(result!.type).toBe("ClassInheritance")
  })

  it("returns attribute name in ParentName::attrName format", () => {
    const model = makeModel({
      nodes: [
        makeNode({
          id: "n1",
          type: "class",
          data: {
            name: "Person",
            attributes: [{ id: "a1", name: "age" }],
          },
        }),
      ],
    })
    const result = getAssessmentNameForArtemis("a1", model)
    expect(result).toEqual({ name: "Person::age", type: "attribute" })
  })

  it("returns method name in ParentName::methodName() format", () => {
    const model = makeModel({
      nodes: [
        makeNode({
          id: "n1",
          type: "class",
          data: {
            name: "Person",
            methods: [{ id: "m1", name: "getName" }],
          },
        }),
      ],
    })
    const result = getAssessmentNameForArtemis("m1", model)
    expect(result).toEqual({ name: "Person::getName()", type: "method" })
  })

  it("returns actionRow name in ParentName::actionRowName format", () => {
    const model = makeModel({
      nodes: [
        makeNode({
          id: "n1",
          type: "activity",
          data: {
            name: "Activity1",
            actionRows: [{ id: "ar1", name: "doSomething" }],
          },
        }),
      ],
    })
    const result = getAssessmentNameForArtemis("ar1", model)
    expect(result).toEqual({
      name: "Activity1::doSomething",
      type: "actionRow",
    })
  })

  it("returns undefined when element is not found", () => {
    const model = makeModel()
    expect(getAssessmentNameForArtemis("nonexistent", model)).toBeUndefined()
  })

  it("handles edge where source/target nodes are missing", () => {
    const model = makeModel({
      edges: [
        makeEdge({
          id: "e1",
          source: "missing-s",
          target: "missing-t",
          type: "ClassBidirectional",
          data: {} as ApollonEdge["data"],
        }),
      ],
    })
    const result = getAssessmentNameForArtemis("e1", model)
    expect(result).toBeDefined()
    expect(result!.name).toContain("<->")
    expect(result!.type).toBe("ClassBidirectional")
  })
})

// ---------------------------------------------------------------------------
// getEdgeAssessmentDataById
// ---------------------------------------------------------------------------

describe("getEdgeAssessmentDataById", () => {
  it("returns assessment data for an existing edge", () => {
    const model = makeModel({
      nodes: [
        makeNode({ id: "s", type: "class", data: { name: "A" } }),
        makeNode({ id: "t", type: "class", data: { name: "B" } }),
      ],
      edges: [
        makeEdge({
          id: "e1",
          source: "s",
          target: "t",
          type: "ClassDependency",
          data: {} as ApollonEdge["data"],
        }),
      ],
      assessments: {
        e1: {
          modelElementId: "e1",
          elementType: "ClassDependency",
          score: 1.5,
          feedback: "Good",
        },
      },
    })
    const result = getEdgeAssessmentDataById("e1", model)
    expect(result).toBeDefined()
    expect(result!.elementId).toBe("e1")
    expect(result!.score).toBe(1.5)
    expect(result!.feedback).toBe("Good")
    expect(result!.name).toContain("A")
    expect(result!.name).toContain("B")
    expect(result!.name).toContain("⋯⋯>") // dependency symbol
  })

  it("returns undefined when edge not found", () => {
    const model = makeModel({
      assessments: {
        e1: {
          modelElementId: "e1",
          elementType: "ClassDependency",
          score: 0,
        },
      },
    })
    expect(getEdgeAssessmentDataById("e1", model)).toBeUndefined()
  })

  it("returns undefined when assessment not found", () => {
    const model = makeModel({
      edges: [
        makeEdge({
          id: "e1",
          source: "s",
          target: "t",
          type: "ClassDependency",
          data: {} as ApollonEdge["data"],
        }),
      ],
    })
    expect(getEdgeAssessmentDataById("e1", model)).toBeUndefined()
  })

  it("defaults feedback to empty string when undefined", () => {
    const model = makeModel({
      nodes: [
        makeNode({ id: "s", type: "class", data: { name: "A" } }),
        makeNode({ id: "t", type: "class", data: { name: "B" } }),
      ],
      edges: [
        makeEdge({
          id: "e1",
          source: "s",
          target: "t",
          type: "ClassDependency",
          data: {} as ApollonEdge["data"],
        }),
      ],
      assessments: {
        e1: {
          modelElementId: "e1",
          elementType: "ClassDependency",
          score: 0,
        },
      },
    })
    const result = getEdgeAssessmentDataById("e1", model)
    expect(result!.feedback).toBe("")
  })
})

// ---------------------------------------------------------------------------
// getNodeAssessmentDataByNodeElementId
// ---------------------------------------------------------------------------

describe("getNodeAssessmentDataByNodeElementId", () => {
  it("returns assessment data for a matching node", () => {
    const model = makeModel({
      nodes: [makeNode({ id: "n1", type: "class", data: { name: "MyClass" } })],
      assessments: {
        n1: {
          modelElementId: "n1",
          elementType: "class",
          score: 2,
          feedback: "Well done",
        },
      },
    })
    const result = getNodeAssessmentDataByNodeElementId("n1", model)
    expect(result).toEqual({
      elementId: "n1",
      elementType: "class",
      name: "MyClass",
      feedback: "Well done",
      score: 2,
    })
  })

  it("returns assessment data for a matching attribute sub-element", () => {
    const model = makeModel({
      nodes: [
        makeNode({
          id: "n1",
          type: "class",
          data: {
            name: "Person",
            attributes: [{ id: "a1", name: "name" }],
          },
        }),
      ],
      assessments: {
        a1: {
          modelElementId: "a1",
          elementType: "attribute",
          score: 1,
        },
      },
    })
    const result = getNodeAssessmentDataByNodeElementId("a1", model)
    expect(result).toBeDefined()
    expect(result!.name).toBe("Person::name")
    expect(result!.feedback).toBe("")
  })

  it("returns assessment data for a matching method sub-element", () => {
    const model = makeModel({
      nodes: [
        makeNode({
          id: "n1",
          type: "class",
          data: {
            name: "Person",
            methods: [{ id: "m1", name: "walk" }],
          },
        }),
      ],
      assessments: {
        m1: {
          modelElementId: "m1",
          elementType: "method",
          score: 3,
        },
      },
    })
    const result = getNodeAssessmentDataByNodeElementId("m1", model)
    expect(result).toBeDefined()
    expect(result!.name).toBe("Person::walk()")
  })

  it("returns assessment data for a matching actionRow sub-element", () => {
    const model = makeModel({
      nodes: [
        makeNode({
          id: "n1",
          type: "activity",
          data: {
            name: "Activity",
            actionRows: [{ id: "ar1", name: "step" }],
          },
        }),
      ],
      assessments: {
        ar1: {
          modelElementId: "ar1",
          elementType: "actionRow",
          score: 0,
        },
      },
    })
    const result = getNodeAssessmentDataByNodeElementId("ar1", model)
    expect(result).toBeDefined()
    expect(result!.name).toBe("Activity::step")
  })

  it("returns undefined when no assessment exists", () => {
    const model = makeModel({
      nodes: [makeNode({ id: "n1", type: "class", data: { name: "X" } })],
    })
    expect(getNodeAssessmentDataByNodeElementId("n1", model)).toBeUndefined()
  })

  it("returns undefined when assessment exists but element not found anywhere", () => {
    const model = makeModel({
      assessments: {
        ghost: {
          modelElementId: "ghost",
          elementType: "unknown",
          score: 0,
        },
      },
    })
    expect(getNodeAssessmentDataByNodeElementId("ghost", model)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// getEdgeTypeSymbol (tested indirectly via edge name generation)
// ---------------------------------------------------------------------------

describe("getEdgeTypeSymbol (indirect)", () => {
  const symbolCases: [string, string][] = [
    ["ClassBidirectional", "<->"],
    ["ClassUnidirectional", "-->"],
    ["ClassAggregation", "--◇"],
    ["ClassInheritance", "--▶"],
    ["ClassDependency", "⋯⋯>"],
    ["ClassComposition", "--◆"],
    ["ActivityControlFlow", "-->"],
    ["UseCaseInclude", "-->"],
    ["UseCaseExtend", "-->"],
    ["UseCaseAssociation", "—-"],
    ["UseCaseGeneralization", "⇨"],
    ["ClassRealization", "⋯⋯▶"],
    ["ObjectLink", "<—>"],
  ]

  it.each(symbolCases)(
    "edge type %s produces symbol %s",
    (edgeType, expectedSymbol) => {
      const model = makeModel({
        nodes: [
          makeNode({ id: "s", type: "class", data: { name: "S" } }),
          makeNode({ id: "t", type: "class", data: { name: "T" } }),
        ],
        edges: [
          makeEdge({
            id: "e1",
            source: "s",
            target: "t",
            type: edgeType as DiagramEdgeType,
            data: {} as ApollonEdge["data"],
          }),
        ],
      })
      const result = getAssessmentNameForArtemis("e1", model)
      expect(result!.name).toContain(expectedSymbol)
    }
  )

  it("returns default symbol for unknown edge type", () => {
    const model = makeModel({
      nodes: [
        makeNode({ id: "s", type: "class", data: { name: "S" } }),
        makeNode({ id: "t", type: "class", data: { name: "T" } }),
      ],
      edges: [
        makeEdge({
          id: "e1",
          source: "s",
          target: "t",
          type: "SomethingUnknown",
          data: {} as ApollonEdge["data"],
        }),
      ],
    })
    const result = getAssessmentNameForArtemis("e1", model)
    expect(result!.name).toContain("—-")
  })
})
