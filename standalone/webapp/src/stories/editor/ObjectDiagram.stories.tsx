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
import { ObjectEditPopover } from "@tumaet/apollon/components/popovers/objectDiagram/ObjectEditPopover"
import { ObjectGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/objectDiagram/ObjectGiveFeedbackPopover"
import { ObjectSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/objectDiagram/ObjectSeeFeedbackPopover"
import { ObjectDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ObjectDiagramEdgeEditPopover"

const meta = {
  title: "Editor/Object Diagram",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

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
}

/** Object link editor — line/style controls for the association between objects. */
export const EditObjectLink: Story = {
  name: "Edit: Object Link",
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
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Give = the grader's score + comment form; See = the read-only review. The See
// story seeds the diagram store's `assessments` map (keyed by model-element id),
// which is where SeeFeedbackAssessmentBox reads score/feedback via getAssessment.

/** Give-feedback form for an object node — score + comment for node, attrs, methods. */
export const GiveFeedbackObject: Story = {
  name: "Feedback (Give): Object",
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
}

/** See-feedback (read-only) view of an object node with a graded assessment. */
export const SeeFeedbackObject: Story = {
  name: "Feedback (See): Object",
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
}
