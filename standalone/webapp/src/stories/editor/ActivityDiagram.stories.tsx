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
import { ActivitySwimlaneEditPopover } from "@tumaet/apollon/components/popovers/activityDiagram/ActivitySwimlaneEditPopover"
import { ActivityDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ActivityDiagramEdgeEditPopover"
import { DefaultNodeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeGiveFeedbackPopover"
import { DefaultNodeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeSeeFeedbackPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

// Popover-harness feedback stories run in the Vitest runner: the
// ["autodocs","test"] tag keeps them scannable in Docs AND test-gated, and
// each `play` asserts the seeded content rendered (so a regression that blanks
// a popover fails the suite rather than passing silently).
const popoverTags = ["autodocs", "test"]

const meta = {
  title: "Editor/Activity Diagram",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.ActivityDiagram} />,
}

/** Editable blank canvas — build an activity diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="ActivityDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ActivityDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ActivityDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Swimlane editor — name, orientation, and a reorderable list of lanes. */
export const EditSwimlane: Story = {
  name: "Edit: Swimlane",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode(
            "swimlane-1",
            "activitySwimlane",
            {
              name: "Order Processing",
              orientation: "vertical",
              lanes: [
                { id: "lane-1", name: "Customer", size: 200 },
                { id: "lane-2", name: "Sales", size: 200 },
                { id: "lane-3", name: "Warehouse", size: 200 },
              ],
            },
            { width: 600, height: 300 }
          )
        )
      }
    >
      <ActivitySwimlaneEditPopover elementId="swimlane-1" />
    </SeededPopoverHarness>
  ),
}

/** Control-flow editor — style, swap, label. */
export const EditControlFlow: Story = {
  name: "Edit: Control Flow",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "activityActionNode", { name: "Submit" }))
        diagram
          .getState()
          .addNode(makeNode("b", "activityActionNode", { name: "Review" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "ActivityControlFlow", "a", "b", {
            label: "approved",
          })
        )
      }}
    >
      <ActivityDiagramEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Action nodes render via the shared DEFAULT node, so these exercise the
// DefaultNode give/see feedback popovers. Give = the grader's score + comment
// form; See = the read-only review, which reads from the diagram store's
// `assessments` map (keyed by model-element id).

/** Give-feedback form for an action node (shared default-node feedback popover). */
export const GiveFeedbackAction: Story = {
  name: "Feedback (Give): Action",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      seed={(diagram) =>
        diagram
          .getState()
          .addNode(
            makeNode("action-1", "activityActionNode", { name: "Submit Order" })
          )
      }
    >
      <DefaultNodeGiveFeedbackPopover elementId="action-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded action; the box renders a score + feedback form.
    await canvas.findByText("Submit Order")
    await canvas.findByText("Points")
    await canvas.findByText("Feedback")
  },
}

/** See-feedback (read-only) view of an action node with a graded assessment. */
export const SeeFeedbackAction: Story = {
  name: "Feedback (See): Action",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(
            makeNode("action-1", "activityActionNode", { name: "Submit Order" })
          )
        diagram.getState().setAssessments({
          "action-1": {
            modelElementId: "action-1",
            elementType: "node",
            score: 3,
            feedback: "Clear, verb-first action name.",
          },
        })
      }}
    >
      <DefaultNodeSeeFeedbackPopover elementId="action-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score + feedback are rendered read-only.
    await canvas.findByText("+3")
    await canvas.findByText("Clear, verb-first action name.")
  },
}

/** Give-feedback form for a control-flow edge — a single score + comment row. */
export const GiveFeedbackControlFlow: Story = {
  name: "Feedback (Give): Control Flow",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "activityActionNode", { name: "Submit" }))
        diagram
          .getState()
          .addNode(makeNode("b", "activityActionNode", { name: "Review" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "ActivityControlFlow", "a", "b"))
      }}
    >
      <EdgeGiveFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge feedback header names the edge by its type; the box is a form.
    await canvas.findByText("ActivityControlFlow")
    await canvas.findByText("Points")
    await canvas.findByText("Feedback")
  },
}

/** See-feedback (read-only) view of a control-flow edge with an assessment. */
export const SeeFeedbackControlFlow: Story = {
  name: "Feedback (See): Control Flow",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "activityActionNode", { name: "Submit" }))
        diagram
          .getState()
          .addNode(makeNode("b", "activityActionNode", { name: "Review" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "ActivityControlFlow", "a", "b"))
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 2,
            feedback: "The guard condition should label this control flow.",
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
    await canvas.findByText("ActivityControlFlow")
    await canvas.findByText("+2")
    await canvas.findByText(
      "The guard condition should label this control flow."
    )
  },
}
