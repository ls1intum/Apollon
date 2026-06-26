import type { Meta, StoryObj } from "@storybook/react-vite"
import { within } from "storybook/test"
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
import { DefaultNodeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeGiveFeedbackPopover"
import { DefaultNodeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeSeeFeedbackPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

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

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Nonterminals render via the shared DEFAULT node, so these exercise the
// DefaultNode give/see feedback popovers. Give = the grader's score + comment
// form; See = the read-only review, which reads from the diagram store's
// `assessments` map (keyed by model-element id).

/** Give-feedback form for a nonterminal (shared default-node feedback popover). */
export const GiveFeedbackNonterminal: Story = {
  name: "Feedback (Give): Nonterminal",
  tags: ["autodocs", "test"],
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
      <DefaultNodeGiveFeedbackPopover elementId="nonterminal-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded nonterminal; the box renders a score + feedback form.
    await canvas.findByText("Expression")
    await canvas.findByPlaceholderText("0")
    await canvas.findByPlaceholderText("Add a comment…")
  },
}

/** See-feedback (read-only) view of a nonterminal with a graded assessment. */
export const SeeFeedbackNonterminal: Story = {
  name: "Feedback (See): Nonterminal",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="SyntaxTree"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("nonterminal-1", "syntaxTreeNonterminal", {
            name: "Expression",
          })
        )
        diagram.getState().setAssessments({
          "nonterminal-1": {
            modelElementId: "nonterminal-1",
            elementType: "node",
            score: 3,
            feedback: "Correct nonterminal for this production.",
          },
        })
      }}
    >
      <DefaultNodeSeeFeedbackPopover elementId="nonterminal-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score + feedback are rendered read-only.
    await canvas.findByText("+3")
    await canvas.findByText("Correct nonterminal for this production.")
  },
}

/** Give-feedback form for a syntax-tree link — a single score + comment row. */
export const GiveFeedbackLink: Story = {
  name: "Feedback (Give): Link",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="SyntaxTree"
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
      <EdgeGiveFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge feedback box renders a single Points + Feedback form.
    await canvas.findByPlaceholderText("0")
    await canvas.findByPlaceholderText("Add a comment…")
  },
}

/** See-feedback (read-only) view of a syntax-tree link with a graded assessment. */
export const SeeFeedbackLink: Story = {
  name: "Feedback (See): Link",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="SyntaxTree"
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
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 2,
            feedback:
              "Link correctly derives the terminal from the nonterminal.",
          },
        })
      }}
    >
      <EdgeSeeFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded edge score + feedback render read-only.
    await canvas.findByText("+2")
    await canvas.findByText(
      "Link correctly derives the terminal from the nonterminal."
    )
  },
}
