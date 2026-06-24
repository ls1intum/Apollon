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
import { PetriNetPlaceEditPopover } from "@tumaet/apollon/components/popovers/petriNetDiagram/PetriNetPlaceEditPopover"
import { PetriNetEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/PetriNetEdgeEditPopover"

const meta = { title: "Editor/Petri Net", ...editorStoryMeta } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.PetriNet} />,
}

/** Editable blank canvas — build a petri net from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="PetriNet" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="PetriNet" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="PetriNet" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Place editor — name plus the marking (tokens + capacity) controls. */
export const EditPlace: Story = {
  name: "Edit: Place",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="PetriNet"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("place-1", "petriNetPlace", {
            name: "Waiting",
            tokens: 2,
            capacity: "Infinity",
          })
        )
      }
    >
      <PetriNetPlaceEditPopover elementId="place-1" />
    </SeededPopoverHarness>
  ),
}

/** Arc editor — style controls, source/target swap, and the weight field. */
export const EditArc: Story = {
  name: "Edit: Arc",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="PetriNet"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "petriNetPlace", { name: "Waiting" }))
        diagram
          .getState()
          .addNode(makeNode("b", "petriNetTransition", { name: "Serve" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "PetriNetArc", "a", "b", { label: "2" }))
      }}
    >
      <PetriNetEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}
