import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { ReachabilityGraphMarkingEditPopover } from "@tumaet/apollon/components/popovers/reachabilityGraphDiagram/ReachabilityGraphMarkingEditPopover"
import { ReachabilityGraphEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ReachabilityGraphEdgeEditPopover"

/**
 * Reachability-graph edit popovers, rendered in isolation against a seeded
 * store — the same forms users get when they select a marking or an arc. Browse
 * to verify each editor's fields, layout, and styling.
 */
const meta = {
  title: "Editor/Popovers/Reachability Graph",
  parameters: { layout: "centered" },
  // Visual-only: the popovers import editor source (second React copy under the
  // Vitest browser runner). Browse them in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Marking editor — name plus the "is initial marking" toggle. */
export const MarkingNode: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="ReachabilityGraph"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("marking-1", "reachabilityGraphMarking", {
            name: "M0 = (1, 0, 0)",
            isInitialMarking: true,
          })
        )
      }
    >
      <ReachabilityGraphMarkingEditPopover elementId="marking-1" />
    </SeededPopoverHarness>
  ),
}

/** Arc editor — style controls, source/target swap, and the label field. */
export const ArcEdge: Story = {
  render: () => (
    <SeededPopoverHarness
      diagramType="ReachabilityGraph"
      width={360}
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("a", "reachabilityGraphMarking", {
            name: "M0 = (1, 0, 0)",
            isInitialMarking: true,
          })
        )
        diagram.getState().addNode(
          makeNode("b", "reachabilityGraphMarking", {
            name: "M1 = (0, 1, 0)",
            isInitialMarking: false,
          })
        )
        diagram.getState().addEdge(
          makeEdge("edge-1", "ReachabilityGraphArc", "a", "b", {
            label: "t1",
          })
        )
      }}
    >
      <ReachabilityGraphEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

/** Dark-pinned to confirm the popover reads correctly under the dark token set. */
export const Dark: Story = {
  ...MarkingNode,
  globals: { theme: "dark" },
}
