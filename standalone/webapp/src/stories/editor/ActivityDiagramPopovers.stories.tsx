import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { ActivitySwimlaneEditPopover } from "@tumaet/apollon/components/popovers/activityDiagram/ActivitySwimlaneEditPopover"
import { ActivityDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ActivityDiagramEdgeEditPopover"

/** The Activity Diagram edit popovers, rendered in isolation against a seeded store. */
const meta = {
  title: "Editor/Activity Diagram/Popovers",
  parameters: { layout: "centered" },
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Swimlane editor — name, orientation, and a reorderable list of lanes. */
export const Swimlane: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode(
            "swimlane-1",
            "activitySwimlane",
            {
              name: "Order Processing",
              orientation: "vertical",
              lanes: [
                { id: "lane-1", name: "Customer", size: 200 },
                { id: "lane-2", name: "Sales", size: 200 },
                { id: "lane-3", name: "Warehouse", size: 200 },
              ],
            },
            { width: 600, height: 300 }
          )
        )
      }
    >
      <ActivitySwimlaneEditPopover elementId="swimlane-1" />
    </SeededPopoverHarness>
  ),
}

/** Control-flow editor — style, swap, label. */
export const ControlFlow: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "activityActionNode", { name: "Submit" }))
        diagram
          .getState()
          .addNode(makeNode("b", "activityActionNode", { name: "Review" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "ActivityControlFlow", "a", "b", {
            label: "approved",
          })
        )
      }}
    >
      <ActivityDiagramEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}
