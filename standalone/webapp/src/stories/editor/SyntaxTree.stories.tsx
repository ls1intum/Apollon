import type { Meta, StoryObj } from "@storybook/react-vite"
import { within } from "storybook/test"
import type { Assessment, UMLModel } from "@tumaet/apollon"
import {
  editorStoryMeta,
  ApollonEditable,
  ApollonAssessable,
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

// ── Assessment editor (full editor, grading mode) ────────────────────────────
/** The full editor in Assessment mode — click an element to give feedback. */
export const Assessment: Story = {
  name: "Assessment: Give Feedback",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={fixtureByType.SyntaxTree} />,
}

// The shipped SyntaxTree fixture has `assessments: {}`, so the read-only review
// surface would render an entirely UNGRADED diagram. Spread a real assessment
// map (keyed by the fixture's actual nonterminal / terminal / link ids — read
// from tests/fixtures/syntax-tree.json) so the canvas shows every on-canvas
// AssessmentIcon state at once: score>0 → green check, score<0 → red cross,
// score===0 → blue warn, plus graded-without-feedback, while >=1 element stays
// ungraded (no icon).
const A = (
  modelElementId: string,
  elementType: string,
  score: number,
  feedback?: string
): Assessment => ({ modelElementId, elementType, score, feedback })

const gradedSyntaxTreeModel: UMLModel = {
  ...fixtureByType.SyntaxTree,
  assessments: {
    // ── green (score > 0) ──
    "d0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a": A(
      "d0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a",
      "node",
      5,
      "Correct root nonterminal (Expr)."
    ),
    "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b": A(
      "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b",
      "node",
      2,
      "Term nonterminal is correct."
    ),
    "edge-expr-term-left": A(
      "edge-expr-term-left",
      "edge",
      2,
      "Correct derivation from Expr to the left Term."
    ),
    // ── red (score < 0) ──
    "f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c": A(
      "f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c",
      "node",
      -1,
      "This Term does not belong in this production."
    ),
    "edge-expr-term-right": A(
      "edge-expr-term-right",
      "edge",
      -1,
      "This link derives the wrong child."
    ),
    // ── blue (score === 0) ──
    "a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d": A(
      "a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d",
      "node",
      0,
      "Terminal 'a' is fine but earns no points here."
    ),
    // ── graded, but no feedback (icon shows, See popover feedback is "-") ──
    "b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e": A(
      "b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e",
      "node",
      3
    ),
    // Terminal 'c' (c5d6e7f8…) and the remaining links are intentionally left
    // UNGRADED (no icon).
  },
}

/**
 * The full editor in Assessment + readonly mode — the see-feedback review
 * surface, rendered over a fully GRADED model so every on-canvas
 * AssessmentIcon state shows: green check (score>0), red cross (score<0),
 * blue warn (score===0), plus graded-without-feedback, with several elements
 * left ungraded.
 */
export const AssessmentReview: Story = {
  name: "Assessment: See Feedback (graded)",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={gradedSyntaxTreeModel} readonly />,
}
