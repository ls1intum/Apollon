import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  ApollonFixture,
  fixtureByType,
  EditorStoreDecorator,
  ElementGallery,
  EdgeGallery,
  SidebarHarness,
  SeededPopoverHarness,
  makeNode,
  makeEdge,
} from "../_support/editor"
import { ComponentEditPopover } from "@tumaet/apollon/components/popovers/componentDiagram/ComponentEditPopover"
import { ComponentSubsystemEditPopover } from "@tumaet/apollon/components/popovers/componentDiagram/ComponentSubsystemEditPopover"
import { ComponentEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ComponentDiagramEdgeEditPopover"

/**
 * Everything for the **Component Diagram** in one place: the full diagram, the
 * element palette, every node shape, every edge type, and the edit popovers.
 * Tagged `!test` — these mount editor source (a second React copy under the
 * Vitest browser runner), so they are visual: browse them here.
 */
const meta = {
  title: "Editor/Component Diagram",
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── The whole diagram ────────────────────────────────────────────────────────
export const Diagram: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={fixtureByType.ComponentDiagram} />,
}

/** The element palette (drag source) for this diagram type. */
export const Palette: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SidebarHarness diagramType="ComponentDiagram" />,
}

// ── The parts ────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ComponentDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ComponentDiagram" />,
}

// ── Popovers (the edit UIs) ──────────────────────────────────────────────────
/** Component node editor — name + component-header toggle. */
export const ComponentPopover: Story = {
  parameters: { layout: "centered" },
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
export const ComponentSubsystemPopover: Story = {
  parameters: { layout: "centered" },
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
export const ComponentDependencyPopover: Story = {
  parameters: { layout: "centered" },
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

/** The whole diagram, dark theme. */
export const Dark: Story = {
  ...Diagram,
  globals: { theme: "dark" },
}
