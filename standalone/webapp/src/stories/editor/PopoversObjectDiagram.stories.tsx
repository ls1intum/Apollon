import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { ObjectEditPopover } from "@tumaet/apollon/components/popovers/objectDiagram/ObjectEditPopover"
import { ObjectDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ObjectDiagramEdgeEditPopover"

/**
 * Object-diagram edit popovers, rendered in isolation against a seeded store —
 * the same forms users get when they select an object or an object link. Browse
 * to verify each editor's fields, layout, and styling.
 */
const meta = {
  title: "Editor/Popovers/Object Diagram",
  parameters: { layout: "centered" },
  // Visual-only: the popovers import editor source (second React copy under the
  // Vitest browser runner). Browse them in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Object node editor — name, color, attributes, methods. */
export const ObjectNode: Story = {
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
export const ObjectLinkEdge: Story = {
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

/** Dark-pinned to confirm the popover reads correctly under the dark token set. */
export const Dark: Story = {
  ...ObjectNode,
  globals: { theme: "dark" },
}
