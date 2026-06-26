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
