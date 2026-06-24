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
import { DefaultNodeEditPopover } from "@tumaet/apollon/components/popovers/DefaultNodeEditPopover"
import { FlowChartEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/FlowChartEdgeEditPopover"

const meta = { title: "Editor/Flowchart", ...editorStoryMeta } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.Flowchart} />,
}

/** Editable blank canvas — build a flowchart from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="Flowchart" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="Flowchart" />,
}

/** Every flowline (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="Flowchart" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Process-box editor — the shared default node editor (name + style). */
export const EditProcess: Story = {
  name: "Edit: Process",
  parameters: { layout: "centered" },
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
export const EditFlowline: Story = {
  name: "Edit: Flowline",
  parameters: { layout: "centered" },
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
