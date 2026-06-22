import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { DeploymentComponentEditPopover } from "@tumaet/apollon/components/popovers/deploymentDiagram/DeploymentComponentEditPopover"
import { DeploymentNodeEditPopover } from "@tumaet/apollon/components/popovers/deploymentDiagram/DeploymentNodeEditPopover"
import { DeploymentEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/DeploymentDiagramEdgeEditPopover"

/**
 * Deployment-diagram edit popovers, rendered in isolation against a seeded store —
 * the same forms users get when they select a deployment component, a node, or an
 * association edge. Browse to verify each editor's fields, layout, and styling.
 */
const meta = {
  title: "Editor/Popovers/Deployment Diagram",
  parameters: { layout: "centered" },
  // Visual-only: the popovers import editor source (second React copy under the
  // Vitest browser runner). Browse them in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Deployment-component node editor — name + component-header toggle. */
export const DeploymentComponentNode: Story = {
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
export const DeploymentNode: Story = {
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
export const DeploymentAssociationEdge: Story = {
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

/** Dark-pinned to confirm the popover reads correctly under the dark token set. */
export const Dark: Story = {
  ...DeploymentComponentNode,
  globals: { theme: "dark" },
}
