import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { ClassEditPopover } from "@tumaet/apollon/components/popovers/classDiagram/ClassEditPopover"
import { EdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ClassDiagramEdgeEditPopover"

/**
 * Class-diagram edit popovers, rendered in isolation against a seeded store —
 * the same forms users get when they select a class or an association. Browse to
 * verify each editor's fields, layout, and styling.
 */
const meta = {
  title: "Editor/Popovers/Class Diagram",
  parameters: { layout: "centered" },
  // Visual-only: the popovers import editor source (second React copy under the
  // Vitest browser runner). Browse them in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Class node editor — name, stereotype, attributes, methods. */
export const ClassNode: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("class-1", "class", {
            name: "Account",
            stereotype: undefined,
            attributes: [{ id: "a1", name: "+ balance: number" }],
            methods: [{ id: "m1", name: "+ deposit(amount)" }],
          })
        )
      }
    >
      <ClassEditPopover elementId="class-1" />
    </SeededPopoverHarness>
  ),
}

/** Association editor — type, swap, source/target role + multiplicity. */
export const AssociationEdge: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      width={360}
      seed={(diagram) => {
        diagram.getState().addNode(makeNode("a", "class", { name: "A" }))
        diagram.getState().addNode(makeNode("b", "class", { name: "B" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "ClassBidirectional", "a", "b", {
            sourceRole: "owner",
            sourceMultiplicity: "1",
            targetRole: "items",
            targetMultiplicity: "*",
          })
        )
      }}
    >
      <EdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

/** Dark-pinned to confirm the popover reads correctly under the dark token set. */
export const Dark: Story = {
  ...ClassNode,
  globals: { theme: "dark" },
}
