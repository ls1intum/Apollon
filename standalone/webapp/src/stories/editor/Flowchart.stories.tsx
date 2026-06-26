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
import { DefaultNodeEditPopover } from "@tumaet/apollon/components/popovers/DefaultNodeEditPopover"
import { FlowChartEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/FlowChartEdgeEditPopover"
import { DefaultNodeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeGiveFeedbackPopover"
import { DefaultNodeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeSeeFeedbackPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

const meta = { title: "Editor/Flowchart", ...editorStoryMeta } satisfies Meta

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
  render: () => <ApollonEditable model={fixtureByType.Flowchart} />,
}

/** Editable blank canvas — build a flowchart from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="Flowchart" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="Flowchart" />,
}

/** Every flowline (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="Flowchart" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Process-box editor — the shared default node editor (name + style). */
export const EditProcess: Story = {
  name: "Edit: Process",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="Flowchart"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("process-1", "flowchartProcess", {
            name: "Validate input",
          })
        )
      }
    >
      <DefaultNodeEditPopover elementId="process-1" />
    </SeededPopoverHarness>
  ),
}

/** Flowline editor — style, swap, label. */
export const EditFlowline: Story = {
  name: "Edit: Flowline",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="Flowchart"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "flowchartProcess", { name: "Start" }))
        diagram
          .getState()
          .addNode(makeNode("b", "flowchartProcess", { name: "End" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "FlowChartFlowline", "a", "b", {
            label: "yes",
          })
        )
      }}
    >
      <FlowChartEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Process boxes render via the shared DEFAULT node, so these exercise the
// DefaultNode give/see feedback popovers. Give = the grader's score + comment
// form; See = the read-only review, which reads from the diagram store's
// `assessments` map (keyed by model-element id).

/** Give-feedback form for a process box (shared default-node feedback popover). */
export const GiveFeedbackProcess: Story = {
  name: "Feedback (Give): Process",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="Flowchart"
      seed={(diagram) =>
        diagram
          .getState()
          .addNode(
            makeNode("process-1", "flowchartProcess", {
              name: "Validate input",
            })
          )
      }
    >
      <DefaultNodeGiveFeedbackPopover elementId="process-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded process; the box renders a score + feedback form.
    await canvas.findByText("Validate input")
    await canvas.findByText("Points")
    await canvas.findByText("Feedback")
  },
}

/** See-feedback (read-only) view of a process box with a graded assessment. */
export const SeeFeedbackProcess: Story = {
  name: "Feedback (See): Process",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="Flowchart"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(
            makeNode("process-1", "flowchartProcess", {
              name: "Validate input",
            })
          )
        diagram.getState().setAssessments({
          "process-1": {
            modelElementId: "process-1",
            elementType: "node",
            score: 3,
            feedback: "Clear, single-purpose processing step.",
          },
        })
      }}
    >
      <DefaultNodeSeeFeedbackPopover elementId="process-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score + feedback are rendered read-only.
    await canvas.findByText("+3")
    await canvas.findByText("Clear, single-purpose processing step.")
  },
}

/** Give-feedback form for a flowline edge — a single score + comment row. */
export const GiveFeedbackFlowline: Story = {
  name: "Feedback (Give): Flowline",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="Flowchart"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "flowchartProcess", { name: "Start" }))
        diagram
          .getState()
          .addNode(makeNode("b", "flowchartProcess", { name: "End" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "FlowChartFlowline", "a", "b"))
      }}
    >
      <EdgeGiveFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge feedback header names the edge by its type; the box is a form.
    await canvas.findByText("FlowChartFlowline")
    await canvas.findByText("Points")
    await canvas.findByText("Feedback")
  },
}

/** See-feedback (read-only) view of a flowline edge with an assessment. */
export const SeeFeedbackFlowline: Story = {
  name: "Feedback (See): Flowline",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="Flowchart"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "flowchartProcess", { name: "Start" }))
        diagram
          .getState()
          .addNode(makeNode("b", "flowchartProcess", { name: "End" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "FlowChartFlowline", "a", "b"))
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 2,
            feedback: "Label the branch that leaves the decision.",
          },
        })
      }}
    >
      <EdgeSeeFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded edge score + feedback render read-only under the edge header.
    await canvas.findByText("FlowChartFlowline")
    await canvas.findByText("+2")
    await canvas.findByText("Label the branch that leaves the decision.")
  },
}
