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
import { CommunicationObjectNameEditPopover } from "@tumaet/apollon/components/popovers/communicationDiagram/CommunicationObjectNameEditPopover"
import { CommunicationObjectNameGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/communicationDiagram/CommunicationObjectNameGiveFeedbackPopover"
import { CommunicationObjectNameSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/communicationDiagram/CommunicationObjectNameSeeFeedbackPopover"
import { CommunicationDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/CommunicationDiagramEdgeEditPopover"

const meta = {
  title: "Editor/Communication Diagram",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

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
}

/** Message link editor — style controls plus the directed message list. */
export const EditCommunicationLink: Story = {
  name: "Edit: Communication Link",
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
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Give = the grader's score + comment form; See = the read-only review. The See
// story seeds the diagram store's `assessments` map (keyed by model-element id),
// which is where SeeFeedbackAssessmentBox reads score/feedback via getAssessment.

/** Give-feedback form for a communication object — score + comment per row. */
export const GiveFeedbackCommunicationObject: Story = {
  name: "Feedback (Give): Communication Object",
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
}

/** See-feedback (read-only) view of a communication object with an assessment. */
export const SeeFeedbackCommunicationObject: Story = {
  name: "Feedback (See): Communication Object",
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
}
