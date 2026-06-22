import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { DefaultNodeEditPopover } from "@tumaet/apollon/components/popovers/DefaultNodeEditPopover"
import { UseCaseEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/UseCaseDiagramEdgeEditPopover"

/** The Use Case Diagram edit popovers, rendered in isolation against a seeded store. */
const meta = {
  title: "Editor/Use Case Diagram/Popovers",
  parameters: { layout: "centered" },
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Use-case editor — the shared default node editor (name + style). */
export const UseCase: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("usecase-1", "useCase", {
            name: "Place Order",
          })
        )
      }
    >
      <DefaultNodeEditPopover elementId="usecase-1" />
    </SeededPopoverHarness>
  ),
}

/** Association editor — edge-type select, swap, connection info, label. */
export const Association: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "useCaseActor", { name: "Customer" }))
        diagram
          .getState()
          .addNode(makeNode("b", "useCase", { name: "Place Order" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "UseCaseAssociation", "a", "b", {
            label: "places",
          })
        )
      }}
    >
      <UseCaseEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

/** Include editor — same form, type pinned to «include» (no label field). */
export const Include: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "useCase", { name: "Place Order" }))
        diagram
          .getState()
          .addNode(makeNode("b", "useCase", { name: "Validate Cart" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "UseCaseInclude", "a", "b", {}))
      }}
    >
      <UseCaseEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}
