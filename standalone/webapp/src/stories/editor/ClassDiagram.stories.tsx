import type { Meta, StoryObj } from "@storybook/react-vite"
import type { UMLModel } from "@tumaet/apollon"
import {
  editorStoryMeta,
  ApollonEditable,
  ApollonAssessable,
  ApollonFixture,
  fixtureByType,
  EditorStoreDecorator,
  ElementGallery,
  EdgeGallery,
  SeededPopoverHarness,
  makeNode,
  makeEdge,
} from "../_support/editor"
import { ClassEditPopover } from "@tumaet/apollon/components/popovers/classDiagram/ClassEditPopover"
import { ClassGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/classDiagram/ClassGiveFeedbackPopover"
import { ClassSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/classDiagram/ClassSeeFeedbackPopover"
import { EdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ClassDiagramEdgeEditPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

import adapter from "assets/diagramTemplates/Adapter.json"
import bridge from "assets/diagramTemplates/Bridge.json"
import command from "assets/diagramTemplates/Command.json"
import observer from "assets/diagramTemplates/Observer.json"
import factory from "assets/diagramTemplates/Factory.json"

const meta = {
  title: "Editor/Class Diagram",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const asModel = (m: unknown) => m as unknown as UMLModel

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.ClassDiagram} />,
}

/** Editable blank canvas — build a class diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="ClassDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ClassDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ClassDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Class node editor — name, stereotype, attributes, methods. */
export const EditClass: Story = {
  name: "Edit: Class",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("class-1", "class", {
            name: "Account",
            stereotype: undefined,
            attributes: [{ id: "a1", name: "+ balance: number" }],
            methods: [{ id: "m1", name: "+ deposit(amount)" }],
          })
        )
      }
    >
      <ClassEditPopover elementId="class-1" />
    </SeededPopoverHarness>
  ),
}

/** Association editor — type, swap, source/target role + multiplicity. */
export const EditAssociation: Story = {
  name: "Edit: Association",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      width={360}
      seed={(diagram) => {
        diagram.getState().addNode(makeNode("a", "class", { name: "A" }))
        diagram.getState().addNode(makeNode("b", "class", { name: "B" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "ClassBidirectional", "a", "b", {
            sourceRole: "owner",
            sourceMultiplicity: "1",
            targetRole: "items",
            targetMultiplicity: "*",
          })
        )
      }}
    >
      <EdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Give = the grader's input form (score + comment per element row); See =
// the read-only review of a stored assessment. The See stories seed the
// diagram store's `assessments` map (keyed by model-element id), which is where
// SeeFeedbackAssessmentBox reads its score/feedback from via `getAssessment`.

/** Give-feedback form for a class node — score + comment for node, attrs, methods. */
export const GiveFeedbackClass: Story = {
  name: "Feedback (Give): Class",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("class-1", "class", {
            name: "Account",
            attributes: [{ id: "a1", name: "+ balance: number" }],
            methods: [{ id: "m1", name: "+ deposit(amount)" }],
          })
        )
      }
    >
      <ClassGiveFeedbackPopover elementId="class-1" />
    </SeededPopoverHarness>
  ),
}

/** See-feedback (read-only) view of a class node with a graded assessment. */
export const SeeFeedbackClass: Story = {
  name: "Feedback (See): Class",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("class-1", "class", {
            name: "Account",
            attributes: [{ id: "a1", name: "+ balance: number" }],
            methods: [{ id: "m1", name: "+ deposit(amount)" }],
          })
        )
        diagram.getState().setAssessments({
          "class-1": {
            modelElementId: "class-1",
            elementType: "node",
            score: 8,
            feedback: "Good class — balance should be private, not public.",
          },
          a1: {
            modelElementId: "a1",
            elementType: "attribute",
            score: 2,
            feedback: "Correct type and visibility.",
          },
          m1: {
            modelElementId: "m1",
            elementType: "method",
            score: 3,
            feedback: "Validate that the amount is positive.",
          },
        })
      }}
    >
      <ClassSeeFeedbackPopover elementId="class-1" />
    </SeededPopoverHarness>
  ),
}

/** Give-feedback form for an association edge — a single score + comment row. */
export const GiveFeedbackAssociation: Story = {
  name: "Feedback (Give): Association",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(makeNode("a", "class", { name: "A" }))
        diagram.getState().addNode(makeNode("b", "class", { name: "B" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "ClassBidirectional", "a", "b"))
      }}
    >
      <EdgeGiveFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

/** See-feedback (read-only) view of an association edge with a graded assessment. */
export const SeeFeedbackAssociation: Story = {
  name: "Feedback (See): Association",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(makeNode("a", "class", { name: "A" }))
        diagram.getState().addNode(makeNode("b", "class", { name: "B" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "ClassBidirectional", "a", "b"))
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 1,
            feedback: "Multiplicity is missing on the target end.",
          },
        })
      }}
    >
      <EdgeSeeFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

// ── Assessment editor (full editor, grading mode) ────────────────────────────
/** The full editor in Assessment mode — click an element to give feedback. */
export const Assessment: Story = {
  name: "Assessment: Give Feedback",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={fixtureByType.ClassDiagram} />,
}

/** The full editor in Assessment + readonly mode — the see-feedback review surface. */
export const AssessmentReview: Story = {
  name: "Assessment: See Feedback",
  parameters: { layout: "fullscreen" },
  render: () => (
    <ApollonAssessable model={fixtureByType.ClassDiagram} readonly />
  ),
}

// ── Templates (GoF starters) ─────────────────────────────────────────────────
export const TemplateAdapter: Story = {
  name: "Template: Adapter",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(adapter)} />,
}
export const TemplateBridge: Story = {
  name: "Template: Bridge",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(bridge)} />,
}
export const TemplateCommand: Story = {
  name: "Template: Command",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(command)} />,
}
export const TemplateObserver: Story = {
  name: "Template: Observer",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(observer)} />,
}
export const TemplateFactory: Story = {
  name: "Template: Factory",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(factory)} />,
}
