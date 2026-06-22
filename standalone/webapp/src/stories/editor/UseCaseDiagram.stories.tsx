import type { Meta, StoryObj } from "@storybook/react-vite"
import {
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
import { UseCaseEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/UseCaseDiagramEdgeEditPopover"

/**
 * **Use Case Diagram** — the complete overview. `Playground` is the real,
 * editable editor (palette, selection, edit popups) loaded with a sample;
 * `Blank` is an empty editable canvas; `Elements` / `Edges` are galleries of
 * every shape / connector; the `Edit:` stories are the edit popovers. Use the
 * toolbar to switch light / dark. Everything for this diagram type lives in
 * this one Docs page.
 *
 * Tagged `!test` — these mount editor source (a 2nd React copy under the Vitest
 * runner), so they are visual: browse them here.
 */
const meta = {
  title: "Editor/Use Case Diagram",
  tags: ["autodocs", "!test"],
  // The Docs page is the complete overview, but every story mounts a real
  // editor — rendering them all inline is slow. `inline: false` lazy-loads each
  // story in its own iframe (rendered on scroll), so the Docs page opens fast
  // while still showing everything.
  parameters: {
    docs: { story: { inline: false, height: "640px" } },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.UseCaseDiagram} />,
}

/** Editable blank canvas — build a use case diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="UseCaseDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="UseCaseDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="UseCaseDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Use-case editor — the shared default node editor (name + style). */
export const EditUseCase: Story = {
  name: "Edit: Use Case",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("usecase-1", "useCase", {
            name: "Place Order",
          })
        )
      }
    >
      <DefaultNodeEditPopover elementId="usecase-1" />
    </SeededPopoverHarness>
  ),
}

/** Association editor — edge-type select, swap, connection info, label. */
export const EditAssociation: Story = {
  name: "Edit: Association",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "useCaseActor", { name: "Customer" }))
        diagram
          .getState()
          .addNode(makeNode("b", "useCase", { name: "Place Order" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "UseCaseAssociation", "a", "b", {
            label: "places",
          })
        )
      }}
    >
      <UseCaseEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

/** Include editor — same form, type pinned to «include» (no label field). */
export const EditInclude: Story = {
  name: "Edit: Include",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="UseCaseDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "useCase", { name: "Place Order" }))
        diagram
          .getState()
          .addNode(makeNode("b", "useCase", { name: "Validate Cart" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "UseCaseInclude", "a", "b", {}))
      }}
    >
      <UseCaseEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}
