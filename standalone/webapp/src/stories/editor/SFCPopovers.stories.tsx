import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { SfcActionTableEditPopover } from "@tumaet/apollon/components/popovers/sfcDiagram/SfcActionTableEditPopover"
import { SfcEdgeEditPopover } from "@tumaet/apollon/components/popovers/sfcDiagram/SfcEdgeEditPopover"

/** The SFC edit popovers, rendered in isolation against a seeded store. */
const meta = {
  title: "Editor/SFC/Popovers",
  parameters: { layout: "centered" },
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Action-table editor — name plus a list of qualifier/description action rows. */
export const ActionTable: Story = {
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
export const Transition: Story = {
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
