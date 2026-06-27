import type { Meta, StoryObj } from "@storybook/react-vite"
import { within } from "storybook/test"
import type { Assessment, UMLModel } from "@tumaet/apollon"
import {
  editorStoryMeta,
  ApollonEditable,
  ApollonAssessable,
  fixtureByType,
  EditorStoreDecorator,
  ElementGallery,
  EdgeGallery,
  SeededPopoverHarness,
  makeNode,
  makeEdge,
} from "../_support/editor"
import { DefaultNodeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeGiveFeedbackPopover"
import { DefaultNodeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeSeeFeedbackPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"
import { BPMNTaskEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNTaskEditPopover"
import { BPMNStartEventEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNStartEventEditPopover"
import { BPMNIntermediateEventEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNIntermediateEventEditPopover"
import { BPMNEndEventEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNEndEventEditPopover"
import { BPMNGatewayEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNGatewayEditPopover"
import { BPMNPoolEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNPoolEditPopover"
import { BPMNDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/BPMNDiagramEdgeEditPopover"

const meta = { title: "Editor/BPMN", ...editorStoryMeta } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Popover-harness feedback stories run in the Vitest runner: the
// ["autodocs","test"] tag keeps them scannable in Docs AND test-gated, and
// each `play` asserts the seeded content rendered (so a regression that blanks
// a popover fails the suite rather than passing silently).
const popoverTags = ["autodocs", "test"]

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.BPMN} />,
}

/** Editable blank canvas — build a BPMN diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="BPMN" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="BPMN" />,
}

/** Every flow (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="BPMN" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Task editor — style, task type, and activity marker. */
export const EditTask: Story = {
  name: "Edit: Task",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("bpmn-task", "bpmnTask", {
            name: "Review Application",
            taskType: "user",
            marker: "loop",
          })
        )
      }
    >
      <BPMNTaskEditPopover elementId="bpmn-task" />
    </SeededPopoverHarness>
  ),
}

/** Start-event editor — name and start trigger type. */
export const EditStartEvent: Story = {
  name: "Edit: Start Event",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("bpmn-start", "bpmnStartEvent", {
            name: "Application Received",
            eventType: "message",
          })
        )
      }
    >
      <BPMNStartEventEditPopover elementId="bpmn-start" />
    </SeededPopoverHarness>
  ),
}

/** Intermediate-event editor — name and catch/throw trigger type. */
export const EditIntermediateEvent: Story = {
  name: "Edit: Intermediate Event",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("bpmn-intermediate", "bpmnIntermediateEvent", {
            name: "Await Confirmation",
            eventType: "message-catch",
          })
        )
      }
    >
      <BPMNIntermediateEventEditPopover elementId="bpmn-intermediate" />
    </SeededPopoverHarness>
  ),
}

/** End-event editor — name and end result type. */
export const EditEndEvent: Story = {
  name: "Edit: End Event",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("bpmn-end", "bpmnEndEvent", {
            name: "Application Rejected",
            eventType: "error",
          })
        )
      }
    >
      <BPMNEndEventEditPopover elementId="bpmn-end" />
    </SeededPopoverHarness>
  ),
}

/** Gateway editor — name and gateway type. */
export const EditGateway: Story = {
  name: "Edit: Gateway",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("bpmn-gateway", "bpmnGateway", {
            name: "Eligible?",
            gatewayType: "exclusive",
          })
        )
      }
    >
      <BPMNGatewayEditPopover elementId="bpmn-gateway" />
    </SeededPopoverHarness>
  ),
}

/** Pool editor — pool name. */
export const EditPool: Story = {
  name: "Edit: Pool",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("bpmn-pool", "bpmnPool", {
            name: "Loan Department",
          })
        )
      }
    >
      <BPMNPoolEditPopover elementId="bpmn-pool" />
    </SeededPopoverHarness>
  ),
}

/** Sequence-flow editor — style, edge type, connection, and label. */
export const EditSequenceFlow: Story = {
  name: "Edit: Sequence Flow",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("from", "bpmnTask", { name: "Review Application" }))
        diagram
          .getState()
          .addNode(makeNode("to", "bpmnGateway", { name: "Eligible?" }))
        diagram.getState().addEdge(
          makeEdge("bpmn-edge", "BPMNSequenceFlow", "from", "to", {
            label: "approved",
          })
        )
      }}
    >
      <BPMNDiagramEdgeEditPopover elementId="bpmn-edge" />
    </SeededPopoverHarness>
  ),
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Tasks render via the shared DEFAULT node, so these exercise the DefaultNode
// give/see feedback popovers. Give = the grader's score + comment form; See =
// the read-only review, which reads from the diagram store's `assessments` map
// (keyed by model-element id).

/** Give-feedback form for a task node (shared default-node feedback popover). */
export const GiveFeedbackTask: Story = {
  name: "Feedback (Give): Task",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram
          .getState()
          .addNode(
            makeNode("bpmn-task", "bpmnTask", { name: "Review Application" })
          )
      }
    >
      <DefaultNodeGiveFeedbackPopover elementId="bpmn-task" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded task; the box renders a score + feedback form.
    await canvas.findByText("Review Application")
    await canvas.findByText("Points")
    await canvas.findByText("Feedback")
  },
}

/** See-feedback (read-only) view of a task node with a graded assessment. */
export const SeeFeedbackTask: Story = {
  name: "Feedback (See): Task",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(
            makeNode("bpmn-task", "bpmnTask", { name: "Review Application" })
          )
        diagram.getState().setAssessments({
          "bpmn-task": {
            modelElementId: "bpmn-task",
            elementType: "node",
            score: 4,
            feedback: "Good task — consider tagging it as a user task.",
          },
        })
      }}
    >
      <DefaultNodeSeeFeedbackPopover elementId="bpmn-task" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score + feedback are rendered read-only.
    await canvas.findByText("+4")
    await canvas.findByText("Good task — consider tagging it as a user task.")
  },
}

/** Give-feedback form for a sequence-flow edge — a single score + comment row. */
export const GiveFeedbackSequenceFlow: Story = {
  name: "Feedback (Give): Sequence Flow",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("from", "bpmnTask", { name: "Review Application" }))
        diagram
          .getState()
          .addNode(makeNode("to", "bpmnGateway", { name: "Eligible?" }))
        diagram
          .getState()
          .addEdge(makeEdge("bpmn-edge", "BPMNSequenceFlow", "from", "to"))
      }}
    >
      <EdgeGiveFeedbackPopover elementId="bpmn-edge" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge feedback header names the edge by its type; the box is a form.
    await canvas.findByText("BPMNSequenceFlow")
    await canvas.findByText("Points")
    await canvas.findByText("Feedback")
  },
}

/** See-feedback (read-only) view of a sequence-flow edge with an assessment. */
export const SeeFeedbackSequenceFlow: Story = {
  name: "Feedback (See): Sequence Flow",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("from", "bpmnTask", { name: "Review Application" }))
        diagram
          .getState()
          .addNode(makeNode("to", "bpmnGateway", { name: "Eligible?" }))
        diagram
          .getState()
          .addEdge(makeEdge("bpmn-edge", "BPMNSequenceFlow", "from", "to"))
        diagram.getState().setAssessments({
          "bpmn-edge": {
            modelElementId: "bpmn-edge",
            elementType: "edge",
            score: 1,
            feedback: "Label the outgoing flow with its guard condition.",
          },
        })
      }}
    >
      <EdgeSeeFeedbackPopover elementId="bpmn-edge" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded edge score + feedback render read-only under the edge header.
    await canvas.findByText("BPMNSequenceFlow")
    await canvas.findByText("+1")
    await canvas.findByText("Label the outgoing flow with its guard condition.")
  },
}

// ── Assessment editor (full editor, grading mode) ────────────────────────────
/** The full editor in Assessment mode — click an element to give feedback. */
export const Assessment: Story = {
  name: "Assessment: Give Feedback",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={fixtureByType.BPMN} />,
}

// The shipped BPMN fixture has `assessments: {}`, so the read-only review
// surface would render an entirely UNGRADED diagram. Spread a real assessment
// map (keyed by the fixture's actual node / edge ids — read from
// tests/fixtures/bpmn.json) so the canvas shows every on-canvas AssessmentIcon
// state at once: score>0 → green check, score<0 → red cross, score===0 → blue
// warn, plus graded-without-feedback, while many elements (pool, end events,
// the palette-catalog nodes, …) stay ungraded (no icon).
const A = (
  modelElementId: string,
  elementType: string,
  score: number,
  feedback?: string
): Assessment => ({ modelElementId, elementType, score, feedback })

const gradedBpmnModel: UMLModel = {
  ...fixtureByType.BPMN,
  assessments: {
    // ── green (score > 0) ──
    "bb2c3d4e-f5a6-4b7c-8d9e-0f1a2b3c4d5e": A(
      "bb2c3d4e-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
      "node",
      2,
      "Correct start event for the order trigger."
    ),
    "cc3d4e5f-a6b7-4c8d-9e0f-1a2b3c4d5e6f": A(
      "cc3d4e5f-a6b7-4c8d-9e0f-1a2b3c4d5e6f",
      "node",
      3,
      "Validating the order first is the right activity."
    ),
    "edge-start-validate": A(
      "edge-start-validate",
      "edge",
      1,
      "Sequence flow is correctly ordered."
    ),
    // ── red (score < 0) ──
    "ee5f6a7b-c8d9-4e0f-1a2b-3c4d5e6f7a8b": A(
      "ee5f6a7b-c8d9-4e0f-1a2b-3c4d5e6f7a8b",
      "node",
      -1,
      "Payment should only run after a successful validation."
    ),
    "edge-validate-gateway": A(
      "edge-validate-gateway",
      "edge",
      -1,
      "This flow skips the required check."
    ),
    // ── blue (score === 0) ──
    "dd4e5f6a-b7c8-4d9e-0f1a-2b3c4d5e6f7a": A(
      "dd4e5f6a-b7c8-4d9e-0f1a-2b3c4d5e6f7a",
      "node",
      0,
      "Exclusive gateway is acceptable but earns no points here."
    ),
    // ── graded, but no feedback (icon shows, See popover feedback is "-") ──
    "ff6a7b8c-d9e0-4f1a-2b3c-4d5e6f7a8b9c": A(
      "ff6a7b8c-d9e0-4f1a-2b3c-4d5e6f7a8b9c",
      "node",
      2
    ),
    // The pool, end events and the palette-catalog nodes / remaining edges are
    // intentionally left UNGRADED (no icon).
  },
}

/**
 * The full editor in Assessment + readonly mode — the see-feedback review
 * surface, rendered over a fully GRADED model so every on-canvas
 * AssessmentIcon state shows: green check (score>0), red cross (score<0),
 * blue warn (score===0), plus graded-without-feedback, with many elements
 * left ungraded.
 */
export const AssessmentReview: Story = {
  name: "Assessment: See Feedback (graded)",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={gradedBpmnModel} readonly />,
}
