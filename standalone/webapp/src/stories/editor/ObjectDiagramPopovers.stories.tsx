import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { ObjectEditPopover } from "@tumaet/apollon/components/popovers/objectDiagram/ObjectEditPopover"
import { ObjectDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ObjectDiagramEdgeEditPopover"

/** The Object Diagram edit popovers, rendered in isolation against a seeded store. */
const meta = {
  title: "Editor/Object Diagram/Popovers",
  parameters: { layout: "centered" },
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Object node editor — name, color, attributes, methods. */
export const Object: Story = {
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
export const ObjectLink: Story = {
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
