import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { DefaultNodeEditPopover } from "@tumaet/apollon/components/popovers/DefaultNodeEditPopover"
import { UseCaseEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/UseCaseDiagramEdgeEditPopover"

/**
 * Use-case edit popovers, rendered in isolation against a seeded store — the
 * same forms users get when they select a use case or one of its connections.
 * Browse to verify each editor's fields, layout, and styling.
 */
const meta = {
  title: "Editor/Popovers/Use Case",
  parameters: { layout: "centered" },
  // Visual-only: the popovers import editor source (second React copy under the
  // Vitest browser runner). Browse them in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Use-case editor — the shared default node editor (name + style). */
export const UseCaseNode: Story = {
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
export const AssociationEdge: Story = {
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
export const IncludeEdge: Story = {
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

/** Dark-pinned to confirm the popover reads correctly under the dark token set. */
export const Dark: Story = {
  ...UseCaseNode,
  globals: { theme: "dark" },
}
