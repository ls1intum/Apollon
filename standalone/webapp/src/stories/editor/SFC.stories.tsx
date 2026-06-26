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
import { SfcActionTableEditPopover } from "@tumaet/apollon/components/popovers/sfcDiagram/SfcActionTableEditPopover"
import { SfcEdgeEditPopover } from "@tumaet/apollon/components/popovers/sfcDiagram/SfcEdgeEditPopover"
import { DefaultNodeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeGiveFeedbackPopover"
import { DefaultNodeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeSeeFeedbackPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

const meta = { title: "Editor/SFC", ...editorStoryMeta } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.Sfc} />,
}

/** Editable blank canvas — build an SFC from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="Sfc" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="Sfc" />,
}

/** Every transition (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="Sfc" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Action-table editor — name plus a list of qualifier/description action rows. */
export const EditActionTable: Story = {
  name: "Edit: Action Table",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="Sfc"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("action-table-1", "sfcActionTable", {
            name: "Conveyor",
            actionRows: [
              { id: "r1", identifier: "N", name: "Run motor" },
              { id: "r2", identifier: "S", name: "Set alarm" },
              { id: "r3", identifier: "R", name: "Reset counter" },
            ],
          })
        )
      }
    >
      <SfcActionTableEditPopover elementId="action-table-1" />
    </SeededPopoverHarness>
  ),
}

/** Transition editor — style plus a JSON-encoded condition (crossbar/negation). */
export const EditTransition: Story = {
  name: "Edit: Transition",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="Sfc"
      width={360}
      seed={(diagram) => {
        diagram.getState().addNode(makeNode("a", "sfcStep", { name: "Step 1" }))
        diagram.getState().addNode(makeNode("b", "sfcStep", { name: "Step 2" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "SfcDiagramEdge", "a", "b", {
            label: JSON.stringify({
              isNegated: false,
              displayName: "start & ready",
              showBar: true,
            }),
          })
        )
      }}
    >
      <SfcEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Steps render via the shared DEFAULT node, so these exercise the DefaultNode
// give/see feedback popovers. Give = the grader's score + comment form; See =
// the read-only review, which reads from the diagram store's `assessments` map
// (keyed by model-element id). The SFC edge See routes to the shared
// EdgeSeeFeedbackPopover.

/** Give-feedback form for a step (shared default-node feedback popover). */
export const GiveFeedbackStep: Story = {
  name: "Feedback (Give): Step",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="Sfc"
      seed={(diagram) =>
        diagram
          .getState()
          .addNode(makeNode("step-1", "sfcStep", { name: "Step 1" }))
      }
    >
      <DefaultNodeGiveFeedbackPopover elementId="step-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded step; the box renders a score + feedback form.
    await canvas.findByText("Step 1")
    await canvas.findByPlaceholderText("0")
    await canvas.findByPlaceholderText("Add a comment…")
  },
}

/** See-feedback (read-only) view of a step with a graded assessment. */
export const SeeFeedbackStep: Story = {
  name: "Feedback (See): Step",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="Sfc"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("step-1", "sfcStep", { name: "Step 1" }))
        diagram.getState().setAssessments({
          "step-1": {
            modelElementId: "step-1",
            elementType: "node",
            score: 3,
            feedback: "Correct initial step for this sequence.",
          },
        })
      }}
    >
      <DefaultNodeSeeFeedbackPopover elementId="step-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score + feedback are rendered read-only.
    await canvas.findByText("+3")
    await canvas.findByText("Correct initial step for this sequence.")
  },
}

/** Give-feedback form for an SFC transition edge — a single score + comment row. */
export const GiveFeedbackTransition: Story = {
  name: "Feedback (Give): Transition",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="Sfc"
      seed={(diagram) => {
        diagram.getState().addNode(makeNode("a", "sfcStep", { name: "Step 1" }))
        diagram.getState().addNode(makeNode("b", "sfcStep", { name: "Step 2" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "SfcDiagramEdge", "a", "b", {
            label: JSON.stringify({
              isNegated: false,
              displayName: "start & ready",
              showBar: true,
            }),
          })
        )
      }}
    >
      <EdgeGiveFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge feedback box renders a single Points + Feedback form.
    await canvas.findByPlaceholderText("0")
    await canvas.findByPlaceholderText("Add a comment…")
  },
}

/**
 * See-feedback (read-only) view of an SFC transition edge with a graded
 * assessment. The SfcDiagramEdge See routes to the shared EdgeSeeFeedbackPopover.
 */
export const SeeFeedbackTransition: Story = {
  name: "Feedback (See): Transition",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="Sfc"
      seed={(diagram) => {
        diagram.getState().addNode(makeNode("a", "sfcStep", { name: "Step 1" }))
        diagram.getState().addNode(makeNode("b", "sfcStep", { name: "Step 2" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "SfcDiagramEdge", "a", "b", {
            label: JSON.stringify({
              isNegated: false,
              displayName: "start & ready",
              showBar: true,
            }),
          })
        )
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 2,
            feedback: "Transition condition fires the next step correctly.",
          },
        })
      }}
    >
      <EdgeSeeFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded edge score + feedback render read-only.
    await canvas.findByText("+2")
    await canvas.findByText(
      "Transition condition fires the next step correctly."
    )
  },
}
