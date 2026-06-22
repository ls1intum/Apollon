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
import { ObjectEditPopover } from "@tumaet/apollon/components/popovers/objectDiagram/ObjectEditPopover"
import { ObjectDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ObjectDiagramEdgeEditPopover"

/**
 * **Object Diagram** — the complete overview. `Playground` is the real,
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
  title: "Editor/Object Diagram",
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
  render: () => <ApollonEditable model={fixtureByType.ObjectDiagram} />,
}

/** Editable blank canvas — build an object diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="ObjectDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ObjectDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ObjectDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Object node editor — name, color, attributes, methods. */
export const EditObject: Story = {
  name: "Edit: Object",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ObjectDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("object-1", "objectName", {
            name: "account: Account",
            attributes: [{ id: "a1", name: "balance = 1200" }],
            methods: [{ id: "m1", name: "deposit(amount)" }],
          })
        )
      }
    >
      <ObjectEditPopover elementId="object-1" />
    </SeededPopoverHarness>
  ),
}

/** Object link editor — line/style controls for the association between objects. */
export const EditObjectLink: Story = {
  name: "Edit: Object Link",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ObjectDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "objectName", { name: "order: Order" }))
        diagram
          .getState()
          .addNode(makeNode("b", "objectName", { name: "customer: Customer" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "ObjectLink", "a", "b", { label: "" }))
      }}
    >
      <ObjectDiagramEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}
