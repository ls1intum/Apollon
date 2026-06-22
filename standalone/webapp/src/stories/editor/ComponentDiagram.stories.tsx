import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  ApollonEditable,
  fixtureByType,
  EditorStoreDecorator,
  ElementGallery,
  EdgeGallery,
  SeededPopoverHarness,
  makeNode,
  makeEdge,
} from "../_support/editor"
import { ComponentEditPopover } from "@tumaet/apollon/components/popovers/componentDiagram/ComponentEditPopover"
import { ComponentSubsystemEditPopover } from "@tumaet/apollon/components/popovers/componentDiagram/ComponentSubsystemEditPopover"
import { ComponentEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ComponentDiagramEdgeEditPopover"

/**
 * **Component Diagram** — the complete overview. `Playground` is the real,
 * editable editor (palette, selection, edit popups) loaded with a sample;
 * `Blank` is an empty editable canvas; `Elements` / `Edges` are galleries of
 * every shape / connector; the `Edit:` stories are the edit popovers. Use the
 * toolbar to switch light / dark. Everything for this diagram type lives in this
 * one Docs page.
 *
 * Tagged `!test` — these mount editor source (a 2nd React copy under the Vitest
 * runner), so they are visual: browse them here.
 */
const meta = {
  title: "Editor/Component Diagram",
  tags: ["autodocs", "!test"],
  // The Docs page is the complete overview, but every story mounts a real
  // editor — rendering them all inline is slow. `inline: false` lazy-loads each
  // story in its own iframe (rendered on scroll), so the Docs page opens fast
  // while still showing everything.
  parameters: {
    docs: { story: { inline: false, height: "640px" } },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.ComponentDiagram} />,
}

/** Editable blank canvas — build a component diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="ComponentDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
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

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Component node editor — name + component-header toggle. */
export const EditComponent: Story = {
  name: "Edit: Component",
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
export const EditComponentSubsystem: Story = {
  name: "Edit: Subsystem",
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
export const EditComponentDependency: Story = {
  name: "Edit: Dependency",
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
