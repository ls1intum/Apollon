import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { ActivitySwimlaneEditPopover } from "@tumaet/apollon/components/popovers/activityDiagram/ActivitySwimlaneEditPopover"
import { ActivityDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ActivityDiagramEdgeEditPopover"

/**
 * Activity-diagram edit popovers, rendered in isolation against a seeded store —
 * the same forms users get when they select a swimlane or a control flow. Browse
 * to verify each editor's fields, layout, and styling.
 */
const meta = {
  title: "Editor/Popovers/Activity Diagram",
  parameters: { layout: "centered" },
  // Visual-only: the popovers import editor source (second React copy under the
  // Vitest browser runner). Browse them in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Swimlane editor — name, orientation, and a reorderable list of lanes. */
export const SwimlaneNode: Story = {
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
export const ControlFlowEdge: Story = {
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

/** Dark-pinned to confirm the popover reads correctly under the dark token set. */
export const Dark: Story = {
  ...SwimlaneNode,
  globals: { theme: "dark" },
}
