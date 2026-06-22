import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  ApollonFixture,
  fixtureByType,
  EditorStoreDecorator,
  ElementGallery,
  EdgeGallery,
  SidebarHarness,
  SeededPopoverHarness,
  makeNode,
  makeEdge,
} from "../_support/editor"
import { ReachabilityGraphMarkingEditPopover } from "@tumaet/apollon/components/popovers/reachabilityGraphDiagram/ReachabilityGraphMarkingEditPopover"
import { ReachabilityGraphEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ReachabilityGraphEdgeEditPopover"

/**
 * Everything for the **Reachability Graph** in one place: the full diagram, the
 * element palette, every node shape, every edge (arc) type, and the edit
 * popovers. Tagged `!test` — these mount editor source (a second React copy
 * under the Vitest browser runner), so they are visual: browse them here.
 */
const meta = {
  title: "Editor/Reachability Graph",
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── The whole diagram ────────────────────────────────────────────────────────
export const Diagram: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={fixtureByType.ReachabilityGraph} />,
}

/** The element palette (drag source) for this diagram type. */
export const Palette: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SidebarHarness diagramType="ReachabilityGraph" />,
}

// ── The parts ────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ReachabilityGraph" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ReachabilityGraph" />,
}

// ── Popovers (the edit UIs) ──────────────────────────────────────────────────
/** Marking editor — name plus the "is initial marking" toggle. */
export const MarkingPopover: Story = {
  parameters: { layout: "centered" },
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
export const ArcPopover: Story = {
  parameters: { layout: "centered" },
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

/** The whole diagram, dark theme. */
export const Dark: Story = {
  ...Diagram,
  globals: { theme: "dark" },
}
