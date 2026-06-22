import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { ComponentEditPopover } from "@tumaet/apollon/components/popovers/componentDiagram/ComponentEditPopover"
import { ComponentSubsystemEditPopover } from "@tumaet/apollon/components/popovers/componentDiagram/ComponentSubsystemEditPopover"
import { ComponentEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ComponentDiagramEdgeEditPopover"

/** The Component Diagram edit popovers, rendered in isolation against a seeded store. */
const meta = {
  title: "Editor/Component Diagram/Popovers",
  parameters: { layout: "centered" },
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Component node editor — name + component-header toggle. */
export const Component: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="ComponentDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("component-1", "component", {
            name: "AuthService",
            isComponentHeaderShown: true,
          })
        )
      }
    >
      <ComponentEditPopover elementId="component-1" />
    </SeededPopoverHarness>
  ),
}

/** Subsystem node editor — name + subsystem-header toggle. */
export const ComponentSubsystem: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="ComponentDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("subsystem-1", "componentSubsystem", {
            name: "Billing",
            isComponentSubsystemHeaderShown: true,
          })
        )
      }
    >
      <ComponentSubsystemEditPopover elementId="subsystem-1" />
    </SeededPopoverHarness>
  ),
}

/** Dependency edge editor — line style, swap, edge type, connection info. */
export const ComponentDependency: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="ComponentDiagram"
      width={360}
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("source", "component", {
            name: "AuthService",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().addNode(
          makeNode("target", "component", {
            name: "UserStore",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().addEdge(
          makeEdge("edge-1", "ComponentDependency", "source", "target", {
            label: "uses",
          })
        )
      }}
    >
      <ComponentEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}
