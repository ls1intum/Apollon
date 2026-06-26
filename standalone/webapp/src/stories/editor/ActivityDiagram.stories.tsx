import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  editorStoryMeta,
  ApollonEditable,
  fixtureByType,
  EditorStoreDecorator,
  ElementGallery,
  EdgeGallery,
  SeededPopoverHarness,
  makeNode,
  makeEdge,
} from "../_support/editor"
import { ActivitySwimlaneEditPopover } from "@tumaet/apollon/components/popovers/activityDiagram/ActivitySwimlaneEditPopover"
import { ActivityDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ActivityDiagramEdgeEditPopover"

const meta = {
  title: "Editor/Activity Diagram",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.ActivityDiagram} />,
}

/** Editable blank canvas — build an activity diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="ActivityDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
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

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Swimlane editor — name, orientation, and a reorderable list of lanes. */
export const EditSwimlane: Story = {
  name: "Edit: Swimlane",
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
export const EditControlFlow: Story = {
  name: "Edit: Control Flow",
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
