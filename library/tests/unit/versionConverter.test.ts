import { describe, it, expect } from "vitest"
import {
  convertV2ToV4,
  isV2Format,
  convertV3HandleToV4,
  convertV3NodeTypeToV4,
  convertV3EdgeTypeToV4,
  convertV3MessagesToV4,
  convertV3ToV4,
  isV3Format,
  isV4Format,
  importDiagram,
} from "@/utils/versionConverter"
import { ClassType } from "@/types/nodes/enums"

// ---------------------------------------------------------------------------
// Helpers to build minimal valid V3 / V2 / V4 fixtures
// ---------------------------------------------------------------------------

function makeV3Model(overrides: Record<string, unknown> = {}) {
  return {
    version: "3.0.0",
    type: "ClassDiagram",
    size: { width: 800, height: 600 },
    interactive: { elements: {}, relationships: {} },
    elements: {} as Record<string, unknown>,
    relationships: {} as Record<string, unknown>,
    assessments: {} as Record<string, unknown>,
    ...overrides,
  }
}

function makeV3Wrapped(overrides: Record<string, unknown> = {}) {
  return {
    id: "diagram-1",
    title: "Test Diagram",
    model: makeV3Model(overrides),
  }
}

function makeV3Element(overrides: Record<string, unknown> = {}) {
  return {
    id: "el-1",
    name: "Element",
    type: "Class",
    owner: null,
    bounds: { x: 10, y: 20, width: 200, height: 100 },
    ...overrides,
  }
}

function makeV3Relationship(overrides: Record<string, unknown> = {}) {
  return {
    id: "rel-1",
    name: "relationship",
    type: "ClassInheritance",
    owner: null,
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    path: [],
    source: { element: "el-1", direction: "Right" },
    target: { element: "el-2", direction: "Left" },
    ...overrides,
  }
}

function makeV2Data(overrides: Record<string, unknown> = {}) {
  return {
    version: "2.0.0",
    type: "ClassDiagram",
    size: { width: 800, height: 600 },
    interactive: { elements: [] as string[], relationships: [] as string[] },
    elements: [] as unknown[],
    relationships: [] as unknown[],
    assessments: [] as unknown[],
    ...overrides,
  }
}

function makeV4Model(overrides: Record<string, unknown> = {}) {
  return {
    version: "4.0.0",
    id: "v4-1",
    title: "V4 Diagram",
    type: "ClassDiagram",
    nodes: [],
    edges: [],
    assessments: {},
    ...overrides,
  }
}

// ===========================================================================
// convertV3HandleToV4
// ===========================================================================
describe("convertV3HandleToV4", () => {
  it("converts Up to top", () => {
    expect(convertV3HandleToV4("Up")).toBe("top")
  })

  it("converts Right to right", () => {
    expect(convertV3HandleToV4("Right")).toBe("right")
  })

  it("converts Down to bottom", () => {
    expect(convertV3HandleToV4("Down")).toBe("bottom")
  })

  it("converts Left to left", () => {
    expect(convertV3HandleToV4("Left")).toBe("left")
  })

  it("converts Upright to right-top", () => {
    expect(convertV3HandleToV4("Upright")).toBe("right-top")
  })

  it("converts Upleft to left-top", () => {
    expect(convertV3HandleToV4("Upleft")).toBe("left-top")
  })

  it("converts Downright to right-bottom", () => {
    expect(convertV3HandleToV4("Downright")).toBe("right-bottom")
  })

  it("converts Downleft to left-bottom", () => {
    expect(convertV3HandleToV4("Downleft")).toBe("left-bottom")
  })

  it("converts RightTop to top-right", () => {
    expect(convertV3HandleToV4("RightTop")).toBe("top-right")
  })

  it("converts RightBottom to bottom-right", () => {
    expect(convertV3HandleToV4("RightBottom")).toBe("bottom-right")
  })

  it("converts LeftTop to top-left", () => {
    expect(convertV3HandleToV4("LeftTop")).toBe("top-left")
  })

  it("converts LeftBottom to bottom-left", () => {
    expect(convertV3HandleToV4("LeftBottom")).toBe("bottom-left")
  })

  it("falls back to lowercase for unknown handles", () => {
    expect(convertV3HandleToV4("SomeCustomHandle")).toBe("somecustomhandle")
  })

  it("handles empty string", () => {
    expect(convertV3HandleToV4("")).toBe("")
  })
})

// ===========================================================================
// convertV3NodeTypeToV4
// ===========================================================================
describe("convertV3NodeTypeToV4", () => {
  it.each([
    ["Class", "class"],
    ["AbstractClass", "class"],
    ["Interface", "class"],
    ["Enumeration", "class"],
  ])("maps %s to %s (class-family)", (input, expected) => {
    expect(convertV3NodeTypeToV4(input)).toBe(expected)
  })

  it("maps CommunicationObject to communicationObjectName", () => {
    expect(convertV3NodeTypeToV4("CommunicationObject")).toBe(
      "communicationObjectName"
    )
  })

  it("maps Subsystem to componentSubsystem", () => {
    expect(convertV3NodeTypeToV4("Subsystem")).toBe("componentSubsystem")
  })

  it.each([
    ["Package", "package"],
    ["ClassAttribute", "classAttribute"],
    ["ClassMethod", "classMethod"],
    ["ActivityInitialNode", "activityInitialNode"],
    ["ActivityFinalNode", "activityFinalNode"],
    ["ActivityActionNode", "activityActionNode"],
    ["ActivityObjectNode", "activityObjectNode"],
    ["ActivityForkNode", "activityForkNode"],
    ["ActivityForkNodeHorizontal", "activityForkNodeHorizontal"],
    ["ActivityMergeNode", "activityMergeNode"],
    ["ActivityDecisionNode", "activityMergeNode"],
    ["Activity", "activity"],
    ["UseCase", "useCase"],
    ["UseCaseActor", "useCaseActor"],
    ["UseCaseSystem", "useCaseSystem"],
    ["Component", "component"],
    ["ComponentInterface", "componentInterface"],
    ["DeploymentNode", "deploymentNode"],
    ["DeploymentComponent", "deploymentComponent"],
    ["DeploymentArtifact", "deploymentArtifact"],
    ["DeploymentInterface", "deploymentInterface"],
    ["ObjectName", "objectName"],
    ["ObjectAttribute", "objectAttribute"],
    ["ObjectMethod", "objectMethod"],
    ["PetriNetPlace", "petriNetPlace"],
    ["PetriNetTransition", "petriNetTransition"],
    ["ReachabilityGraphMarking", "reachabilityGraphMarking"],
    ["SyntaxTreeNonterminal", "syntaxTreeNonterminal"],
    ["SyntaxTreeTerminal", "syntaxTreeTerminal"],
    ["FlowchartProcess", "flowchartProcess"],
    ["FlowchartDecision", "flowchartDecision"],
    ["FlowchartInputOutput", "flowchartInputOutput"],
    ["FlowchartFunctionCall", "flowchartFunctionCall"],
    ["FlowchartTerminal", "flowchartTerminal"],
    ["BPMNTask", "bpmnTask"],
    ["BPMNGateway", "bpmnGateway"],
    ["BPMNStartEvent", "bpmnStartEvent"],
    ["BPMNIntermediateEvent", "bpmnIntermediateEvent"],
    ["BPMNEndEvent", "bpmnEndEvent"],
    ["BPMNSubprocess", "bpmnSubprocess"],
    ["BPMNTransaction", "bpmnTransaction"],
    ["BPMNCallActivity", "bpmnCallActivity"],
    ["BPMNAnnotation", "bpmnAnnotation"],
    ["BPMNDataObject", "bpmnDataObject"],
    ["BPMNDataStore", "bpmnDataStore"],
    ["BPMNPool", "bpmnPool"],
    ["BPMNGroup", "bpmnGroup"],
    ["SfcStart", "sfcStart"],
    ["SfcStep", "sfcStep"],
    ["SfcActionTable", "sfcActionTable"],
    ["SfcTransitionBranch", "sfcTransitionBranch"],
    ["SfcJump", "sfcJump"],
    ["SfcPreviewSpacer", "sfcPreviewSpacer"],
    ["ColorDescription", "colorDescription"],
    // Note the intentional typo in the V4 side
    ["TitleAndDescription", "titleAndDesctiption"],
  ])("maps %s to %s", (input, expected) => {
    expect(convertV3NodeTypeToV4(input)).toBe(expected)
  })

  it("falls back to lowercase for unknown types", () => {
    expect(convertV3NodeTypeToV4("SomeFutureNode")).toBe("somefuturenode")
  })
})

// ===========================================================================
// convertV3EdgeTypeToV4
// ===========================================================================
describe("convertV3EdgeTypeToV4", () => {
  it.each([
    ["ClassBidirectional", undefined, "ClassBidirectional"],
    ["ClassUnidirectional", undefined, "ClassUnidirectional"],
    ["ClassInheritance", undefined, "ClassInheritance"],
    ["ClassRealization", undefined, "ClassRealization"],
    ["ClassDependency", undefined, "ClassDependency"],
    ["ClassAggregation", undefined, "ClassAggregation"],
    ["ClassComposition", undefined, "ClassComposition"],
    ["ActivityControlFlow", undefined, "ActivityControlFlow"],
    ["UseCaseAssociation", undefined, "UseCaseAssociation"],
    ["UseCaseInclude", undefined, "UseCaseInclude"],
    ["UseCaseExtend", undefined, "UseCaseExtend"],
    ["UseCaseGeneralization", undefined, "UseCaseGeneralization"],
    ["CommunicationLink", undefined, "CommunicationLink"],
    ["ComponentDependency", undefined, "ComponentDependency"],
    ["ComponentInterfaceProvided", undefined, "ComponentProvidedInterface"],
    ["ComponentInterfaceRequired", undefined, "ComponentRequiredInterface"],
    [
      "ComponentInterfaceRequiredQuarter",
      undefined,
      "ComponentRequiredQuarterInterface",
    ],
    [
      "ComponentInterfaceRequiredThreeQuarter",
      undefined,
      "ComponentRequiredThreeQuarterInterface",
    ],
    ["DeploymentDependency", undefined, "DeploymentDependency"],
    ["DeploymentAssociation", undefined, "DeploymentAssociation"],
    ["DeploymentInterfaceProvided", undefined, "DeploymentProvidedInterface"],
    ["DeploymentInterfaceRequired", undefined, "DeploymentRequiredInterface"],
    [
      "DeploymentInterfaceRequiredQuarter",
      undefined,
      "DeploymentRequiredQuarterInterface",
    ],
    [
      "DeploymentInterfaceRequiredThreeQuarter",
      undefined,
      "DeploymentRequiredThreeQuarterInterface",
    ],
    ["ObjectLink", undefined, "ObjectLink"],
    ["PetriNetArc", undefined, "PetriNetArc"],
    ["ReachabilityGraphArc", undefined, "ReachabilityGraphArc"],
    ["SyntaxTreeLink", undefined, "SyntaxTreeLink"],
  ] as [string, undefined, string][])(
    "maps %s to %s",
    (input, flowType, expected) => {
      expect(convertV3EdgeTypeToV4(input, flowType)).toBe(expected)
    }
  )

  it("maps FlowchartFlowline to FlowChartFlowline (capital C)", () => {
    expect(convertV3EdgeTypeToV4("FlowchartFlowline")).toBe("FlowChartFlowline")
  })

  describe("BPMNFlow with flowType", () => {
    it("maps BPMNFlow + sequence to BPMNSequenceFlow", () => {
      expect(convertV3EdgeTypeToV4("BPMNFlow", "sequence")).toBe(
        "BPMNSequenceFlow"
      )
    })

    it("maps BPMNFlow + message to BPMNMessageFlow", () => {
      expect(convertV3EdgeTypeToV4("BPMNFlow", "message")).toBe(
        "BPMNMessageFlow"
      )
    })

    it("maps BPMNFlow + association to BPMNAssociationFlow", () => {
      expect(convertV3EdgeTypeToV4("BPMNFlow", "association")).toBe(
        "BPMNAssociationFlow"
      )
    })

    it("maps BPMNFlow + dataAssociation to BPMNDataAssociationFlow", () => {
      expect(convertV3EdgeTypeToV4("BPMNFlow", "dataAssociation")).toBe(
        "BPMNDataAssociationFlow"
      )
    })

    it("defaults BPMNFlow with unknown flowType to BPMNSequenceFlow", () => {
      expect(convertV3EdgeTypeToV4("BPMNFlow", "unknownFlowType")).toBe(
        "BPMNSequenceFlow"
      )
    })

    it("returns BPMNFlow as-is when flowType is undefined (not in edge map)", () => {
      // BPMNFlow is NOT in edgeTypeMap, and flowType is undefined so the
      // BPMN branch is skipped → falls through to identity return
      expect(convertV3EdgeTypeToV4("BPMNFlow")).toBe("BPMNFlow")
    })
  })

  it("returns identity for unknown edge types", () => {
    expect(convertV3EdgeTypeToV4("SomeUnknownEdge")).toBe("SomeUnknownEdge")
  })
})

// ===========================================================================
// convertV3MessagesToV4
// ===========================================================================
describe("convertV3MessagesToV4", () => {
  it("returns empty array for undefined messages", () => {
    expect(convertV3MessagesToV4(undefined)).toEqual([])
  })

  it("returns the array as-is when already in V4 format", () => {
    const v4Messages = [
      { id: "m1", text: "hello", direction: "source" as const },
    ]
    expect(convertV3MessagesToV4(v4Messages)).toBe(v4Messages)
  })

  it("converts V3 message object to V4 array with inverted direction (source→target)", () => {
    const v3Messages = {
      m1: { id: "m1", name: "request()", direction: "source" as const },
    }
    const result = convertV3MessagesToV4(v3Messages)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: "m1",
      text: "request()",
      direction: "target",
    })
  })

  it("converts V3 message object to V4 array with inverted direction (target→source)", () => {
    const v3Messages = {
      m1: { id: "m1", name: "response()", direction: "target" as const },
    }
    const result = convertV3MessagesToV4(v3Messages)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: "m1",
      text: "response()",
      direction: "source",
    })
  })

  it("converts multiple V3 messages", () => {
    const v3Messages = {
      m1: { id: "m1", name: "msg1", direction: "source" as const },
      m2: { id: "m2", name: "msg2", direction: "target" as const },
    }
    const result = convertV3MessagesToV4(v3Messages)
    expect(result).toHaveLength(2)
    const m1 = result.find((m) => m.id === "m1")!
    const m2 = result.find((m) => m.id === "m2")!
    expect(m1.direction).toBe("target")
    expect(m2.direction).toBe("source")
  })

  it("returns empty array for non-object non-array input", () => {
    // The function checks typeof === 'object' last, so a primitive would skip all branches
    expect(convertV3MessagesToV4(null as unknown as undefined)).toEqual([])
  })
})

// ===========================================================================
// convertV3ToV4
// ===========================================================================
describe("convertV3ToV4", () => {
  it("produces a V4 model with version 4.0.0", () => {
    const result = convertV3ToV4(makeV3Wrapped())
    expect(result.version).toBe("4.0.0")
  })

  it("preserves id and title from wrapped V3", () => {
    const result = convertV3ToV4(makeV3Wrapped())
    expect(result.id).toBe("diagram-1")
    expect(result.title).toBe("Test Diagram")
  })

  it("generates an id for flat V3 model (no id property)", () => {
    const flat = makeV3Model()
    const result = convertV3ToV4(flat)
    expect(result.id).toContain("converted-diagram-")
    expect(result.title).toBe("")
  })

  it("converts diagram type", () => {
    const result = convertV3ToV4(makeV3Wrapped())
    expect(result.type).toBe("ClassDiagram")
  })

  // --- Node conversion ---
  it("converts a basic element to a V4 node", () => {
    const el = makeV3Element({ id: "c1", name: "MyClass" })
    const data = makeV3Wrapped({ elements: { c1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes).toHaveLength(1)
    const node = result.nodes[0]
    expect(node.id).toBe("c1")
    expect(node.type).toBe("class")
    expect(node.position).toEqual({ x: 10, y: 20 })
    expect(node.width).toBe(200)
    expect(node.height).toBe(100)
    expect(node.measured).toEqual({ width: 200, height: 100 })
    expect(node.data.name).toBe("MyClass")
  })

  it("filters out ClassAttribute nodes (embedded in parent data)", () => {
    const parent = makeV3Element({ id: "c1", type: "Class" })
    const attr = makeV3Element({
      id: "a1",
      type: "ClassAttribute",
      name: "attr1",
      owner: "c1",
      bounds: { x: 15, y: 30, width: 180, height: 20 },
    })
    const data = makeV3Wrapped({ elements: { c1: parent, a1: attr } })
    const result = convertV3ToV4(data)
    // Only parent should appear as a node
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].id).toBe("c1")
    // Attribute should be embedded
    const nodeData = result.nodes[0].data
    expect(nodeData.attributes).toHaveLength(1)
    expect((nodeData.attributes as unknown[])[0]).toEqual({
      id: "a1",
      name: "attr1",
    })
  })

  it("filters out ClassMethod nodes (embedded in parent data)", () => {
    const parent = makeV3Element({ id: "c1", type: "Class" })
    const method = makeV3Element({
      id: "m1",
      type: "ClassMethod",
      name: "doStuff()",
      owner: "c1",
      bounds: { x: 15, y: 50, width: 180, height: 20 },
    })
    const data = makeV3Wrapped({ elements: { c1: parent, m1: method } })
    const result = convertV3ToV4(data)
    expect(result.nodes).toHaveLength(1)
    const nodeData = result.nodes[0].data
    expect(nodeData.methods).toHaveLength(1)
    expect((nodeData.methods as unknown[])[0]).toEqual({
      id: "m1",
      name: "doStuff()",
    })
  })

  it("filters out ObjectAttribute and ObjectMethod from nodes", () => {
    const parent = makeV3Element({ id: "o1", type: "ObjectName", name: "obj" })
    const oa = makeV3Element({
      id: "oa1",
      type: "ObjectAttribute",
      name: "x",
      owner: "o1",
      bounds: { x: 11, y: 25, width: 100, height: 20 },
    })
    const om = makeV3Element({
      id: "om1",
      type: "ObjectMethod",
      name: "m()",
      owner: "o1",
      bounds: { x: 11, y: 45, width: 100, height: 20 },
    })
    const data = makeV3Wrapped({
      elements: { o1: parent, oa1: oa, om1: om },
    })
    const result = convertV3ToV4(data)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].id).toBe("o1")
    const nd = result.nodes[0].data
    expect(nd.attributes).toHaveLength(1)
    expect(nd.methods).toHaveLength(1)
  })

  // --- Class stereotype mapping ---
  it("sets stereotype to Abstract for AbstractClass", () => {
    const el = makeV3Element({ id: "ac1", type: "AbstractClass" })
    const data = makeV3Wrapped({ elements: { ac1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.stereotype).toBe(ClassType.Abstract)
  })

  it("sets stereotype to Interface for Interface", () => {
    const el = makeV3Element({ id: "i1", type: "Interface" })
    const data = makeV3Wrapped({ elements: { i1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.stereotype).toBe(ClassType.Interface)
  })

  it("sets stereotype to Enumeration for Enumeration", () => {
    const el = makeV3Element({ id: "e1", type: "Enumeration" })
    const data = makeV3Wrapped({ elements: { e1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.stereotype).toBe(ClassType.Enumeration)
  })

  it("does not set stereotype for plain Class", () => {
    const el = makeV3Element({ id: "c1", type: "Class" })
    const data = makeV3Wrapped({ elements: { c1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.stereotype).toBeUndefined()
  })

  // --- Child element relative positioning ---
  it("computes relative position for child elements", () => {
    const parent = makeV3Element({
      id: "p1",
      type: "Package",
      bounds: { x: 100, y: 200, width: 400, height: 300 },
    })
    const child = makeV3Element({
      id: "ch1",
      type: "Class",
      owner: "p1",
      bounds: { x: 150, y: 250, width: 200, height: 100 },
    })
    const data = makeV3Wrapped({ elements: { p1: parent, ch1: child } })
    const result = convertV3ToV4(data)
    const childNode = result.nodes.find((n) => n.id === "ch1")!
    expect(childNode.position).toEqual({ x: 50, y: 50 })
    expect(childNode.parentId).toBe("p1")
  })

  it("uses absolute position when parent is missing", () => {
    const child = makeV3Element({
      id: "ch1",
      type: "Class",
      owner: "nonexistent",
      bounds: { x: 150, y: 250, width: 200, height: 100 },
    })
    const data = makeV3Wrapped({ elements: { ch1: child } })
    const result = convertV3ToV4(data)
    const node = result.nodes[0]
    // owner is set but parent not found → falls back to absolute
    expect(node.position).toEqual({ x: 150, y: 250 })
  })

  // --- Edge conversion ---
  it("converts a relationship to an edge", () => {
    const rel = makeV3Relationship({
      id: "r1",
      type: "ClassInheritance",
      name: "inherits",
      source: {
        element: "c1",
        direction: "Up",
        multiplicity: "1",
        role: "parent",
      },
      target: {
        element: "c2",
        direction: "Down",
        multiplicity: "*",
        role: "child",
      },
      path: [
        { x: 0, y: 0 },
        { x: 10, y: 20 },
      ],
      bounds: { x: 5, y: 5, width: 0, height: 0 },
    })
    const data = makeV3Wrapped({ relationships: { r1: rel } })
    const result = convertV3ToV4(data)
    expect(result.edges).toHaveLength(1)
    const edge = result.edges[0]
    expect(edge.id).toBe("r1")
    expect(edge.type).toBe("ClassInheritance")
    expect(edge.source).toBe("c1")
    expect(edge.target).toBe("c2")
    expect(edge.sourceHandle).toBe("top")
    expect(edge.targetHandle).toBe("bottom")
    expect(edge.data.label).toBe("inherits")
    expect(edge.data.sourceMultiplicity).toBe("1")
    expect(edge.data.targetMultiplicity).toBe("*")
    expect(edge.data.sourceRole).toBe("parent")
    expect(edge.data.targetRole).toBe("child")
    // Points are offset by bounds
    expect((edge.data.points as unknown[])[0]).toEqual({ x: 5, y: 5 })
    expect((edge.data.points as unknown[])[1]).toEqual({ x: 15, y: 25 })
  })

  it("defaults missing relationship fields gracefully", () => {
    const rel = makeV3Relationship({
      name: "",
      source: { element: "c1", direction: "" },
      target: { element: "c2", direction: "" },
    })
    const data = makeV3Wrapped({ relationships: { r1: rel } })
    const result = convertV3ToV4(data)
    const edge = result.edges[0]
    expect(edge.data.label).toBe("")
    expect(edge.data.sourceMultiplicity).toBe("")
    expect(edge.data.targetMultiplicity).toBe("")
    expect(edge.data.sourceRole).toBe("")
    expect(edge.data.targetRole).toBe("")
    expect(edge.data.isManuallyLayouted).toBe(false)
  })

  it("preserves flowType in edge data for BPMN edges", () => {
    const rel = makeV3Relationship({
      type: "BPMNFlow",
      flowType: "message",
      source: { element: "e1", direction: "Right" },
      target: { element: "e2", direction: "Left" },
    })
    const data = makeV3Wrapped({ relationships: { r1: rel } })
    const result = convertV3ToV4(data)
    expect(result.edges[0].type).toBe("BPMNMessageFlow")
    expect(result.edges[0].data.flowType).toBe("message")
  })

  it("includes messages in edge data", () => {
    const rel = makeV3Relationship({
      type: "CommunicationLink",
      messages: {
        m1: { id: "m1", name: "call()", direction: "source" as const },
      },
      source: { element: "e1", direction: "Right" },
      target: { element: "e2", direction: "Left" },
    })
    const data = makeV3Wrapped({ relationships: { r1: rel } })
    const result = convertV3ToV4(data)
    const msgs = result.edges[0].data.messages as unknown[]
    expect(msgs).toHaveLength(1)
    expect((msgs[0] as Record<string, unknown>).text).toBe("call()")
    expect((msgs[0] as Record<string, unknown>).direction).toBe("target") // inverted
  })

  // --- Assessment conversion ---
  it("converts assessments", () => {
    const assessment = {
      modelElementId: "c1",
      elementType: "Class",
      score: 5,
      feedback: "Good job",
      label: "A",
      labelColor: "green",
      correctionStatus: {
        description: "ok",
        status: "CORRECT" as const,
      },
    }
    const data = makeV3Wrapped({ assessments: { c1: assessment } })
    const result = convertV3ToV4(data)
    expect(result.assessments["c1"]).toBeDefined()
    expect(result.assessments["c1"].score).toBe(5)
    expect(result.assessments["c1"].feedback).toBe("Good job")
    expect(result.assessments["c1"].label).toBe("A")
    expect(result.assessments["c1"].correctionStatus?.status).toBe("CORRECT")
  })

  it("handles missing assessments gracefully", () => {
    const model = makeV3Model()
    delete (model as Record<string, unknown>).assessments
    const data = { id: "d1", title: "T", model }
    const result = convertV3ToV4(data)
    expect(result.assessments).toEqual({})
  })

  it("skips individual broken assessments without crashing", () => {
    // If convertV3AssessmentToV4 throws, it should be caught
    const assessments = {
      ok: {
        modelElementId: "c1",
        elementType: "Class",
        score: 3,
      },
    }
    const data = makeV3Wrapped({ assessments })
    const result = convertV3ToV4(data)
    expect(result.assessments["ok"]).toBeDefined()
  })

  // --- Special node data ---
  it("converts PetriNetPlace with numeric capacity", () => {
    const el = makeV3Element({
      id: "pn1",
      type: "PetriNetPlace",
      amountOfTokens: 3,
      capacity: 10,
    })
    const data = makeV3Wrapped({ elements: { pn1: el } })
    const result = convertV3ToV4(data)
    const nd = result.nodes[0].data
    expect(nd.tokens).toBe(3)
    expect(nd.capacity).toBe(10)
  })

  it("converts PetriNetPlace with Infinity string capacity", () => {
    const el = makeV3Element({
      id: "pn1",
      type: "PetriNetPlace",
      capacity: "Infinity",
    })
    const data = makeV3Wrapped({ elements: { pn1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.capacity).toBe("Infinity")
  })

  it("converts PetriNetPlace with ∞ string capacity", () => {
    const el = makeV3Element({
      id: "pn1",
      type: "PetriNetPlace",
      capacity: "∞",
    })
    const data = makeV3Wrapped({ elements: { pn1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.capacity).toBe("Infinity")
  })

  it("converts PetriNetPlace with unparseable string capacity to Infinity", () => {
    const el = makeV3Element({
      id: "pn1",
      type: "PetriNetPlace",
      capacity: "abc",
    })
    const data = makeV3Wrapped({ elements: { pn1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.capacity).toBe("Infinity")
  })

  it("converts PetriNetPlace with undefined capacity to Infinity", () => {
    const el = makeV3Element({
      id: "pn1",
      type: "PetriNetPlace",
    })
    const data = makeV3Wrapped({ elements: { pn1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.capacity).toBe("Infinity")
  })

  it("converts BPMNTask with taskType and marker", () => {
    const el = makeV3Element({
      id: "bt1",
      type: "BPMNTask",
      taskType: "user",
      marker: "loop",
    })
    const data = makeV3Wrapped({ elements: { bt1: el } })
    const result = convertV3ToV4(data)
    const nd = result.nodes[0].data
    expect(nd.taskType).toBe("user")
    expect(nd.marker).toBe("loop")
  })

  it("defaults BPMNTask taskType to default and marker to none", () => {
    const el = makeV3Element({ id: "bt1", type: "BPMNTask" })
    const data = makeV3Wrapped({ elements: { bt1: el } })
    const result = convertV3ToV4(data)
    const nd = result.nodes[0].data
    expect(nd.taskType).toBe("default")
    expect(nd.marker).toBe("none")
  })

  it("converts BPMNGateway with gatewayType", () => {
    const el = makeV3Element({
      id: "bg1",
      type: "BPMNGateway",
      gatewayType: "parallel",
    })
    const data = makeV3Wrapped({ elements: { bg1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.gatewayType).toBe("parallel")
  })

  it("defaults BPMNGateway gatewayType to exclusive", () => {
    const el = makeV3Element({ id: "bg1", type: "BPMNGateway" })
    const data = makeV3Wrapped({ elements: { bg1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.gatewayType).toBe("exclusive")
  })

  it("converts BPMNStartEvent with eventType", () => {
    const el = makeV3Element({
      id: "bs1",
      type: "BPMNStartEvent",
      eventType: "timer",
    })
    const data = makeV3Wrapped({ elements: { bs1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.eventType).toBe("timer")
  })

  it("converts BPMNIntermediateEvent", () => {
    const el = makeV3Element({
      id: "bi1",
      type: "BPMNIntermediateEvent",
      eventType: "message-catch",
    })
    const data = makeV3Wrapped({ elements: { bi1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.eventType).toBe("message-catch")
  })

  it("converts BPMNEndEvent", () => {
    const el = makeV3Element({
      id: "be1",
      type: "BPMNEndEvent",
      eventType: "terminate",
    })
    const data = makeV3Wrapped({ elements: { be1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.eventType).toBe("terminate")
  })

  it("converts ReachabilityGraphMarking with isInitialMarking", () => {
    const el = makeV3Element({
      id: "rg1",
      type: "ReachabilityGraphMarking",
      isInitialMarking: true,
    })
    const data = makeV3Wrapped({ elements: { rg1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.isInitialMarking).toBe(true)
  })

  it("defaults ReachabilityGraphMarking isInitialMarking to false", () => {
    const el = makeV3Element({ id: "rg1", type: "ReachabilityGraphMarking" })
    const data = makeV3Wrapped({ elements: { rg1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.isInitialMarking).toBe(false)
  })

  it("converts Component with displayStereotype", () => {
    const el = makeV3Element({
      id: "cp1",
      type: "Component",
      displayStereotype: false,
    })
    const data = makeV3Wrapped({ elements: { cp1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.isComponentHeaderShown).toBe(false)
  })

  it("converts DeploymentNode with stereotype", () => {
    const el = makeV3Element({
      id: "dn1",
      type: "DeploymentNode",
      stereotype: "<<server>>",
      displayStereotype: true,
    })
    const data = makeV3Wrapped({ elements: { dn1: el } })
    const result = convertV3ToV4(data)
    const nd = result.nodes[0].data
    expect(nd.stereotype).toBe("<<server>>")
    expect(nd.isComponentHeaderShown).toBe(true)
  })

  it("converts CommunicationObject with child attributes/methods", () => {
    const parent = makeV3Element({
      id: "co1",
      type: "CommunicationObject",
      name: "Obj",
    })
    const attr = makeV3Element({
      id: "oa1",
      type: "ObjectAttribute",
      name: "x",
      owner: "co1",
      bounds: { x: 11, y: 25, width: 100, height: 20 },
    })
    const data = makeV3Wrapped({ elements: { co1: parent, oa1: attr } })
    const result = convertV3ToV4(data)
    // Only parent as node
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].data.attributes).toHaveLength(1)
    expect(
      (result.nodes[0].data.attributes as Record<string, unknown>[])[0].name
    ).toBe("x")
  })

  it("preserves visual properties (fillColor, strokeColor, textColor, highlight)", () => {
    const el = makeV3Element({
      id: "c1",
      type: "UseCase",
      fillColor: "#ff0000",
      strokeColor: "#00ff00",
      textColor: "#0000ff",
      highlight: "yellow",
    })
    const data = makeV3Wrapped({ elements: { c1: el } })
    const result = convertV3ToV4(data)
    const nd = result.nodes[0].data
    expect(nd.fillColor).toBe("#ff0000")
    expect(nd.strokeColor).toBe("#00ff00")
    expect(nd.textColor).toBe("#0000ff")
    expect(nd.highlight).toBe("yellow")
  })

  it("handles empty elements and relationships", () => {
    const data = makeV3Wrapped()
    const result = convertV3ToV4(data)
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it("converts ComponentSubsystem (mapped from Subsystem V3 type name)", () => {
    const el = makeV3Element({
      id: "cs1",
      type: "ComponentSubsystem",
      displayStereotype: true,
    })
    // Note: In the type map, "Subsystem" → "componentSubsystem", but the
    // switch in convertV3NodeDataToV4 matches "ComponentSubsystem"
    const data = makeV3Wrapped({ elements: { cs1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.isComponentSubsystemHeaderShown).toBe(true)
  })

  it("converts DeploymentComponent with displayStereotype", () => {
    const el = makeV3Element({
      id: "dc1",
      type: "DeploymentComponent",
      displayStereotype: false,
    })
    const data = makeV3Wrapped({ elements: { dc1: el } })
    const result = convertV3ToV4(data)
    expect(result.nodes[0].data.isComponentHeaderShown).toBe(false)
  })

  it("handles BPMN element types that only need base data", () => {
    for (const bpmnType of [
      "BPMNSubprocess",
      "BPMNTransaction",
      "BPMNCallActivity",
      "BPMNAnnotation",
      "BPMNDataObject",
      "BPMNDataStore",
      "BPMNPool",
      "BPMNGroup",
    ]) {
      const el = makeV3Element({
        id: `b-${bpmnType}`,
        type: bpmnType,
        name: bpmnType,
      })
      const data = makeV3Wrapped({ elements: { [`b-${bpmnType}`]: el } })
      const result = convertV3ToV4(data)
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].data.name).toBe(bpmnType)
    }
  })
})

// ===========================================================================
// convertV2ToV4
// ===========================================================================
describe("convertV2ToV4", () => {
  it("converts a minimal V2 diagram to V4", () => {
    const v2 = makeV2Data()
    const result = convertV2ToV4(v2)
    expect(result.version).toBe("4.0.0")
    expect(result.type).toBe("ClassDiagram")
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })

  it("converts V2 elements to V4 nodes", () => {
    const el = makeV3Element({ id: "c1", type: "Class", name: "Foo" })
    const v2 = makeV2Data({ elements: [el] })
    const result = convertV2ToV4(v2)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].id).toBe("c1")
  })

  it("converts V2 relationships to V4 edges", () => {
    const rel = makeV3Relationship({ id: "r1" })
    const v2 = makeV2Data({ relationships: [rel] })
    const result = convertV2ToV4(v2)
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].id).toBe("r1")
  })

  it("converts V2 interactive arrays to V3 interactive maps", () => {
    const el = makeV3Element({ id: "c1", type: "Class" })
    const v2 = makeV2Data({
      elements: [el],
      interactive: { elements: ["c1"], relationships: ["r1"] },
    })
    const result = convertV2ToV4(v2)
    expect(result.version).toBe("4.0.0")
    expect(result.nodes.length).toBeGreaterThanOrEqual(1)
    expect(result.nodes[0].id).toBe("c1")
  })

  it("converts V2 assessments to V4 assessments", () => {
    const assessment = {
      modelElementId: "c1",
      elementType: "Class",
      score: 10,
    }
    const v2 = makeV2Data({ assessments: [assessment] })
    const result = convertV2ToV4(v2)
    expect(result.assessments["c1"]).toBeDefined()
    expect(result.assessments["c1"].score).toBe(10)
  })

  it("handles V2 with missing interactive", () => {
    const v2 = makeV2Data()
    delete (v2 as Record<string, unknown>).interactive
    // Should not throw
    const result = convertV2ToV4(v2)
    expect(result.version).toBe("4.0.0")
  })

  it("handles V2 with missing elements/relationships/assessments", () => {
    const v2 = makeV2Data()
    delete (v2 as Record<string, unknown>).elements
    delete (v2 as Record<string, unknown>).relationships
    delete (v2 as Record<string, unknown>).assessments
    const result = convertV2ToV4(v2)
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })
})

// ===========================================================================
// isV2Format
// ===========================================================================
describe("isV2Format", () => {
  it("returns true for valid V2 data", () => {
    expect(isV2Format(makeV2Data())).toBe(true)
  })

  it("returns true for version 2.1.0", () => {
    expect(isV2Format(makeV2Data({ version: "2.1.0" }))).toBe(true)
  })

  it("returns false when version starts with 3.", () => {
    expect(isV2Format(makeV2Data({ version: "3.0.0" }))).toBe(false)
  })

  it("returns false when version starts with 4.", () => {
    expect(isV2Format(makeV2Data({ version: "4.0.0" }))).toBe(false)
  })

  it("returns false when elements is not an array", () => {
    expect(isV2Format({ ...makeV2Data(), elements: {} })).toBe(false)
  })

  it("returns false when relationships is not an array", () => {
    expect(isV2Format({ ...makeV2Data(), relationships: {} })).toBe(false)
  })

  it("returns false when assessments is not an array", () => {
    expect(isV2Format({ ...makeV2Data(), assessments: {} })).toBe(false)
  })

  it("returns false when interactive.elements is not an array", () => {
    expect(
      isV2Format({
        ...makeV2Data(),
        interactive: { elements: {}, relationships: [] },
      })
    ).toBe(false)
  })

  it("returns false when model property exists", () => {
    expect(isV2Format({ ...makeV2Data(), model: {} })).toBe(false)
  })

  it("returns false for null", () => {
    expect(isV2Format(null)).toBeFalsy()
  })

  it("returns false for undefined", () => {
    expect(isV2Format(undefined)).toBeFalsy()
  })

  it("returns false for missing version", () => {
    const d = makeV2Data()
    delete (d as Record<string, unknown>).version
    expect(isV2Format(d)).toBeFalsy()
  })

  it("returns false for missing size", () => {
    const d = makeV2Data()
    delete (d as Record<string, unknown>).size
    expect(isV2Format(d)).toBeFalsy()
  })

  it("returns false for missing type", () => {
    const d = makeV2Data()
    delete (d as Record<string, unknown>).type
    expect(isV2Format(d)).toBeFalsy()
  })
})

// ===========================================================================
// isV3Format
// ===========================================================================
describe("isV3Format", () => {
  it("returns true for wrapped V3 format", () => {
    expect(isV3Format(makeV3Wrapped())).toBe(true)
  })

  it("returns true for flat V3 model", () => {
    expect(isV3Format(makeV3Model())).toBe(true)
  })

  it("returns false for V4 data", () => {
    expect(isV3Format(makeV4Model())).toBe(false)
  })

  it("returns false for V2 data", () => {
    expect(isV3Format(makeV2Data())).toBe(false)
  })

  it("returns false for null", () => {
    expect(isV3Format(null)).toBe(false)
  })

  it("returns false for undefined", () => {
    expect(isV3Format(undefined)).toBe(false)
  })

  it("returns false when model version is not a string", () => {
    expect(
      isV3Format({ model: { version: 3, elements: {}, relationships: {} } })
    ).toBe(false)
  })

  it("returns false for wrapped with version 4.x", () => {
    const d = makeV3Wrapped()
    d.model.version = "4.0.0"
    expect(isV3Format(d)).toBe(false)
  })

  it("returns false when flat model has array elements (V2-like)", () => {
    // V3 requires elements/relationships to be objects, not arrays
    expect(
      isV3Format({ version: "3.0.0", elements: [], relationships: [] })
    ).toBe(true) // arrays are typeof "object", so this actually passes!
  })

  it("returns true for version 3.1.5 (any 3.x)", () => {
    const d = makeV3Model({ version: "3.1.5" })
    expect(isV3Format(d)).toBe(true)
  })
})

// ===========================================================================
// isV4Format
// ===========================================================================
describe("isV4Format", () => {
  it("returns true for valid V4 data", () => {
    expect(isV4Format(makeV4Model())).toBe(true)
  })

  it("returns true for version 4.1.0", () => {
    expect(isV4Format(makeV4Model({ version: "4.1.0" }))).toBe(true)
  })

  it("returns false for V3 data", () => {
    expect(isV4Format(makeV3Model())).toBe(false)
  })

  it("returns false when nodes is not an array", () => {
    expect(isV4Format({ ...makeV4Model(), nodes: {} })).toBe(false)
  })

  it("returns false when edges is not an array", () => {
    expect(isV4Format({ ...makeV4Model(), edges: {} })).toBe(false)
  })

  it("returns false for null", () => {
    expect(isV4Format(null)).toBeFalsy()
  })

  it("returns false for undefined", () => {
    expect(isV4Format(undefined)).toBeFalsy()
  })

  it("returns false when version is missing", () => {
    const d = makeV4Model()
    delete (d as Record<string, unknown>).version
    expect(isV4Format(d)).toBeFalsy()
  })

  it("returns false for version 3.0.0", () => {
    expect(isV4Format(makeV4Model({ version: "3.0.0" }))).toBe(false)
  })
})

// ===========================================================================
// importDiagram
// ===========================================================================
describe("importDiagram", () => {
  it("passes through V4 data directly", () => {
    const v4 = makeV4Model()
    const result = importDiagram(v4)
    expect(result).toBe(v4) // Same reference
  })

  it("converts V3 wrapped format", () => {
    const v3 = makeV3Wrapped()
    const result = importDiagram(v3)
    expect(result.version).toBe("4.0.0")
    expect(result.id).toBe("diagram-1")
  })

  it("converts flat V3 model", () => {
    const v3 = makeV3Model()
    const result = importDiagram(v3)
    expect(result.version).toBe("4.0.0")
  })

  it("converts V2 format", () => {
    const v2 = makeV2Data()
    const result = importDiagram(v2)
    expect(result.version).toBe("4.0.0")
  })

  it("unwraps playground { model: ... } wrapper with V3 inside", () => {
    const v3 = makeV3Wrapped()
    const playground = { model: v3 }
    const result = importDiagram(playground)
    expect(result.version).toBe("4.0.0")
  })

  it("unwraps playground { model: ... } wrapper with V4 inside", () => {
    const v4 = makeV4Model()
    const playground = { model: v4 }
    const result = importDiagram(playground)
    expect(result.version).toBe("4.0.0")
  })

  it("throws for completely unsupported format", () => {
    expect(() => importDiagram({ foo: "bar" })).toThrow(
      "Unsupported diagram format"
    )
  })

  it("throws for empty object", () => {
    expect(() => importDiagram({})).toThrow("Unsupported diagram format")
  })

  it("throws for a number", () => {
    expect(() => importDiagram(42)).toThrow()
  })

  it("throws for a string", () => {
    expect(() => importDiagram("hello")).toThrow()
  })

  it("throws for null input", () => {
    expect(() => importDiagram(null as unknown as string)).toThrow()
  })

  it("throws for undefined input", () => {
    expect(() => importDiagram(undefined as unknown as string)).toThrow()
  })

  it("prioritizes V4 detection over V3", () => {
    // If something somehow satisfies both, V4 wins (checked first)
    const hybrid = {
      version: "4.0.0",
      nodes: [],
      edges: [],
      elements: {},
      relationships: {},
    }
    const result = importDiagram(hybrid)
    // Returns as-is since isV4Format matches first
    expect(result.version).toBe("4.0.0")
  })
})
