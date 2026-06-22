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
import { PetriNetPlaceEditPopover } from "@tumaet/apollon/components/popovers/petriNetDiagram/PetriNetPlaceEditPopover"
import { PetriNetEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/PetriNetEdgeEditPopover"

/**
 * Everything for the **Petri Net** in one place: the full diagram, the element
 * palette, every node shape, every edge (arc) type, and the edit popovers.
 * Tagged `!test` — these mount editor source (a second React copy under the
 * Vitest browser runner), so they are visual: browse them here.
 */
const meta = {
  title: "Editor/Petri Net",
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── The whole diagram ────────────────────────────────────────────────────────
export const Diagram: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={fixtureByType.PetriNet} />,
}

/** The element palette (drag source) for this diagram type. */
export const Palette: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SidebarHarness diagramType="PetriNet" />,
}

// ── The parts ────────────────────────────────────────────────────────────────
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

// ── Popovers (the edit UIs) ──────────────────────────────────────────────────
/** Place editor — name plus the marking (tokens + capacity) controls. */
export const PlacePopover: Story = {
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
export const ArcPopover: Story = {
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

/** The whole diagram, dark theme. */
export const Dark: Story = {
  ...Diagram,
  globals: { theme: "dark" },
}
