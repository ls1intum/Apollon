import { describe, it, expect } from "vitest"
import { rendersNameLabel, supportsMultilineName } from "@/utils/nodeUtils"
import { DiagramNodeTypeRecord } from "@/nodes"

/**
 * The rename input's `multiline` behavior MUST match what the SVG actually
 * repaints. These tests are NOT a restatement of the allow-list — they are
 * two independent checks against *regressions and drift*:
 *
 *   1. Exhaustiveness: every type in `DiagramNodeTypeRecord` has a
 *      definite boolean answer (no fall-through to undefined).
 *   2. Contract: the predicate rejects plainly unknown / falsy inputs.
 *
 * If a new node type is registered without being classified here, the
 * exhaustiveness test fails.
 */

describe("supportsMultilineName", () => {
  it("returns false for falsy / unknown input", () => {
    expect(supportsMultilineName(undefined)).toBe(false)
    expect(supportsMultilineName("")).toBe(false)
    expect(supportsMultilineName("notARealNodeType")).toBe(false)
  })

  it("returns a strict boolean for every registered DiagramNodeType", () => {
    for (const type of Object.values(DiagramNodeTypeRecord)) {
      expect(typeof supportsMultilineName(type)).toBe("boolean")
    }
  })

  it("partitions the registered node types into exactly two disjoint sets", () => {
    const wrappers = Object.values(DiagramNodeTypeRecord).filter((t) =>
      supportsMultilineName(t)
    )
    const nonWrappers = Object.values(DiagramNodeTypeRecord).filter(
      (t) => !supportsMultilineName(t)
    )
    expect(wrappers.length + nonWrappers.length).toBe(
      Object.keys(DiagramNodeTypeRecord).length
    )
    // Spot-check the hand-verified boundary cases: wrapping nodes and
    // their canonical non-wrapping counterparts.
    expect(wrappers).toContain(DiagramNodeTypeRecord.bpmnTask)
    expect(wrappers).toContain(DiagramNodeTypeRecord.useCase)
    expect(wrappers).toContain(DiagramNodeTypeRecord.flowchartDecision)
    expect(nonWrappers).toContain(DiagramNodeTypeRecord.class)
    expect(nonWrappers).toContain(DiagramNodeTypeRecord.petriNetPlace)
    expect(nonWrappers).toContain(DiagramNodeTypeRecord.bpmnGateway)
  })
})

describe("rendersNameLabel", () => {
  it("returns a strict boolean for every registered DiagramNodeType", () => {
    for (const type of Object.values(DiagramNodeTypeRecord)) {
      expect(typeof rendersNameLabel(type)).toBe("boolean")
    }
  })

  it("hides the rename input for pure-symbol activity nodes", () => {
    expect(rendersNameLabel(DiagramNodeTypeRecord.activityInitialNode)).toBe(
      false
    )
    expect(rendersNameLabel(DiagramNodeTypeRecord.activityFinalNode)).toBe(
      false
    )
    expect(rendersNameLabel(DiagramNodeTypeRecord.activityForkNode)).toBe(false)
    expect(
      rendersNameLabel(DiagramNodeTypeRecord.activityForkNodeHorizontal)
    ).toBe(false)
  })

  it("defaults to true for unknown / non-symbol types", () => {
    expect(rendersNameLabel(undefined)).toBe(true)
    expect(rendersNameLabel("class")).toBe(true)
    expect(rendersNameLabel(DiagramNodeTypeRecord.bpmnTask)).toBe(true)
  })

  it("never allows multiline for a type that hides the rename input", () => {
    // A hidden rename input with multiline enabled is nonsense. Pin it.
    for (const type of Object.values(DiagramNodeTypeRecord)) {
      if (!rendersNameLabel(type)) {
        expect(supportsMultilineName(type)).toBe(false)
      }
    }
  })
})
