import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { PetriNetPlaceEditPopover } from "@tumaet/apollon/components/popovers/petriNetDiagram/PetriNetPlaceEditPopover"
import { PetriNetEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/PetriNetEdgeEditPopover"

/**
 * Petri-net edit popovers, rendered in isolation against a seeded store — the
 * same forms users get when they select a place or an arc. Browse to verify each
 * editor's fields, layout, and styling.
 */
const meta = {
  title: "Editor/Popovers/Petri Net",
  parameters: { layout: "centered" },
  // Visual-only: the popovers import editor source (second React copy under the
  // Vitest browser runner). Browse them in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Place editor — name plus the marking (tokens + capacity) controls. */
export const PlaceNode: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="PetriNet"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("place-1", "petriNetPlace", {
            name: "Waiting",
            tokens: 2,
            capacity: "Infinity",
          })
        )
      }
    >
      <PetriNetPlaceEditPopover elementId="place-1" />
    </SeededPopoverHarness>
  ),
}

/** Arc editor — style controls, source/target swap, and the weight field. */
export const ArcEdge: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="PetriNet"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "petriNetPlace", { name: "Waiting" }))
        diagram
          .getState()
          .addNode(makeNode("b", "petriNetTransition", { name: "Serve" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "PetriNetArc", "a", "b", { label: "2" }))
      }}
    >
      <PetriNetEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

/** Dark-pinned to confirm the popover reads correctly under the dark token set. */
export const Dark: Story = {
  ...PlaceNode,
  globals: { theme: "dark" },
}
