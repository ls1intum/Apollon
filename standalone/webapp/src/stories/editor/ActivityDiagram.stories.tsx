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
import { ActivitySwimlaneEditPopover } from "@tumaet/apollon/components/popovers/activityDiagram/ActivitySwimlaneEditPopover"
import { ActivityDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ActivityDiagramEdgeEditPopover"

/**
 * Everything for the **Activity Diagram** in one place: the full diagram, the
 * element palette, every node shape, every edge (control flow) type, and the
 * edit popovers. Tagged `!test` — these mount editor source (a second React
 * copy under the Vitest browser runner), so they are visual: browse them here.
 */
const meta = {
  title: "Editor/Activity Diagram",
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── The whole diagram ────────────────────────────────────────────────────────
export const Diagram: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={fixtureByType.ActivityDiagram} />,
}

/** The element palette (drag source) for this diagram type. */
export const Palette: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SidebarHarness diagramType="ActivityDiagram" />,
}

// ── The parts ────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ActivityDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ActivityDiagram" />,
}

// ── Popovers (the edit UIs) ──────────────────────────────────────────────────
/** Swimlane editor — name, orientation, and a reorderable list of lanes. */
export const SwimlanePopover: Story = {
  parameters: { layout: "centered" },
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
export const ControlFlowPopover: Story = {
  parameters: { layout: "centered" },
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

/** The whole diagram, dark theme. */
export const Dark: Story = {
  ...Diagram,
  globals: { theme: "dark" },
}
