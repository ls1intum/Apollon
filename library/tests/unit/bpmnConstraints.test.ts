import { describe, it, expect } from "vitest"
import { canDropIntoParent } from "@/utils/bpmnConstraints"

// ---------------------------------------------------------------------------
// bpmnPool
// ---------------------------------------------------------------------------

describe("canDropIntoParent – bpmnPool", () => {
  const validChildren = [
    "bpmnTask",
    "bpmnStartEvent",
    "bpmnIntermediateEvent",
    "bpmnEndEvent",
    "bpmnGateway",
    "bpmnSubprocess",
    "bpmnTransaction",
    "bpmnCallActivity",
    "bpmnDataObject",
    "bpmnDataStore",
    "bpmnAnnotation",
    "bpmnGroup",
    "bpmnPool",
  ]

  it.each(validChildren)("accepts %s in bpmnPool", (child) => {
    expect(canDropIntoParent(child, "bpmnPool")).toBe(true)
  })

  it("rejects non-bpmn types in bpmnPool", () => {
    expect(canDropIntoParent("class", "bpmnPool")).toBe(false)
    expect(canDropIntoParent("package", "bpmnPool")).toBe(false)
    expect(canDropIntoParent("activity", "bpmnPool")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// bpmnGroup
// ---------------------------------------------------------------------------

describe("canDropIntoParent – bpmnGroup", () => {
  it("accepts any bpmn-prefixed type", () => {
    expect(canDropIntoParent("bpmnTask", "bpmnGroup")).toBe(true)
    expect(canDropIntoParent("bpmnPool", "bpmnGroup")).toBe(true)
    expect(canDropIntoParent("bpmnAnything", "bpmnGroup")).toBe(true)
  })

  it("rejects non-bpmn types", () => {
    expect(canDropIntoParent("class", "bpmnGroup")).toBe(false)
    expect(canDropIntoParent("component", "bpmnGroup")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// bpmnSubprocess / bpmnTransaction / bpmnCallActivity
// ---------------------------------------------------------------------------

describe("canDropIntoParent – bpmnSubprocess/bpmnTransaction/bpmnCallActivity", () => {
  const subprocessParents = [
    "bpmnSubprocess",
    "bpmnTransaction",
    "bpmnCallActivity",
  ]
  const validChildren = [
    "bpmnTask",
    "bpmnStartEvent",
    "bpmnIntermediateEvent",
    "bpmnEndEvent",
    "bpmnGateway",
    "bpmnSubprocess",
    "bpmnTransaction",
    "bpmnCallActivity",
    "bpmnDataObject",
    "bpmnDataStore",
    "bpmnAnnotation",
    "bpmnGroup",
  ]

  for (const parent of subprocessParents) {
    it.each(validChildren)(`accepts %s in ${parent}`, (child) => {
      expect(canDropIntoParent(child, parent)).toBe(true)
    })

    it(`rejects bpmnPool in ${parent}`, () => {
      expect(canDropIntoParent("bpmnPool", parent)).toBe(false)
    })

    it(`rejects non-bpmn types in ${parent}`, () => {
      expect(canDropIntoParent("class", parent)).toBe(false)
    })
  }
})

// ---------------------------------------------------------------------------
// package
// ---------------------------------------------------------------------------

describe("canDropIntoParent – package", () => {
  it("accepts class", () => {
    expect(canDropIntoParent("class", "package")).toBe(true)
  })

  it("accepts package (nested)", () => {
    expect(canDropIntoParent("package", "package")).toBe(true)
  })

  it("rejects other types", () => {
    expect(canDropIntoParent("activity", "package")).toBe(false)
    expect(canDropIntoParent("bpmnTask", "package")).toBe(false)
    expect(canDropIntoParent("component", "package")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// activity
// ---------------------------------------------------------------------------

describe("canDropIntoParent – activity", () => {
  it("accepts activity-prefixed types", () => {
    expect(canDropIntoParent("activityActionNode", "activity")).toBe(true)
    expect(canDropIntoParent("activityFinalNode", "activity")).toBe(true)
    expect(canDropIntoParent("activityInitialNode", "activity")).toBe(true)
    expect(canDropIntoParent("activityForkNode", "activity")).toBe(true)
  })

  it("rejects non-activity types", () => {
    expect(canDropIntoParent("class", "activity")).toBe(false)
    expect(canDropIntoParent("bpmnTask", "activity")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// useCaseSystem
// ---------------------------------------------------------------------------

describe("canDropIntoParent – useCaseSystem", () => {
  it("accepts useCase", () => {
    expect(canDropIntoParent("useCase", "useCaseSystem")).toBe(true)
  })

  it("accepts useCaseActor", () => {
    expect(canDropIntoParent("useCaseActor", "useCaseSystem")).toBe(true)
  })

  it("rejects other types", () => {
    expect(canDropIntoParent("class", "useCaseSystem")).toBe(false)
    expect(canDropIntoParent("useCaseSystem", "useCaseSystem")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// componentSubsystem
// ---------------------------------------------------------------------------

describe("canDropIntoParent – componentSubsystem", () => {
  it("accepts component", () => {
    expect(canDropIntoParent("component", "componentSubsystem")).toBe(true)
  })

  it("accepts componentInterface", () => {
    expect(canDropIntoParent("componentInterface", "componentSubsystem")).toBe(
      true
    )
  })

  it("accepts componentSubsystem (nested)", () => {
    expect(canDropIntoParent("componentSubsystem", "componentSubsystem")).toBe(
      true
    )
  })

  it("rejects other types", () => {
    expect(canDropIntoParent("class", "componentSubsystem")).toBe(false)
    expect(canDropIntoParent("deploymentNode", "componentSubsystem")).toBe(
      false
    )
  })
})

// ---------------------------------------------------------------------------
// deploymentNode
// ---------------------------------------------------------------------------

describe("canDropIntoParent – deploymentNode", () => {
  it("accepts deploymentComponent", () => {
    expect(canDropIntoParent("deploymentComponent", "deploymentNode")).toBe(
      true
    )
  })

  it("accepts deploymentArtifact", () => {
    expect(canDropIntoParent("deploymentArtifact", "deploymentNode")).toBe(true)
  })

  it("accepts deploymentInterface", () => {
    expect(canDropIntoParent("deploymentInterface", "deploymentNode")).toBe(
      true
    )
  })

  it("accepts deploymentNode (nested)", () => {
    expect(canDropIntoParent("deploymentNode", "deploymentNode")).toBe(true)
  })

  it("rejects non-deployment types", () => {
    expect(canDropIntoParent("class", "deploymentNode")).toBe(false)
    expect(canDropIntoParent("component", "deploymentNode")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// deploymentComponent
// ---------------------------------------------------------------------------

describe("canDropIntoParent – deploymentComponent", () => {
  it("accepts deploymentArtifact", () => {
    expect(canDropIntoParent("deploymentArtifact", "deploymentComponent")).toBe(
      true
    )
  })

  it("accepts deploymentInterface", () => {
    expect(
      canDropIntoParent("deploymentInterface", "deploymentComponent")
    ).toBe(true)
  })

  it("rejects deploymentNode", () => {
    expect(canDropIntoParent("deploymentNode", "deploymentComponent")).toBe(
      false
    )
  })

  it("rejects other types", () => {
    expect(canDropIntoParent("class", "deploymentComponent")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// default (unknown parent type)
// ---------------------------------------------------------------------------

describe("canDropIntoParent – unknown parent type", () => {
  it("returns true for any child", () => {
    expect(canDropIntoParent("class", "unknownParent")).toBe(true)
    expect(canDropIntoParent("bpmnTask", "somethingElse")).toBe(true)
    expect(canDropIntoParent("anything", "whatever")).toBe(true)
  })
})
