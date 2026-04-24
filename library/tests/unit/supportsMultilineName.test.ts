import { describe, it, expect } from "vitest"
import { rendersNameLabel, supportsMultilineName } from "@/utils/nodeUtils"
import { DiagramNodeTypeRecord } from "@/nodes"

/**
 * The rename input's `multiline` behavior MUST match what the SVG
 * actually repaints. If `supportsMultilineName` says yes, the matching
 * node's SVG file MUST use `MultilineText` or a `layoutTextIn…` helper;
 * if it says no, the SVG MUST render a single-line `CustomText` (or a
 * HeaderSection / RowBlockSection that doesn't wrap the name). These
 * tests pin the exact allow-list so accidental changes to either side
 * trip CI.
 */
describe("supportsMultilineName", () => {
  it("returns false for falsy / unknown input", () => {
    expect(supportsMultilineName(undefined)).toBe(false)
    expect(supportsMultilineName("")).toBe(false)
    expect(supportsMultilineName("notARealNodeType")).toBe(false)
  })

  const multilineTypes = [
    DiagramNodeTypeRecord.activity,
    DiagramNodeTypeRecord.activityActionNode,
    DiagramNodeTypeRecord.activityObjectNode,
    DiagramNodeTypeRecord.activityMergeNode,
    DiagramNodeTypeRecord.useCase,
    DiagramNodeTypeRecord.useCaseActor,
    DiagramNodeTypeRecord.useCaseSystem,
    DiagramNodeTypeRecord.component,
    DiagramNodeTypeRecord.componentSubsystem,
    DiagramNodeTypeRecord.deploymentNode,
    DiagramNodeTypeRecord.deploymentComponent,
    DiagramNodeTypeRecord.deploymentArtifact,
    DiagramNodeTypeRecord.flowchartTerminal,
    DiagramNodeTypeRecord.flowchartProcess,
    DiagramNodeTypeRecord.flowchartDecision,
    DiagramNodeTypeRecord.flowchartInputOutput,
    DiagramNodeTypeRecord.flowchartFunctionCall,
    DiagramNodeTypeRecord.syntaxTreeTerminal,
    DiagramNodeTypeRecord.syntaxTreeNonterminal,
    DiagramNodeTypeRecord.bpmnTask,
    DiagramNodeTypeRecord.bpmnSubprocess,
    DiagramNodeTypeRecord.bpmnTransaction,
    DiagramNodeTypeRecord.bpmnCallActivity,
    DiagramNodeTypeRecord.bpmnAnnotation,
    DiagramNodeTypeRecord.bpmnGroup,
    DiagramNodeTypeRecord.reachabilityGraphMarking,
    DiagramNodeTypeRecord.sfcStep,
    DiagramNodeTypeRecord.package,
    DiagramNodeTypeRecord.colorDescription,
  ]

  for (const type of multilineTypes) {
    it(`allows multiline for "${type}"`, () => {
      expect(supportsMultilineName(type)).toBe(true)
    })
  }

  const singleLineTypes = [
    // Class-table cells and header tspans never wrap.
    DiagramNodeTypeRecord.class,
    DiagramNodeTypeRecord.objectName,
    DiagramNodeTypeRecord.communicationObjectName,
    // BPMN events / gateway are tiny shapes; rotated pool label can't wrap.
    DiagramNodeTypeRecord.bpmnStartEvent,
    DiagramNodeTypeRecord.bpmnIntermediateEvent,
    DiagramNodeTypeRecord.bpmnEndEvent,
    DiagramNodeTypeRecord.bpmnGateway,
    DiagramNodeTypeRecord.bpmnPool,
    DiagramNodeTypeRecord.bpmnDataObject,
    DiagramNodeTypeRecord.bpmnDataStore,
    // Petri-net labels deliberately stay single-line (readability).
    DiagramNodeTypeRecord.petriNetPlace,
    DiagramNodeTypeRecord.petriNetTransition,
    // Activity symbol nodes (initial/final/fork) have no text.
    DiagramNodeTypeRecord.activityInitialNode,
    DiagramNodeTypeRecord.activityFinalNode,
    DiagramNodeTypeRecord.activityForkNode,
    DiagramNodeTypeRecord.activityForkNodeHorizontal,
    // SFC start / jump / transition-branch / action-table rows.
    DiagramNodeTypeRecord.sfcStart,
    DiagramNodeTypeRecord.sfcJump,
    DiagramNodeTypeRecord.sfcTransitionBranch,
    DiagramNodeTypeRecord.sfcActionTable,
    // Small circle interfaces.
    DiagramNodeTypeRecord.componentInterface,
    DiagramNodeTypeRecord.deploymentInterface,
  ]

  for (const type of singleLineTypes) {
    it(`forbids multiline for "${type}"`, () => {
      expect(supportsMultilineName(type)).toBe(false)
    })
  }
})

describe("rendersNameLabel", () => {
  const symbolNodes = [
    DiagramNodeTypeRecord.activityInitialNode,
    DiagramNodeTypeRecord.activityFinalNode,
    DiagramNodeTypeRecord.activityForkNode,
    DiagramNodeTypeRecord.activityForkNodeHorizontal,
  ]

  for (const type of symbolNodes) {
    it(`hides the rename input for the "${type}" symbol`, () => {
      expect(rendersNameLabel(type)).toBe(false)
    })
  }

  it("defaults to true for unknown / non-symbol types", () => {
    expect(rendersNameLabel(undefined)).toBe(true)
    expect(rendersNameLabel("class")).toBe(true)
    expect(rendersNameLabel(DiagramNodeTypeRecord.bpmnTask)).toBe(true)
  })
})
