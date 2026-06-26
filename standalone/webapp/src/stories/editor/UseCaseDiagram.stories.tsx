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
    // Points/Feedback are field LABELS now (placeholder is "0"), not placeholders.
    await canvas.findByLabelText("Points")
    await canvas.findByLabelText("Feedback")
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
    // The seeded node score renders as a signed tone badge (+3); the feedback
    // is read-only text.
    await canvas.findByText("+3")
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
    // Points/Feedback are field LABELS now (placeholder is "0"), not placeholders.
    await canvas.findByLabelText("Points")
    await canvas.findByLabelText("Feedback")
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
    // The seeded edge score renders as a signed tone badge (+2); the feedback
    // is read-only text under the edge header.
    await canvas.findByText("UseCaseAssociation")
    await canvas.findByText("+2")
    await canvas.findByText(
      "The actor should associate with the use case directly."
    )
  },
}

// ── Assessment editor (full editor, grading mode) ────────────────────────────
/** The full editor in Assessment mode — click an element to give feedback. */
export const Assessment: Story = {
  name: "Assessment: Give Feedback",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={fixtureByType.UseCaseDiagram} />,
}

// The shipped UseCaseDiagram fixture has `assessments: {}`, so the read-only
// review surface would render an entirely UNGRADED diagram. Spread a real
// assessment map (keyed by the fixture's actual node / edge ids — read from
// tests/fixtures/use-case-diagram.json) so the canvas shows every on-canvas
// AssessmentIcon state at once: score>0 → green check, score<0 → red cross,
// score===0 → blue warn, plus graded-without-feedback, while several elements
// (Online Store, Admin, Premium Customer, …) stay ungraded (no icon).
const A = (
  modelElementId: string,
  elementType: string,
  score: number,
  feedback?: string
): Assessment => ({ modelElementId, elementType, score, feedback })

const gradedUseCaseModel: UMLModel = {
  ...fixtureByType.UseCaseDiagram,
  assessments: {
    // ── green (score > 0) ──
    "880e8400-e29b-41d4-a716-446655440031": A(
      "880e8400-e29b-41d4-a716-446655440031",
      "node",
      5,
      "Customer is the correct primary actor."
    ),
    "edge-assoc-customer-browse": A(
      "edge-assoc-customer-browse",
      "edge",
      2,
      "Correct association between the actor and the use case."
    ),
    // ── red (score < 0) ──
    "880e8400-e29b-41d4-a716-446655440033": A(
      "880e8400-e29b-41d4-a716-446655440033",
      "node",
      -1,
      "Browse Products should sit inside the system boundary differently."
    ),
    "edge-include-order-browse": A(
      "edge-include-order-browse",
      "edge",
      -1,
      "This «include» points the wrong way around."
    ),
    // ── blue (score === 0) ──
    "880e8400-e29b-41d4-a716-446655440034": A(
      "880e8400-e29b-41d4-a716-446655440034",
      "node",
      0,
      "Acceptable, but adds no points here."
    ),
    // ── graded, but no feedback (icon shows, no comment) ──
    "880e8400-e29b-41d4-a716-446655440035": A(
      "880e8400-e29b-41d4-a716-446655440035",
      "node",
      3
    ),
    // Online Store (…440030), Admin (…440032), Premium Customer (…440036) and
    // the remaining edges are intentionally left UNGRADED (no icon).
  },
}

/**
 * The full editor in Assessment + readonly mode — the see-feedback review
 * surface, rendered over a fully GRADED model so every on-canvas
 * AssessmentIcon state shows: green check (score>0), red cross (score<0),
 * blue warn (score===0), plus graded-without-feedback, with several elements
 * left ungraded.
 */
export const AssessmentReview: Story = {
  name: "Assessment: See Feedback (graded)",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={gradedUseCaseModel} readonly />,
}
