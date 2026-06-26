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
import { ReachabilityGraphMarkingEditPopover } from "@tumaet/apollon/components/popovers/reachabilityGraphDiagram/ReachabilityGraphMarkingEditPopover"
import { ReachabilityGraphEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ReachabilityGraphEdgeEditPopover"
import { DefaultNodeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeGiveFeedbackPopover"
import { DefaultNodeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeSeeFeedbackPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

const meta = {
  title: "Editor/Reachability Graph",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.ReachabilityGraph} />,
}

/** Editable blank canvas — build a reachability graph from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="ReachabilityGraph" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ReachabilityGraph" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ReachabilityGraph" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Marking editor — name plus the "is initial marking" toggle. */
export const EditMarking: Story = {
  name: "Edit: Marking",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ReachabilityGraph"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("marking-1", "reachabilityGraphMarking", {
            name: "M0 = (1, 0, 0)",
            isInitialMarking: true,
          })
        )
      }
    >
      <ReachabilityGraphMarkingEditPopover elementId="marking-1" />
    </SeededPopoverHarness>
  ),
}

/** Arc editor — style controls, source/target swap, and the label field. */
export const EditArc: Story = {
  name: "Edit: Arc",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ReachabilityGraph"
      width={360}
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("a", "reachabilityGraphMarking", {
            name: "M0 = (1, 0, 0)",
            isInitialMarking: true,
          })
        )
        diagram.getState().addNode(
          makeNode("b", "reachabilityGraphMarking", {
            name: "M1 = (0, 1, 0)",
            isInitialMarking: false,
          })
        )
        diagram.getState().addEdge(
          makeEdge("edge-1", "ReachabilityGraphArc", "a", "b", {
            label: "t1",
          })
        )
      }}
    >
      <ReachabilityGraphEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Markings render via the shared DEFAULT node, so these exercise the
// DefaultNode give/see feedback popovers. Give = the grader's score + comment
// form; See = the read-only review, which reads from the diagram store's
// `assessments` map (keyed by model-element id).

/** Give-feedback form for a marking (shared default-node feedback popover). */
export const GiveFeedbackMarking: Story = {
  name: "Feedback (Give): Marking",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ReachabilityGraph"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("marking-1", "reachabilityGraphMarking", {
            name: "M0 = (1, 0, 0)",
            isInitialMarking: true,
          })
        )
      }
    >
      <DefaultNodeGiveFeedbackPopover elementId="marking-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded marking; the box renders a score + feedback form.
    await canvas.findByText("M0 = (1, 0, 0)")
    await canvas.findByPlaceholderText("0")
    await canvas.findByPlaceholderText("Add a comment…")
  },
}

/** See-feedback (read-only) view of a marking with a graded assessment. */
export const SeeFeedbackMarking: Story = {
  name: "Feedback (See): Marking",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ReachabilityGraph"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("marking-1", "reachabilityGraphMarking", {
            name: "M0 = (1, 0, 0)",
            isInitialMarking: true,
          })
        )
        diagram.getState().setAssessments({
          "marking-1": {
            modelElementId: "marking-1",
            elementType: "node",
            score: 3,
            feedback: "Correct initial marking for the net.",
          },
        })
      }}
    >
      <DefaultNodeSeeFeedbackPopover elementId="marking-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score + feedback are rendered read-only.
    await canvas.findByText("+3")
    await canvas.findByText("Correct initial marking for the net.")
  },
}

/** Give-feedback form for a reachability-graph arc — a single score + comment row. */
export const GiveFeedbackArc: Story = {
  name: "Feedback (Give): Arc",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ReachabilityGraph"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("a", "reachabilityGraphMarking", {
            name: "M0 = (1, 0, 0)",
            isInitialMarking: true,
          })
        )
        diagram.getState().addNode(
          makeNode("b", "reachabilityGraphMarking", {
            name: "M1 = (0, 1, 0)",
            isInitialMarking: false,
          })
        )
        diagram
          .getState()
          .addEdge(
            makeEdge("edge-1", "ReachabilityGraphArc", "a", "b", {
              label: "t1",
            })
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

/** See-feedback (read-only) view of a reachability-graph arc with a graded assessment. */
export const SeeFeedbackArc: Story = {
  name: "Feedback (See): Arc",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ReachabilityGraph"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("a", "reachabilityGraphMarking", {
            name: "M0 = (1, 0, 0)",
            isInitialMarking: true,
          })
        )
        diagram.getState().addNode(
          makeNode("b", "reachabilityGraphMarking", {
            name: "M1 = (0, 1, 0)",
            isInitialMarking: false,
          })
        )
        diagram
          .getState()
          .addEdge(
            makeEdge("edge-1", "ReachabilityGraphArc", "a", "b", {
              label: "t1",
            })
          )
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 2,
            feedback: "Firing t1 correctly reaches the next marking.",
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
    await canvas.findByText("Firing t1 correctly reaches the next marking.")
  },
}
