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
import { SyntaxTreeNonterminalEditPopover } from "@tumaet/apollon/components/popovers/syntaxTreeDiagram/SyntaxTreeNonterminalEditPopover"
import { SyntaxTreeTerminalEditPopover } from "@tumaet/apollon/components/popovers/syntaxTreeDiagram/SyntaxTreeTerminalEditPopover"
import { SyntaxTreeEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/SyntaxTreeEdgeEditPopover"

const meta = { title: "Editor/Syntax Tree", ...editorStoryMeta } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.SyntaxTree} />,
}

/** Editable blank canvas — build a syntax tree from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="SyntaxTree" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="SyntaxTree" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="SyntaxTree" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Nonterminal editor — name + color (placeholder "Nonterminal"). */
export const EditNonterminal: Story = {
  name: "Edit: Nonterminal",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="SyntaxTree"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("nonterminal-1", "syntaxTreeNonterminal", {
            name: "Expression",
          })
        )
      }
    >
      <SyntaxTreeNonterminalEditPopover elementId="nonterminal-1" />
    </SeededPopoverHarness>
  ),
}

/** Terminal editor — name + color (placeholder "Terminal"). */
export const EditTerminal: Story = {
  name: "Edit: Terminal",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="SyntaxTree"
      seed={(diagram) =>
        diagram
          .getState()
          .addNode(
            makeNode("terminal-1", "syntaxTreeTerminal", { name: "number" })
          )
      }
    >
      <SyntaxTreeTerminalEditPopover elementId="terminal-1" />
    </SeededPopoverHarness>
  ),
}

/** Link editor — style controls for the edge between tree nodes. */
export const EditLink: Story = {
  name: "Edit: Link",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="SyntaxTree"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(
            makeNode("a", "syntaxTreeNonterminal", { name: "Expression" })
          )
        diagram
          .getState()
          .addNode(makeNode("b", "syntaxTreeTerminal", { name: "number" }))
        diagram
          .getState()
          .addEdge(
            makeEdge("edge-1", "SyntaxTreeLink", "a", "b", { label: "" })
          )
      }}
    >
      <SyntaxTreeEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}
