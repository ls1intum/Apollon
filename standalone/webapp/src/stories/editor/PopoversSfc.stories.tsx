import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { SfcActionTableEditPopover } from "@tumaet/apollon/components/popovers/sfcDiagram/SfcActionTableEditPopover"
import { SfcEdgeEditPopover } from "@tumaet/apollon/components/popovers/sfcDiagram/SfcEdgeEditPopover"

/**
 * SFC (Sequential Function Chart) edit popovers, rendered in isolation against a
 * seeded store — the same forms users get when they select an action table or a
 * transition. Browse to verify each editor's fields, layout, and styling.
 */
const meta = {
  title: "Editor/Popovers/SFC",
  parameters: { layout: "centered" },
  // Visual-only: the popovers import editor source (second React copy under the
  // Vitest browser runner). Browse them in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Action-table editor — name plus a list of qualifier/description action rows. */
export const ActionTableNode: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="Sfc"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("action-table-1", "sfcActionTable", {
            name: "Conveyor",
            actionRows: [
              { id: "r1", identifier: "N", name: "Run motor" },
              { id: "r2", identifier: "S", name: "Set alarm" },
              { id: "r3", identifier: "R", name: "Reset counter" },
            ],
          })
        )
      }
    >
      <SfcActionTableEditPopover elementId="action-table-1" />
    </SeededPopoverHarness>
  ),
}

/** Transition editor — style plus a JSON-encoded condition (crossbar/negation). */
export const TransitionEdge: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="Sfc"
      width={360}
      seed={(diagram) => {
        diagram.getState().addNode(makeNode("a", "sfcStep", { name: "Step 1" }))
        diagram.getState().addNode(makeNode("b", "sfcStep", { name: "Step 2" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "SfcDiagramEdge", "a", "b", {
            label: JSON.stringify({
              isNegated: false,
              displayName: "start & ready",
              showBar: true,
            }),
          })
        )
      }}
    >
      <SfcEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

/** Dark-pinned to confirm the popover reads correctly under the dark token set. */
export const Dark: Story = {
  ...ActionTableNode,
  globals: { theme: "dark" },
}
