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
import { SfcActionTableEditPopover } from "@tumaet/apollon/components/popovers/sfcDiagram/SfcActionTableEditPopover"
import { SfcEdgeEditPopover } from "@tumaet/apollon/components/popovers/sfcDiagram/SfcEdgeEditPopover"

const meta = { title: "Editor/SFC", ...editorStoryMeta } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.Sfc} />,
}

/** Editable blank canvas — build an SFC from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="Sfc" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="Sfc" />,
}

/** Every transition (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="Sfc" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Action-table editor — name plus a list of qualifier/description action rows. */
export const EditActionTable: Story = {
  name: "Edit: Action Table",
  parameters: { layout: "centered" },
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
export const EditTransition: Story = {
  name: "Edit: Transition",
  parameters: { layout: "centered" },
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
