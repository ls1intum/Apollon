import { describe, it, expect } from "vitest"
import { importDiagram } from "@/utils/versionConverter"

// ===========================================================================
// Legacy Apollon iOS -> v4 migration fidelity
// ---------------------------------------------------------------------------
// These fixtures mirror the EXACT JSON the legacy native iOS app produces when
// it encodes an `ApollonDiagram` via the Codable `Diagram` struct (see
// apollon-ios-module ApollonShared DataModels: Diagram / UMLModel / UMLElement
// / UMLRelationship). The native migration plugin re-encodes the on-disk
// SwiftData store through that same path, so whatever passes here is what the
// running app must handle. The iOS editor only supports these 5 diagram types
// (UMLDiagramType.isDiagramTypeUnsupported): Class, Object, Activity, UseCase,
// Component.
//
// Each diagram is wrapped exactly like the iOS export:
//   { id, title, lastUpdate, diagramType, model: { version: "3.0.0", ... } }
// ===========================================================================

type Bounds = { x: number; y: number; width: number; height: number }

function wrap(
  diagramType: string,
  elements: Record<string, unknown>,
  relationships: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {}
) {
  return {
    id: `diagram-${diagramType}`,
    title: `My ${diagramType}`,
    lastUpdate: "2024-03-13T11:45:12.345Z",
    diagramType,
    model: {
      version: "3.0.0",
      type: diagramType,
      size: { width: 1200, height: 900 },
      interactive: { elements: {}, relationships: {} },
      elements,
      relationships,
      assessments: {},
      ...overrides,
    },
  }
}

function el(
  id: string,
  type: string,
  name: string,
  bounds: Bounds,
  extra: Record<string, unknown> = {}
) {
  return { id, name, type, owner: null, bounds, ...extra }
}

function rel(
  id: string,
  type: string,
  source: {
    element: string
    direction: string
    multiplicity?: string
    role?: string
  },
  target: {
    element: string
    direction: string
    multiplicity?: string
    role?: string
  },
  bounds: Bounds,
  extra: Record<string, unknown> = {}
) {
  return {
    id,
    name: "",
    type,
    owner: "",
    bounds,
    path: [],
    source,
    target,
    isManuallyLayouted: false,
    ...extra,
  }
}

describe("legacy iOS class diagram", () => {
  const fixture = wrap(
    "ClassDiagram",
    {
      "class-1": el("class-1", "Class", "Animal", {
        x: 100,
        y: 100,
        width: 200,
        height: 130,
      }),
      // Children listed out of vertical order on purpose to prove we sort.
      "meth-1": {
        ...el("meth-1", "ClassMethod", "+ makeSound()", {
          x: 100,
          y: 200,
          width: 200,
          height: 30,
        }),
        owner: "class-1",
      },
      "attr-2": {
        ...el("attr-2", "ClassAttribute", "- age: int", {
          x: 100,
          y: 170,
          width: 200,
          height: 30,
        }),
        owner: "class-1",
      },
      "attr-1": {
        ...el("attr-1", "ClassAttribute", "+ name: String", {
          x: 100,
          y: 140,
          width: 200,
          height: 30,
        }),
        owner: "class-1",
      },
      "class-2": el("class-2", "AbstractClass", "LivingThing", {
        x: 100,
        y: 420,
        width: 200,
        height: 60,
      }),
    },
    {
      "rel-1": rel(
        "rel-1",
        "ClassInheritance",
        // "Topright" is an iOS corner-direction handle — asserted end-to-end
        // below to prove the dialect mapping survives importDiagram, not just
        // the unit mapper.
        { element: "class-1", direction: "Topright", role: "child" },
        { element: "class-2", direction: "Down", multiplicity: "1" },
        { x: 150, y: 230, width: 0, height: 190 },
        {
          path: [
            { x: 0, y: 0 },
            { x: 0, y: 190 },
          ],
          isManuallyLayouted: true,
        }
      ),
    }
  )

  const model = importDiagram(structuredClone(fixture))

  it("preserves diagram id, title and type", () => {
    expect(model.id).toBe("diagram-ClassDiagram")
    expect(model.title).toBe("My ClassDiagram")
    expect(model.type).toBe("ClassDiagram")
    expect(model.version).toBe("4.0.0")
  })

  it("folds attribute/method children into the parent node (not standalone nodes)", () => {
    expect(model.nodes.map((n) => n.id).sort()).toEqual(["class-1", "class-2"])
  })

  it("orders folded attributes and methods by vertical position (bounds.y)", () => {
    const animal = model.nodes.find((n) => n.id === "class-1")!
    const data = animal.data as {
      attributes: { id: string; name: string }[]
      methods: { id: string; name: string }[]
    }
    expect(data.attributes.map((a) => a.id)).toEqual(["attr-1", "attr-2"])
    expect(data.attributes.map((a) => a.name)).toEqual([
      "+ name: String",
      "- age: int",
    ])
    expect(data.methods.map((m) => m.id)).toEqual(["meth-1"])
  })

  it("maps an abstract class to the isAbstract modifier, not a stereotype", () => {
    const abstract = model.nodes.find((n) => n.id === "class-2")!
    const data = abstract.data as { stereotype?: string; isAbstract?: boolean }
    expect(data.isAbstract).toBe(true)
    expect(data.stereotype).toBeUndefined()
  })

  it("converts the inheritance relationship to an edge with preserved ids", () => {
    expect(model.edges).toHaveLength(1)
    const edge = model.edges[0]
    expect(edge.id).toBe("rel-1")
    expect(edge.source).toBe("class-1")
    expect(edge.target).toBe("class-2")
    expect(edge.type).toBe("ClassInheritance")
    expect(edge.sourceHandle).toBe("top-right") // iOS "Topright"
    expect(edge.targetHandle).toBe("bottom") // "Down"
  })

  it("preserves endpoint role/multiplicity and absolutizes waypoints", () => {
    const data = model.edges[0].data as {
      sourceRole: string
      targetMultiplicity: string
      points: { x: number; y: number }[]
    }
    expect(data.sourceRole).toBe("child")
    expect(data.targetMultiplicity).toBe("1")
    // path points are stored relative to relationship.bounds (x:150,y:230)
    expect(data.points).toEqual([
      { x: 150, y: 230 },
      { x: 150, y: 420 },
    ])
  })
})

describe("legacy iOS object diagram", () => {
  const fixture = wrap(
    "ObjectDiagram",
    {
      "obj-1": el("obj-1", "ObjectName", "alice: Person", {
        x: 50,
        y: 50,
        width: 180,
        height: 90,
      }),
      "oa-1": {
        ...el("oa-1", "ObjectAttribute", 'name = "Alice"', {
          x: 50,
          y: 90,
          width: 180,
          height: 30,
        }),
        owner: "obj-1",
      },
      "obj-2": el("obj-2", "ObjectName", "bob: Person", {
        x: 400,
        y: 50,
        width: 180,
        height: 60,
      }),
    },
    {
      "ol-1": rel(
        "ol-1",
        "ObjectLink",
        { element: "obj-1", direction: "Right" },
        { element: "obj-2", direction: "Left" },
        { x: 230, y: 80, width: 170, height: 0 }
      ),
    }
  )

  const model = importDiagram(structuredClone(fixture))

  it("folds object attributes and keeps two object nodes", () => {
    expect(model.nodes.map((n) => n.id).sort()).toEqual(["obj-1", "obj-2"])
    const alice = model.nodes.find((n) => n.id === "obj-1")!
    expect(
      (alice.data as { attributes: { id: string }[] }).attributes.map(
        (a) => a.id
      )
    ).toEqual(["oa-1"])
  })

  it("converts the object link with left/right handles", () => {
    expect(model.edges).toHaveLength(1)
    expect(model.edges[0].type).toBe("ObjectLink")
    expect(model.edges[0].sourceHandle).toBe("right")
    expect(model.edges[0].targetHandle).toBe("left")
  })
})

describe("legacy iOS activity diagram", () => {
  const fixture = wrap(
    "ActivityDiagram",
    {
      init: el("init", "ActivityInitialNode", "", {
        x: 100,
        y: 50,
        width: 40,
        height: 40,
      }),
      action: el("action", "ActivityActionNode", "Process order", {
        x: 60,
        y: 150,
        width: 120,
        height: 60,
      }),
      final: el("final", "ActivityFinalNode", "", {
        x: 100,
        y: 280,
        width: 40,
        height: 40,
      }),
    },
    {
      flow: rel(
        "flow",
        "ActivityControlFlow",
        { element: "init", direction: "Down" },
        { element: "action", direction: "Up" },
        { x: 120, y: 90, width: 0, height: 60 }
      ),
    }
  )

  it("round-trips activity nodes and the control flow", () => {
    const model = importDiagram(structuredClone(fixture))
    expect(model.nodes.map((n) => n.type).sort()).toEqual([
      "activityActionNode",
      "activityFinalNode",
      "activityInitialNode",
    ])
    expect(model.edges).toHaveLength(1)
    expect(model.edges[0].type).toBe("ActivityControlFlow")
  })
})

describe("legacy iOS use case diagram", () => {
  const fixture = wrap(
    "UseCaseDiagram",
    {
      actor: el("actor", "UseCaseActor", "Customer", {
        x: 40,
        y: 100,
        width: 80,
        height: 140,
      }),
      system: el("system", "UseCaseSystem", "Shop", {
        x: 300,
        y: 40,
        width: 400,
        height: 400,
      }),
      // A use case nested inside the system container (owner set).
      uc: {
        ...el("uc", "UseCase", "Place order", {
          x: 360,
          y: 140,
          width: 160,
          height: 60,
        }),
        owner: "system",
      },
    },
    {
      assoc: rel(
        "assoc",
        "UseCaseAssociation",
        { element: "actor", direction: "Right" },
        { element: "uc", direction: "Left" },
        { x: 120, y: 160, width: 240, height: 10 }
      ),
    }
  )

  const model = importDiagram(structuredClone(fixture))

  it("keeps actor, system and use case as nodes", () => {
    expect(model.nodes.map((n) => n.id).sort()).toEqual([
      "actor",
      "system",
      "uc",
    ])
  })

  it("nests the use case under the system with relative position + parentId", () => {
    const uc = model.nodes.find((n) => n.id === "uc")!
    expect(uc.parentId).toBe("system")
    // position relative to system bounds (x:300,y:40) -> (60,100)
    expect(uc.position).toEqual({ x: 60, y: 100 })
  })

  it("converts the association edge", () => {
    expect(model.edges).toHaveLength(1)
    expect(model.edges[0].type).toBe("UseCaseAssociation")
  })
})

describe("legacy iOS component diagram", () => {
  const fixture = wrap(
    "ComponentDiagram",
    {
      server: el("server", "Component", "Server", {
        x: 80,
        y: 80,
        width: 200,
        height: 120,
      }),
      client: el("client", "Component", "Client", {
        x: 500,
        y: 80,
        width: 200,
        height: 120,
      }),
      // Non-square interface bounds — should be normalized to a square.
      iface: el("iface", "ComponentInterface", "API", {
        x: 320,
        y: 110,
        width: 40,
        height: 64,
      }),
    },
    {
      dep: rel(
        "dep",
        "ComponentDependency",
        { element: "client", direction: "Left" },
        { element: "server", direction: "Right" },
        { x: 280, y: 140, width: 220, height: 0 }
      ),
    }
  )

  const model = importDiagram(structuredClone(fixture))

  it("maps Subsystem-family component nodes and the dependency edge", () => {
    expect(model.nodes.map((n) => n.id).sort()).toEqual([
      "client",
      "iface",
      "server",
    ])
    expect(model.edges).toHaveLength(1)
    expect(model.edges[0].type).toBe("ComponentDependency")
  })

  it("normalizes the component interface to a square node", () => {
    const iface = model.nodes.find((n) => n.id === "iface")!
    expect(iface.type).toBe("componentInterface")
    expect(iface.width).toBe(iface.height)
  })
})

// Per-diagram isolation depends on importDiagram throwing (not silently
// returning junk) for an unrecognizable payload; the JS runner wraps each
// diagram in try/catch on that contract.
describe("migration robustness", () => {
  it("throws on a structurally broken diagram", () => {
    const broken = {
      id: "x",
      title: "x",
      diagramType: "ClassDiagram",
      model: { version: "3.0.0", type: "ClassDiagram" },
    }
    expect(() => importDiagram(broken)).toThrow()
  })
})
