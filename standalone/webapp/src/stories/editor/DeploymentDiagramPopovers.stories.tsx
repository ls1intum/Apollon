import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { DeploymentComponentEditPopover } from "@tumaet/apollon/components/popovers/deploymentDiagram/DeploymentComponentEditPopover"
import { DeploymentNodeEditPopover } from "@tumaet/apollon/components/popovers/deploymentDiagram/DeploymentNodeEditPopover"
import { DeploymentEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/DeploymentDiagramEdgeEditPopover"

/** The Deployment Diagram edit popovers, rendered in isolation against a seeded store. */
const meta = {
  title: "Editor/Deployment Diagram/Popovers",
  parameters: { layout: "centered" },
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Deployment-component node editor — name + component-header toggle. */
export const DeploymentComponent: Story = {
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
export const DeploymentAssociation: Story = {
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
