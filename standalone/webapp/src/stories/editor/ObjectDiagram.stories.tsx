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
import { ObjectEditPopover } from "@tumaet/apollon/components/popovers/objectDiagram/ObjectEditPopover"
import { ObjectGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/objectDiagram/ObjectGiveFeedbackPopover"
import { ObjectSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/objectDiagram/ObjectSeeFeedbackPopover"
import { ObjectDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ObjectDiagramEdgeEditPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

const meta = {
  title: "Editor/Object Diagram",
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
  render: () => <ApollonEditable model={fixtureByType.ObjectDiagram} />,
}

/** Editable blank canvas — build an object diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="ObjectDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ObjectDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ObjectDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Object node editor — name, color, attributes, methods. */
export const EditObject: Story = {
  name: "Edit: Object",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ObjectDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("object-1", "objectName", {
            name: "account: Account",
            attributes: [{ id: "a1", name: "balance = 1200" }],
            methods: [{ id: "m1", name: "deposit(amount)" }],
          })
        )
      }
    >
      <ObjectEditPopover elementId="object-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded object name is bound to the name input's value.
    await canvas.findByDisplayValue("account: Account")
    // The seeded attribute row is also editable.
    await canvas.findByDisplayValue("balance = 1200")
  },
}

/** Object link editor — line/style controls for the association between objects. */
export const EditObjectLink: Story = {
  name: "Edit: Object Link",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ObjectDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "objectName", { name: "order: Order" }))
        diagram
          .getState()
          .addNode(makeNode("b", "objectName", { name: "customer: Customer" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "ObjectLink", "a", "b", { label: "" }))
      }}
    >
      <ObjectDiagramEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge popover resolves via ReactFlow's edgeLookup (async); findBy
    // retries until the "Edge" title header renders.
    await canvas.findByText("Edge")
  },
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Give = the grader's score + comment form; See = the read-only review. The See
// story seeds the diagram store's `assessments` map (keyed by model-element id),
// which is where SeeFeedbackAssessmentBox reads score/feedback via getAssessment.

/** Give-feedback form for an object node — score + comment for node, attrs, methods. */
export const GiveFeedbackObject: Story = {
  name: "Feedback (Give): Object",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ObjectDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("object-1", "objectName", {
            name: "account: Account",
            attributes: [{ id: "a1", name: "balance = 1200" }],
            methods: [{ id: "m1", name: "deposit(amount)" }],
          })
        )
      }
    >
      <ObjectGiveFeedbackPopover elementId="object-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded object; the box renders a score + feedback form.
    await canvas.findByText("account: Account")
    // Points/Feedback are now FIELD LABELS (the points placeholder is "0"),
    // so query by label, not by the old placeholder text.
    const points = await canvas.findAllByLabelText("Points")
    expect(points.length).toBeGreaterThan(0)
    expect(canvas.getAllByLabelText("Feedback").length).toBeGreaterThan(0)
  },
}

/** See-feedback (read-only) view of an object node with a graded assessment. */
export const SeeFeedbackObject: Story = {
  name: "Feedback (See): Object",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ObjectDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("object-1", "objectName", {
            name: "account: Account",
            attributes: [{ id: "a1", name: "balance = 1200" }],
            methods: [{ id: "m1", name: "deposit(amount)" }],
          })
        )
        diagram.getState().setAssessments({
          "object-1": {
            modelElementId: "object-1",
            elementType: "node",
            score: 5,
            feedback: "Correct instance — names the class it instantiates.",
          },
          a1: {
            modelElementId: "a1",
            elementType: "attribute",
            score: 2,
            feedback: "Concrete value supplied, good.",
          },
          m1: {
            modelElementId: "m1",
            elementType: "method",
            score: 0,
            feedback: "Objects typically omit methods in an object diagram.",
          },
        })
      }}
    >
      <ObjectSeeFeedbackPopover elementId="object-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score renders as a signed tone badge (+5); the feedback
    // is read-only text.
    await canvas.findByText("+5")
    await canvas.findByText(
      "Correct instance — names the class it instantiates."
    )
    // The seeded attribute + method feedback render in their own rows.
    await canvas.findByText("Concrete value supplied, good.")
  },
}

/** Give-feedback form for an object link edge — a single score + comment row. */
export const GiveFeedbackObjectLink: Story = {
  name: "Feedback (Give): Object Link",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ObjectDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "objectName", { name: "order: Order" }))
        diagram
          .getState()
          .addNode(makeNode("b", "objectName", { name: "customer: Customer" }))
        diagram.getState().addEdge(makeEdge("edge-1", "ObjectLink", "a", "b"))
      }}
    >
      <EdgeGiveFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge feedback header names the edge by its type; the box is a form.
    await canvas.findByText("ObjectLink")
    // Points/Feedback are field LABELS now (placeholder is "0"), not placeholders.
    await canvas.findByLabelText("Points")
    await canvas.findByLabelText("Feedback")
  },
}

/** See-feedback (read-only) view of an object link edge with a graded assessment. */
export const SeeFeedbackObjectLink: Story = {
  name: "Feedback (See): Object Link",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ObjectDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "objectName", { name: "order: Order" }))
        diagram
          .getState()
          .addNode(makeNode("b", "objectName", { name: "customer: Customer" }))
        diagram.getState().addEdge(makeEdge("edge-1", "ObjectLink", "a", "b"))
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 2,
            feedback: "The link should be undirected between these objects.",
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
    await canvas.findByText("ObjectLink")
    await canvas.findByText("+2")
    await canvas.findByText(
      "The link should be undirected between these objects."
    )
  },
}

// ── Assessment editor (full editor, grading mode) ────────────────────────────
/** The full editor in Assessment mode — click an element to give feedback. */
export const Assessment: Story = {
  name: "Assessment: Give Feedback",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={fixtureByType.ObjectDiagram} />,
}

// The shipped ObjectDiagram fixture has `assessments: {}`, so the read-only
// review surface would render an entirely UNGRADED diagram. Spread a real
// assessment map (keyed by the fixture's actual node / edge ids — read from
// tests/fixtures/object-diagram.json) so the canvas shows every on-canvas
// AssessmentIcon state at once: score>0 → green check, score<0 → red cross,
// score===0 → blue warn, plus graded-without-feedback, while >=1 element stays
// ungraded (no icon).
const A = (
  modelElementId: string,
  elementType: string,
  score: number,
  feedback?: string
): Assessment => ({ modelElementId, elementType, score, feedback })

const gradedObjectModel: UMLModel = {
  ...fixtureByType.ObjectDiagram,
  assessments: {
    // ── green (score > 0) ──
    "660e8400-e29b-41d4-a716-446655440010": A(
      "660e8400-e29b-41d4-a716-446655440010",
      "node",
      5,
      "Correct instance — names the class it instantiates."
    ),
    "edge-link-dog-owner": A(
      "edge-link-dog-owner",
      "edge",
      2,
      "Correct link between the two objects."
    ),
    // ── red (score < 0) ──
    "660e8400-e29b-41d4-a716-446655440011": A(
      "660e8400-e29b-41d4-a716-446655440011",
      "node",
      -1,
      "The owner object is missing its class type."
    ),
    // ── blue (score === 0) ──
    "660e8400-e29b-41d4-a716-446655440012": A(
      "660e8400-e29b-41d4-a716-446655440012",
      "node",
      0,
      "Acceptable, but adds no points here."
    ),
    // ── graded, but no feedback (icon shows, no comment) ──
    a1: A("a1", "attribute", 1),
    // edge-link-dog-collar and the remaining attributes are intentionally left
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
  render: () => <ApollonAssessable model={gradedObjectModel} readonly />,
}
