import type { Meta, StoryObj } from "@storybook/react-vite"
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

const meta = {
  title: "Editor/Use Case Diagram",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

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
}

/** Association editor — edge-type select, swap, connection info, label. */
export const EditAssociation: Story = {
  name: "Edit: Association",
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
}

/** Include editor — same form, type pinned to «include» (no label field). */
export const EditInclude: Story = {
  name: "Edit: Include",
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
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Use cases render via the shared DEFAULT node, so these also exercise the
// DefaultNode give/see feedback popovers used across most diagram families.
// Give = the grader's score + comment form; See = the read-only review, which
// reads from the diagram store's `assessments` map (keyed by model-element id).

/** Give-feedback form for a use case (shared default-node feedback popover). */
export const GiveFeedbackUseCase: Story = {
  name: "Feedback (Give): Use Case",
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
}

/** See-feedback (read-only) view of a use case with a graded assessment. */
export const SeeFeedbackUseCase: Story = {
  name: "Feedback (See): Use Case",
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
}
