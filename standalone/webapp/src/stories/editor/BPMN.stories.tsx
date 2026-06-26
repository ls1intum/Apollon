import type { Meta, StoryObj } from "@storybook/react-vite"
import { within } from "storybook/test"
import {
  editorStoryMeta,
  ApollonEditable,
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
