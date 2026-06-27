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
import { DeploymentComponentEditPopover } from "@tumaet/apollon/components/popovers/deploymentDiagram/DeploymentComponentEditPopover"
import { DeploymentNodeEditPopover } from "@tumaet/apollon/components/popovers/deploymentDiagram/DeploymentNodeEditPopover"
import { DeploymentEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/DeploymentDiagramEdgeEditPopover"
import { DefaultNodeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeGiveFeedbackPopover"
import { DefaultNodeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeSeeFeedbackPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

const meta = {
  title: "Editor/Deployment Diagram",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Popover-harness feedback stories run in the Vitest runner: the
// ["autodocs","test"] tag keeps them scannable in Docs AND test-gated, and
// each `play` asserts the seeded content rendered (so a regression that blanks
// a popover fails the suite rather than passing silently).
const popoverTags = ["autodocs", "test"]

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.DeploymentDiagram} />,
}

/** Editable blank canvas — build a deployment diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="DeploymentDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="DeploymentDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="DeploymentDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Deployment-component node editor — name + component-header toggle. */
export const EditDeploymentComponent: Story = {
  name: "Edit: Component",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="DeploymentDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("component-1", "deploymentComponent", {
            name: "WebApp",
            isComponentHeaderShown: true,
          })
        )
      }
    >
      <DeploymentComponentEditPopover elementId="component-1" />
    </SeededPopoverHarness>
  ),
}

/** Deployment-node editor — name, header toggle, and a stereotype field. */
export const EditDeploymentNode: Story = {
  name: "Edit: Node",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="DeploymentDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("node-1", "deploymentNode", {
            name: "ApplicationServer",
            stereotype: "«device»",
            isComponentHeaderShown: true,
          })
        )
      }
    >
      <DeploymentNodeEditPopover elementId="node-1" />
    </SeededPopoverHarness>
  ),
}

/** Association edge editor — line style, swap, edge type, label, connection info. */
export const EditDeploymentAssociation: Story = {
  name: "Edit: Association",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="DeploymentDiagram"
      width={360}
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("source", "deploymentNode", {
            name: "ApplicationServer",
            stereotype: "«device»",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().addNode(
          makeNode("target", "deploymentNode", {
            name: "DatabaseServer",
            stereotype: "«device»",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().addEdge(
          makeEdge("edge-1", "DeploymentAssociation", "source", "target", {
            label: "TCP/IP",
          })
        )
      }}
    >
      <DeploymentEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Deployment nodes render via the shared DEFAULT node, so these exercise the
// DefaultNode give/see feedback popovers. Give = the grader's score + comment
// form; See = the read-only review, which reads from the diagram store's
// `assessments` map (keyed by model-element id).

/** Give-feedback form for a deployment node (shared default-node feedback popover). */
export const GiveFeedbackNode: Story = {
  name: "Feedback (Give): Node",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="DeploymentDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("node-1", "deploymentNode", {
            name: "ApplicationServer",
            stereotype: "«device»",
            isComponentHeaderShown: true,
          })
        )
      }
    >
      <DefaultNodeGiveFeedbackPopover elementId="node-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded node; the box renders a score + feedback form.
    await canvas.findByText("ApplicationServer")
    await canvas.findByText("Points")
    await canvas.findByText("Feedback")
  },
}

/** See-feedback (read-only) view of a deployment node with a graded assessment. */
export const SeeFeedbackNode: Story = {
  name: "Feedback (See): Node",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="DeploymentDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("node-1", "deploymentNode", {
            name: "ApplicationServer",
            stereotype: "«device»",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().setAssessments({
          "node-1": {
            modelElementId: "node-1",
            elementType: "node",
            score: 3,
            feedback: "Correct «device» stereotype for this server node.",
          },
        })
      }}
    >
      <DefaultNodeSeeFeedbackPopover elementId="node-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score + feedback are rendered read-only.
    await canvas.findByText("+3")
    await canvas.findByText("Correct «device» stereotype for this server node.")
  },
}

/** Give-feedback form for an association edge — a single score + comment row. */
export const GiveFeedbackAssociation: Story = {
  name: "Feedback (Give): Association",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="DeploymentDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("source", "deploymentNode", {
            name: "ApplicationServer",
            stereotype: "«device»",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().addNode(
          makeNode("target", "deploymentNode", {
            name: "DatabaseServer",
            stereotype: "«device»",
            isComponentHeaderShown: true,
          })
        )
        diagram
          .getState()
          .addEdge(
            makeEdge("edge-1", "DeploymentAssociation", "source", "target")
          )
      }}
    >
      <EdgeGiveFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge feedback header names the edge by its type; the box is a form.
    await canvas.findByText("DeploymentAssociation")
    await canvas.findByText("Points")
    await canvas.findByText("Feedback")
  },
}

/** See-feedback (read-only) view of an association edge with an assessment. */
export const SeeFeedbackAssociation: Story = {
  name: "Feedback (See): Association",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="DeploymentDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("source", "deploymentNode", {
            name: "ApplicationServer",
            stereotype: "«device»",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().addNode(
          makeNode("target", "deploymentNode", {
            name: "DatabaseServer",
            stereotype: "«device»",
            isComponentHeaderShown: true,
          })
        )
        diagram
          .getState()
          .addEdge(
            makeEdge("edge-1", "DeploymentAssociation", "source", "target")
          )
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 2,
            feedback: "Annotate this communication path with its protocol.",
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
    await canvas.findByText("DeploymentAssociation")
    await canvas.findByText("+2")
    await canvas.findByText(
      "Annotate this communication path with its protocol."
    )
  },
}

// ── Assessment editor (full editor, grading mode) ────────────────────────────
/** The full editor in Assessment mode — click an element to give feedback. */
export const Assessment: Story = {
  name: "Assessment: Give Feedback",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={fixtureByType.DeploymentDiagram} />,
}

// The shipped DeploymentDiagram fixture has `assessments: {}`, so the read-only
// review surface would render an entirely UNGRADED diagram. Spread a real
// assessment map (keyed by the fixture's actual node / component / artifact /
// edge ids — read from tests/fixtures/deployment-diagram.json) so the canvas
// shows every on-canvas AssessmentIcon state at once: score>0 → green check,
// score<0 → red cross, score===0 → blue warn, plus graded-without-feedback,
// while the DB server, the interfaces and the remaining edges stay ungraded.
const A = (
  modelElementId: string,
  elementType: string,
  score: number,
  feedback?: string
): Assessment => ({ modelElementId, elementType, score, feedback })

const gradedDeploymentModel: UMLModel = {
  ...fixtureByType.DeploymentDiagram,
  assessments: {
    // ── green (score > 0) ──
    "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80": A(
      "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80",
      "node",
      5,
      "Correct «node» stereotype for the web server."
    ),
    "edge-appcontainer-interface": A(
      "edge-appcontainer-interface",
      "edge",
      2,
      "The app container correctly depends on the TCP/IP interface."
    ),
    // ── red (score < 0) ──
    "b8c9d0e1-f2a3-4b4c-5d6e-7f8091021324": A(
      "b8c9d0e1-f2a3-4b4c-5d6e-7f8091021324",
      "node",
      -1,
      "PostgreSQL belongs inside the DB server node, not standalone."
    ),
    "2f98cc2d-5d0f-41c4-b18c-9a1db6920065": A(
      "2f98cc2d-5d0f-41c4-b18c-9a1db6920065",
      "edge",
      -1,
      "This association is connected to the wrong end."
    ),
    // ── blue (score === 0) ──
    "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091": A(
      "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091",
      "node",
      0,
      "App container is acceptable but adds no points here."
    ),
    // ── graded, but no feedback (icon shows, See popover feedback is "-") ──
    "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f809102": A(
      "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f809102",
      "node",
      1
    ),
    // The DB server node, the loose interfaces and the remaining edges are
    // intentionally left UNGRADED (no icon).
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
  render: () => <ApollonAssessable model={gradedDeploymentModel} readonly />,
}
