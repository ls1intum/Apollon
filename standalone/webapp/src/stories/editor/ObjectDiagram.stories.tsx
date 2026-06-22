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
import { ObjectEditPopover } from "@tumaet/apollon/components/popovers/objectDiagram/ObjectEditPopover"
import { ObjectDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ObjectDiagramEdgeEditPopover"

/**
 * Everything for the **Object Diagram** in one place: the full diagram, the
 * element palette, every node shape, every edge (link) type, and the edit
 * popovers. Tagged `!test` — these mount editor source (a second React copy
 * under the Vitest browser runner), so they are visual: browse them here.
 */
const meta = {
  title: "Editor/Object Diagram",
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── The whole diagram ────────────────────────────────────────────────────────
export const Diagram: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={fixtureByType.ObjectDiagram} />,
}

/** The element palette (drag source) for this diagram type. */
export const Palette: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SidebarHarness diagramType="ObjectDiagram" />,
}

// ── The parts ────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ObjectDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ObjectDiagram" />,
}

// ── Popovers (the edit UIs) ──────────────────────────────────────────────────
/** Object node editor — name, color, attributes, methods. */
export const ObjectPopover: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ObjectDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("object-1", "objectName", {
            name: "account: Account",
            attributes: [{ id: "a1", name: "balance = 1200" }],
            methods: [{ id: "m1", name: "deposit(amount)" }],
          })
        )
      }
    >
      <ObjectEditPopover elementId="object-1" />
    </SeededPopoverHarness>
  ),
}

/** Object link editor — line/style controls for the association between objects. */
export const ObjectLinkPopover: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ObjectDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "objectName", { name: "order: Order" }))
        diagram
          .getState()
          .addNode(makeNode("b", "objectName", { name: "customer: Customer" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "ObjectLink", "a", "b", { label: "" }))
      }}
    >
      <ObjectDiagramEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

/** The whole diagram, dark theme. */
export const Dark: Story = {
  ...Diagram,
  globals: { theme: "dark" },
}
