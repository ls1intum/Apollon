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
import { DefaultNodeEditPopover } from "@tumaet/apollon/components/popovers/DefaultNodeEditPopover"
import { FlowChartEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/FlowChartEdgeEditPopover"

/**
 * Everything for the **Flowchart** in one place: the full diagram, the element
 * palette, every node shape, every edge (flowline) type, and the edit popovers.
 * Tagged `!test` — these mount editor source (a second React copy under the
 * Vitest browser runner), so they are visual: browse them here.
 */
const meta = {
  title: "Editor/Flowchart",
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── The whole diagram ────────────────────────────────────────────────────────
export const Diagram: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={fixtureByType.Flowchart} />,
}

/** The element palette (drag source) for this diagram type. */
export const Palette: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SidebarHarness diagramType="Flowchart" />,
}

// ── The parts ────────────────────────────────────────────────────────────────
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

// ── Popovers (the edit UIs) ──────────────────────────────────────────────────
/** Process-box editor — the shared default node editor (name + style). */
export const ProcessNodePopover: Story = {
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
export const FlowlineEdgePopover: Story = {
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

/** The whole diagram, dark theme. */
export const Dark: Story = {
  ...Diagram,
  globals: { theme: "dark" },
}
