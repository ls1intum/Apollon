import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { SyntaxTreeNonterminalEditPopover } from "@tumaet/apollon/components/popovers/syntaxTreeDiagram/SyntaxTreeNonterminalEditPopover"
import { SyntaxTreeTerminalEditPopover } from "@tumaet/apollon/components/popovers/syntaxTreeDiagram/SyntaxTreeTerminalEditPopover"
import { SyntaxTreeEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/SyntaxTreeEdgeEditPopover"

/**
 * Syntax-tree edit popovers, rendered in isolation against a seeded store — the
 * same forms users get when they select a nonterminal, a terminal, or a link.
 * Browse to verify each editor's fields, layout, and styling.
 */
const meta = {
  title: "Editor/Popovers/Syntax Tree",
  parameters: { layout: "centered" },
  // Visual-only: the popovers import editor source (second React copy under the
  // Vitest browser runner). Browse them in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Nonterminal editor — name + color (placeholder "Nonterminal"). */
export const NonterminalNode: Story = {
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
export const TerminalNode: Story = {
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
export const LinkEdge: Story = {
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

/** Dark-pinned to confirm the popover reads correctly under the dark token set. */
export const Dark: Story = {
  ...NonterminalNode,
  globals: { theme: "dark" },
}
