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
import { ActivitySwimlaneEditPopover } from "@tumaet/apollon/components/popovers/activityDiagram/ActivitySwimlaneEditPopover"
import { ActivityDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ActivityDiagramEdgeEditPopover"
import { DefaultNodeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeGiveFeedbackPopover"
import { DefaultNodeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeSeeFeedbackPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

// Popover-harness feedback stories run in the Vitest runner: the
// ["autodocs","test"] tag keeps them scannable in Docs AND test-gated, and
// each `play` asserts the seeded content rendered (so a regression that blanks
// a popover fails the suite rather than passing silently).
const popoverTags = ["autodocs", "test"]

const meta = {
  title: "Editor/Activity Diagram",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.ActivityDiagram} />,
}

/** Editable blank canvas — build an activity diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="ActivityDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ActivityDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ActivityDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Swimlane editor — name, orientation, and a reorderable list of lanes. */
export const EditSwimlane: Story = {
  name: "Edit: Swimlane",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode(
            "swimlane-1",
            "activitySwimlane",
            {
              name: "Order Processing",
              orientation: "vertical",
              lanes: [
                { id: "lane-1", name: "Customer", size: 200 },
                { id: "lane-2", name: "Sales", size: 200 },
                { id: "lane-3", name: "Warehouse", size: 200 },
              ],
            },
            { width: 600, height: 300 }
          )
        )
      }
    >
      <ActivitySwimlaneEditPopover elementId="swimlane-1" />
    </SeededPopoverHarness>
  ),
}

/** Control-flow editor — style, swap, label. */
export const EditControlFlow: Story = {
  name: "Edit: Control Flow",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "activityActionNode", { name: "Submit" }))
        diagram
          .getState()
          .addNode(makeNode("b", "activityActionNode", { name: "Review" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "ActivityControlFlow", "a", "b", {
            label: "approved",
          })
        )
      }}
    >
      <ActivityDiagramEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Action nodes render via the shared DEFAULT node, so these exercise the
// DefaultNode give/see feedback popovers. Give = the grader's score + comment
// form; See = the read-only review, which reads from the diagram store's
// `assessments` map (keyed by model-element id).

/** Give-feedback form for an action node (shared default-node feedback popover). */
export const GiveFeedbackAction: Story = {
  name: "Feedback (Give): Action",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      seed={(diagram) =>
        diagram
          .getState()
          .addNode(
            makeNode("action-1", "activityActionNode", { name: "Submit Order" })
          )
      }
    >
      <DefaultNodeGiveFeedbackPopover elementId="action-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded action; the box renders a score + feedback form.
    await canvas.findByText("Submit Order")
    await canvas.findByText("Points")
    await canvas.findByText("Feedback")
  },
}

/** See-feedback (read-only) view of an action node with a graded assessment. */
export const SeeFeedbackAction: Story = {
  name: "Feedback (See): Action",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(
            makeNode("action-1", "activityActionNode", { name: "Submit Order" })
          )
        diagram.getState().setAssessments({
          "action-1": {
            modelElementId: "action-1",
            elementType: "node",
            score: 3,
            feedback: "Clear, verb-first action name.",
          },
        })
      }}
    >
      <DefaultNodeSeeFeedbackPopover elementId="action-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score + feedback are rendered read-only.
    await canvas.findByText("+3")
    await canvas.findByText("Clear, verb-first action name.")
  },
}

/** Give-feedback form for a control-flow edge — a single score + comment row. */
export const GiveFeedbackControlFlow: Story = {
  name: "Feedback (Give): Control Flow",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "activityActionNode", { name: "Submit" }))
        diagram
          .getState()
          .addNode(makeNode("b", "activityActionNode", { name: "Review" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "ActivityControlFlow", "a", "b"))
      }}
    >
      <EdgeGiveFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge feedback header names the edge by its type; the box is a form.
    await canvas.findByText("ActivityControlFlow")
    await canvas.findByText("Points")
    await canvas.findByText("Feedback")
  },
}

/** See-feedback (read-only) view of a control-flow edge with an assessment. */
export const SeeFeedbackControlFlow: Story = {
  name: "Feedback (See): Control Flow",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ActivityDiagram"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("a", "activityActionNode", { name: "Submit" }))
        diagram
          .getState()
          .addNode(makeNode("b", "activityActionNode", { name: "Review" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "ActivityControlFlow", "a", "b"))
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 2,
            feedback: "The guard condition should label this control flow.",
          },
        })
      }}
    >
      <EdgeSeeFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded edge score + feedback render read-only under the edge header.
    await canvas.findByText("ActivityControlFlow")
    await canvas.findByText("+2")
    await canvas.findByText(
      "The guard condition should label this control flow."
    )
  },
}

// ── Assessment editor (full editor, grading mode) ────────────────────────────
/** The full editor in Assessment mode — click an element to give feedback. */
export const Assessment: Story = {
  name: "Assessment: Give Feedback",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={fixtureByType.ActivityDiagram} />,
}

// The shipped ActivityDiagram fixture has `assessments: {}`, so the read-only
// review surface would render an entirely UNGRADED diagram. Spread a real
// assessment map (keyed by the fixture's actual node / edge ids — read from
// tests/fixtures/activity-diagram.json) so the canvas shows every on-canvas
// AssessmentIcon state at once: score>0 → green check, score<0 → red cross,
// score===0 → blue warn, plus graded-without-feedback, while several elements
// (Start, Fork, End, …) stay ungraded (no icon).
const A = (
  modelElementId: string,
  elementType: string,
  score: number,
  feedback?: string
): Assessment => ({ modelElementId, elementType, score, feedback })

const gradedActivityModel: UMLModel = {
  ...fixtureByType.ActivityDiagram,
  assessments: {
    // ── green (score > 0) ──
    "770e8400-e29b-41d4-a716-446655440021": A(
      "770e8400-e29b-41d4-a716-446655440021",
      "node",
      5,
      "Clear, verb-first activity name."
    ),
    "edge-flow-initial-process": A(
      "edge-flow-initial-process",
      "edge",
      1,
      "Correct control flow out of the initial node."
    ),
    // ── red (score < 0) ──
    "770e8400-e29b-41d4-a716-446655440023": A(
      "770e8400-e29b-41d4-a716-446655440023",
      "node",
      -2,
      "Ship Item should be an activity, not a bare action here."
    ),
    "edge-flow-process-merge": A(
      "edge-flow-process-merge",
      "edge",
      -1,
      "This flow should target the decision, not a merge node."
    ),
    // ── blue (score === 0) ──
    "770e8400-e29b-41d4-a716-446655440022": A(
      "770e8400-e29b-41d4-a716-446655440022",
      "node",
      0,
      "Acceptable, but adds no points here."
    ),
    // ── graded, but no feedback (icon shows, no comment) ──
    "770e8400-e29b-41d4-a716-446655440024": A(
      "770e8400-e29b-41d4-a716-446655440024",
      "node",
      2
    ),
    // Start (…440020), Fork (…440025), End (…440026), HFork (…440027) and the
    // remaining edges are intentionally left UNGRADED (no icon).
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
  render: () => <ApollonAssessable model={gradedActivityModel} readonly />,
}
