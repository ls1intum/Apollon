import type { Meta, StoryObj } from "@storybook/react-vite"
import { within, expect } from "storybook/test"
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
import { CommunicationObjectNameEditPopover } from "@tumaet/apollon/components/popovers/communicationDiagram/CommunicationObjectNameEditPopover"
import { CommunicationObjectNameGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/communicationDiagram/CommunicationObjectNameGiveFeedbackPopover"
import { CommunicationObjectNameSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/communicationDiagram/CommunicationObjectNameSeeFeedbackPopover"
import { CommunicationDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/CommunicationDiagramEdgeEditPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

const meta = {
  title: "Editor/Communication Diagram",
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
  render: () => <ApollonEditable model={fixtureByType.CommunicationDiagram} />,
}

/** Editable blank canvas — build a communication diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="CommunicationDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="CommunicationDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="CommunicationDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Communication object editor — name, color, attributes, methods. */
export const EditCommunicationObject: Story = {
  name: "Edit: Communication Object",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="CommunicationDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("object-1", "communicationObjectName", {
            name: "cart: ShoppingCart",
            attributes: [{ id: "a1", name: "itemCount = 3" }],
            methods: [{ id: "m1", name: "checkout()" }],
          })
        )
      }
    >
      <CommunicationObjectNameEditPopover elementId="object-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded object name is bound to the name input's value.
    await canvas.findByDisplayValue("cart: ShoppingCart")
    await canvas.findByDisplayValue("itemCount = 3")
  },
}

/** Message link editor — style controls plus the directed message list. */
export const EditCommunicationLink: Story = {
  name: "Edit: Communication Link",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="CommunicationDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "communicationObjectName", { name: "cart" }))
        diagram
          .getState()
          .addNode(
            makeNode("b", "communicationObjectName", { name: "payment" })
          )
        diagram.getState().addEdge(
          makeEdge("edge-1", "CommunicationLink", "a", "b", {
            messages: [
              { id: "msg-1", text: "1: checkout()", direction: "target" },
              { id: "msg-2", text: "2: confirm()", direction: "source" },
            ],
            labels: ["1: checkout()", "2: confirm()"],
          })
        )
      }}
    >
      <CommunicationDiagramEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge popover resolves via ReactFlow's edgeLookup (async); findBy
    // retries until the "Edge" title + "Messages" section render.
    await canvas.findByText("Edge")
    await canvas.findByText("Messages")
    // The seeded directed messages render as editable rows.
    await canvas.findByDisplayValue("1: checkout()")
  },
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Give = the grader's score + comment form; See = the read-only review. The See
// story seeds the diagram store's `assessments` map (keyed by model-element id),
// which is where SeeFeedbackAssessmentBox reads score/feedback via getAssessment.

/** Give-feedback form for a communication object — score + comment per row. */
export const GiveFeedbackCommunicationObject: Story = {
  name: "Feedback (Give): Communication Object",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="CommunicationDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("object-1", "communicationObjectName", {
            name: "cart: ShoppingCart",
            attributes: [{ id: "a1", name: "itemCount = 3" }],
            methods: [{ id: "m1", name: "checkout()" }],
          })
        )
      }
    >
      <CommunicationObjectNameGiveFeedbackPopover elementId="object-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded object; the box renders a score + feedback form.
    await canvas.findByText("cart: ShoppingCart")
    // Points/Feedback are now FIELD LABELS (the points placeholder is "0"),
    // so query by label, not by the old placeholder text.
    const points = await canvas.findAllByLabelText("Points")
    expect(points.length).toBeGreaterThan(0)
    expect(canvas.getAllByLabelText("Feedback").length).toBeGreaterThan(0)
  },
}

/** See-feedback (read-only) view of a communication object with an assessment. */
export const SeeFeedbackCommunicationObject: Story = {
  name: "Feedback (See): Communication Object",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="CommunicationDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("object-1", "communicationObjectName", {
            name: "cart: ShoppingCart",
            attributes: [{ id: "a1", name: "itemCount = 3" }],
            methods: [{ id: "m1", name: "checkout()" }],
          })
        )
        diagram.getState().setAssessments({
          "object-1": {
            modelElementId: "object-1",
            elementType: "node",
            score: 4,
            feedback: "Names the participating object clearly.",
          },
          a1: {
            modelElementId: "a1",
            elementType: "attribute",
            score: 1,
            feedback: "Concrete state shown.",
          },
          m1: {
            modelElementId: "m1",
            elementType: "method",
            score: 2,
            feedback: "Matches a message sent to this object.",
          },
        })
      }}
    >
      <CommunicationObjectNameSeeFeedbackPopover elementId="object-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score renders as a signed tone badge (+4); the feedback
    // is read-only text.
    await canvas.findByText("+4")
    await canvas.findByText("Names the participating object clearly.")
    // The seeded attribute + method feedback render in their own rows.
    await canvas.findByText("Matches a message sent to this object.")
  },
}

/** Give-feedback form for a communication link edge — a single score + comment row. */
export const GiveFeedbackCommunicationLink: Story = {
  name: "Feedback (Give): Communication Link",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="CommunicationDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "communicationObjectName", { name: "cart" }))
        diagram
          .getState()
          .addNode(
            makeNode("b", "communicationObjectName", { name: "payment" })
          )
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "CommunicationLink", "a", "b"))
      }}
    >
      <EdgeGiveFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge feedback header names the edge by its type; the box is a form.
    await canvas.findByText("CommunicationLink")
    // Points/Feedback are field LABELS now (placeholder is "0"), not placeholders.
    await canvas.findByLabelText("Points")
    await canvas.findByLabelText("Feedback")
  },
}

/** See-feedback (read-only) view of a communication link edge with an assessment. */
export const SeeFeedbackCommunicationLink: Story = {
  name: "Feedback (See): Communication Link",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="CommunicationDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "communicationObjectName", { name: "cart" }))
        diagram
          .getState()
          .addNode(
            makeNode("b", "communicationObjectName", { name: "payment" })
          )
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "CommunicationLink", "a", "b"))
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 3,
            feedback: "Messages are numbered in the wrong call order.",
          },
        })
      }}
    >
      <EdgeSeeFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded edge score renders as a signed tone badge (+3); the feedback
    // is read-only text under the edge header.
    await canvas.findByText("CommunicationLink")
    await canvas.findByText("+3")
    await canvas.findByText("Messages are numbered in the wrong call order.")
  },
}

// ── Assessment editor (full editor, grading mode) ────────────────────────────
/** The full editor in Assessment mode — click an element to give feedback. */
export const Assessment: Story = {
  name: "Assessment: Give Feedback",
  parameters: { layout: "fullscreen" },
  render: () => (
    <ApollonAssessable model={fixtureByType.CommunicationDiagram} />
  ),
}

// The shipped CommunicationDiagram fixture has `assessments: {}`, so the
// read-only review surface would render an entirely UNGRADED diagram. Spread a
// real assessment map (keyed by the fixture's actual node / edge ids — read
// from tests/fixtures/communication-diagram.json) so the canvas shows every
// on-canvas AssessmentIcon state at once: score>0 → green check, score<0 → red
// cross, score===0 → blue warn, plus graded-without-feedback, while >=1 element
// stays ungraded (no icon).
const A = (
  modelElementId: string,
  elementType: string,
  score: number,
  feedback?: string
): Assessment => ({ modelElementId, elementType, score, feedback })

const gradedCommunicationModel: UMLModel = {
  ...fixtureByType.CommunicationDiagram,
  assessments: {
    // ── green (score > 0) ──
    "990e8400-e29b-41d4-a716-446655440040": A(
      "990e8400-e29b-41d4-a716-446655440040",
      "node",
      4,
      "Names the participating object clearly."
    ),
    "edge-comm-client-server": A(
      "edge-comm-client-server",
      "edge",
      2,
      "Request/response messages are numbered correctly."
    ),
    // ── red (score < 0) ──
    "990e8400-e29b-41d4-a716-446655440041": A(
      "990e8400-e29b-41d4-a716-446655440041",
      "node",
      -2,
      "The server object is missing its class type."
    ),
    // ── blue (score === 0) ──
    "990e8400-e29b-41d4-a716-446655440042": A(
      "990e8400-e29b-41d4-a716-446655440042",
      "node",
      0,
      "Acceptable, but adds no points here."
    ),
    // ── graded, but no feedback (icon shows, no comment) ──
    a1: A("a1", "attribute", 1),
    // edge-comm-server-db and the remaining attributes are intentionally left
    // UNGRADED (no icon).
  },
}

/**
 * The full editor in Assessment + readonly mode — the see-feedback review
 * surface, rendered over a fully GRADED model so every on-canvas
 * AssessmentIcon state shows: green check (score>0), red cross (score<0),
 * blue warn (score===0), plus graded-without-feedback, with the remaining
 * element left ungraded.
 */
export const AssessmentReview: Story = {
  name: "Assessment: See Feedback (graded)",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={gradedCommunicationModel} readonly />,
}
