import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { ComponentEditPopover } from "@tumaet/apollon/components/popovers/componentDiagram/ComponentEditPopover"
import { ComponentSubsystemEditPopover } from "@tumaet/apollon/components/popovers/componentDiagram/ComponentSubsystemEditPopover"
import { ComponentEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ComponentDiagramEdgeEditPopover"

/**
 * Component-diagram edit popovers, rendered in isolation against a seeded store —
 * the same forms users get when they select a component, a subsystem, or a
 * dependency edge. Browse to verify each editor's fields, layout, and styling.
 */
const meta = {
  title: "Editor/Popovers/Component Diagram",
  parameters: { layout: "centered" },
  // Visual-only: the popovers import editor source (second React copy under the
  // Vitest browser runner). Browse them in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Component node editor — name + component-header toggle. */
export const ComponentNode: Story = {
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
export const ComponentSubsystemNode: Story = {
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
export const ComponentDependencyEdge: Story = {
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

/** Dark-pinned to confirm the popover reads correctly under the dark token set. */
export const Dark: Story = {
  ...ComponentNode,
  globals: { theme: "dark" },
}
