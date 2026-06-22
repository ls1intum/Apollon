import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { DefaultNodeEditPopover } from "@tumaet/apollon/components/popovers/DefaultNodeEditPopover"
import { FlowChartEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/FlowChartEdgeEditPopover"

/**
 * Flowchart edit popovers, rendered in isolation against a seeded store — the
 * same forms users get when they select a process box or a flowline. Browse to
 * verify each editor's fields, layout, and styling.
 */
const meta = {
  title: "Editor/Popovers/Flowchart",
  parameters: { layout: "centered" },
  // Visual-only: the popovers import editor source (second React copy under the
  // Vitest browser runner). Browse them in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Process-box editor — the shared default node editor (name + style). */
export const ProcessNode: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="Flowchart"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("process-1", "flowchartProcess", {
            name: "Validate input",
          })
        )
      }
    >
      <DefaultNodeEditPopover elementId="process-1" />
    </SeededPopoverHarness>
  ),
}

/** Flowline editor — style, swap, label. */
export const FlowlineEdge: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="Flowchart"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "flowchartProcess", { name: "Start" }))
        diagram
          .getState()
          .addNode(makeNode("b", "flowchartProcess", { name: "End" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "FlowChartFlowline", "a", "b", {
            label: "yes",
          })
        )
      }}
    >
      <FlowChartEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

/** Dark-pinned to confirm the popover reads correctly under the dark token set. */
export const Dark: Story = {
  ...ProcessNode,
  globals: { theme: "dark" },
}
