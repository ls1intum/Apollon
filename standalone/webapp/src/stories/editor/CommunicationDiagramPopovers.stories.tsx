import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { CommunicationObjectNameEditPopover } from "@tumaet/apollon/components/popovers/communicationDiagram/CommunicationObjectNameEditPopover"
import { CommunicationDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/CommunicationDiagramEdgeEditPopover"

/** The Communication Diagram edit popovers, rendered in isolation against a seeded store. */
const meta = {
  title: "Editor/Communication Diagram/Popovers",
  parameters: { layout: "centered" },
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Communication object editor — name, color, attributes, methods. */
export const CommunicationObject: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="CommunicationDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("object-1", "communicationObjectName", {
            name: "cart: ShoppingCart",
            attributes: [{ id: "a1", name: "itemCount = 3" }],
            methods: [{ id: "m1", name: "checkout()" }],
          })
        )
      }
    >
      <CommunicationObjectNameEditPopover elementId="object-1" />
    </SeededPopoverHarness>
  ),
}

/** Message link editor — style controls plus the directed message list. */
export const CommunicationLink: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="CommunicationDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "communicationObjectName", { name: "cart" }))
        diagram
          .getState()
          .addNode(
            makeNode("b", "communicationObjectName", { name: "payment" })
          )
        diagram.getState().addEdge(
          makeEdge("edge-1", "CommunicationLink", "a", "b", {
            messages: [
              { id: "msg-1", text: "1: checkout()", direction: "target" },
              { id: "msg-2", text: "2: confirm()", direction: "source" },
            ],
            labels: ["1: checkout()", "2: confirm()"],
          })
        )
      }}
    >
      <CommunicationDiagramEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}
