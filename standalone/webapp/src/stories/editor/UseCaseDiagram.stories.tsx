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
import { DefaultNodeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeGiveFeedbackPopover"
import { DefaultNodeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeSeeFeedbackPopover"
import { UseCaseEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/UseCaseDiagramEdgeEditPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

const meta = {
  title: "Editor/Use Case Diagram",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// The lightweight popover-harness stories below run in the Vitest runner: the
// `["test","!autodocs","!dev"]` tag overrides editorStoryMeta's `!test`, and a
// `play` asserts the seeded content actually rendered (so a regression that
// blanks a popover fails the suite rather than passing silently). The full
// editor stories (Playground/Blank) stay untestable — they mount a 2nd editor.
const popoverTags = ["autodocs", "test"]

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.UseCaseDiagram} />,
}

/** Editable blank canvas — build a use case diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="UseCaseDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="UseCaseDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="UseCaseDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Use-case editor — the shared default node editor (name + style). */
export const EditUseCase: Story = {
  name: "Edit: Use Case",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("usecase-1", "useCase", {
            name: "Place Order",
          })
        )
      }
    >
      <DefaultNodeEditPopover elementId="usecase-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded use-case name is bound to the name input's value.
    await canvas.findByDisplayValue("Place Order")
  },
}

/** Association editor — edge-type select, swap, connection info, label. */
export const EditAssociation: Story = {
  name: "Edit: Association",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "useCaseActor", { name: "Customer" }))
        diagram
          .getState()
          .addNode(makeNode("b", "useCase", { name: "Place Order" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "UseCaseAssociation", "a", "b", {
            label: "places",
          })
        )
      }}
    >
      <UseCaseEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge popover resolves via ReactFlow's edgeLookup (async); findBy
    // retries until the "Edge" title renders.
    await canvas.findByText("Edge")
    // The seeded edge label is editable in the Label section.
    await canvas.findByDisplayValue("places")
  },
}

/** Include editor — same form, type pinned to «include» (no label field). */
export const EditInclude: Story = {
  name: "Edit: Include",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "useCase", { name: "Place Order" }))
        diagram
          .getState()
          .addNode(makeNode("b", "useCase", { name: "Validate Cart" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "UseCaseInclude", "a", "b", {}))
      }}
    >
      <UseCaseEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge popover resolves via ReactFlow's edgeLookup (async).
    await canvas.findByText("Edge")
  },
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Use cases render via the shared DEFAULT node, so these also exercise the
// DefaultNode give/see feedback popovers used across most diagram families.
// Give = the grader's score + comment form; See = the read-only review, which
// reads from the diagram store's `assessments` map (keyed by model-element id).

/** Give-feedback form for a use case (shared default-node feedback popover). */
export const GiveFeedbackUseCase: Story = {
  name: "Feedback (Give): Use Case",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      seed={(diagram) =>
        diagram
          .getState()
          .addNode(makeNode("usecase-1", "useCase", { name: "Place Order" }))
      }
    >
      <DefaultNodeGiveFeedbackPopover elementId="usecase-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded use case; the box renders a score + feedback form.
    await canvas.findByText("Place Order")
    await canvas.findByPlaceholderText("Points")
    await canvas.findByPlaceholderText("Feedback")
  },
}

/** See-feedback (read-only) view of a use case with a graded assessment. */
export const SeeFeedbackUseCase: Story = {
  name: "Feedback (See): Use Case",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("usecase-1", "useCase", { name: "Place Order" }))
        diagram.getState().setAssessments({
          "usecase-1": {
            modelElementId: "usecase-1",
            elementType: "node",
            score: 3,
            feedback: "Clear, goal-oriented use-case name.",
          },
        })
      }}
    >
      <DefaultNodeSeeFeedbackPopover elementId="usecase-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score + feedback are rendered read-only.
    await canvas.findByText("3")
    await canvas.findByText("Clear, goal-oriented use-case name.")
  },
}

/** Give-feedback form for a use-case association edge — a single score + comment row. */
export const GiveFeedbackAssociation: Story = {
  name: "Feedback (Give): Association",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "useCaseActor", { name: "Customer" }))
        diagram
          .getState()
          .addNode(makeNode("b", "useCase", { name: "Place Order" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "UseCaseAssociation", "a", "b"))
      }}
    >
      <EdgeGiveFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge feedback header names the edge by its type; the box is a form.
    await canvas.findByText("UseCaseAssociation")
    await canvas.findByPlaceholderText("Points")
    await canvas.findByPlaceholderText("Feedback")
  },
}

/** See-feedback (read-only) view of a use-case association edge with an assessment. */
export const SeeFeedbackAssociation: Story = {
  name: "Feedback (See): Association",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "useCaseActor", { name: "Customer" }))
        diagram
          .getState()
          .addNode(makeNode("b", "useCase", { name: "Place Order" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "UseCaseAssociation", "a", "b"))
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 2,
            feedback: "The actor should associate with the use case directly.",
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
    await canvas.findByText("UseCaseAssociation")
    await canvas.findByText("2")
    await canvas.findByText(
      "The actor should associate with the use case directly."
    )
  },
}
