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
import { PetriNetPlaceEditPopover } from "@tumaet/apollon/components/popovers/petriNetDiagram/PetriNetPlaceEditPopover"
import { PetriNetEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/PetriNetEdgeEditPopover"
import { DefaultNodeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeGiveFeedbackPopover"
import { DefaultNodeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeSeeFeedbackPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

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

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Places render via the shared DEFAULT node, so these exercise the
// DefaultNode give/see feedback popovers. Give = the grader's score + comment
// form; See = the read-only review, which reads from the diagram store's
// `assessments` map (keyed by model-element id).

/** Give-feedback form for a place (shared default-node feedback popover). */
export const GiveFeedbackPlace: Story = {
  name: "Feedback (Give): Place",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="PetriNet"
      seed={(diagram) =>
        diagram
          .getState()
          .addNode(makeNode("place-1", "petriNetPlace", { name: "Waiting" }))
      }
    >
      <DefaultNodeGiveFeedbackPopover elementId="place-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded place; the box renders a score + feedback form.
    await canvas.findByText("Waiting")
    await canvas.findByPlaceholderText("0")
    await canvas.findByPlaceholderText("Add a comment…")
  },
}

/** See-feedback (read-only) view of a place with a graded assessment. */
export const SeeFeedbackPlace: Story = {
  name: "Feedback (See): Place",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="PetriNet"
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("place-1", "petriNetPlace", { name: "Waiting" }))
        diagram.getState().setAssessments({
          "place-1": {
            modelElementId: "place-1",
            elementType: "node",
            score: 3,
            feedback: "Correct initial marking for this place.",
          },
        })
      }}
    >
      <DefaultNodeSeeFeedbackPopover elementId="place-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score + feedback are rendered read-only.
    await canvas.findByText("+3")
    await canvas.findByText("Correct initial marking for this place.")
  },
}

/** Give-feedback form for a petri-net arc — a single score + comment row. */
export const GiveFeedbackArc: Story = {
  name: "Feedback (Give): Arc",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="PetriNet"
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

/** See-feedback (read-only) view of a petri-net arc with a graded assessment. */
export const SeeFeedbackArc: Story = {
  name: "Feedback (See): Arc",
  tags: ["autodocs", "test"],
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="PetriNet"
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
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 2,
            feedback: "Arc weight matches the transition's demand.",
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
    await canvas.findByText("Arc weight matches the transition's demand.")
  },
}

// ── Assessment editor (full editor, grading mode) ────────────────────────────
/** The full editor in Assessment mode — click an element to give feedback. */
export const Assessment: Story = {
  name: "Assessment: Give Feedback",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={fixtureByType.PetriNet} />,
}

// The shipped PetriNet fixture has `assessments: {}`, so the read-only review
// surface would render an entirely UNGRADED diagram. Spread a real assessment
// map (keyed by the fixture's actual place / transition / arc ids — read from
// tests/fixtures/petri-net.json) so the canvas shows every on-canvas
// AssessmentIcon state at once: score>0 → green check, score<0 → red cross,
// score===0 → blue warn, plus graded-without-feedback, while >=1 element (P4
// and the remaining arcs) stays ungraded (no icon).
const A = (
  modelElementId: string,
  elementType: string,
  score: number,
  feedback?: string
): Assessment => ({ modelElementId, elementType, score, feedback })

const gradedPetriNetModel: UMLModel = {
  ...fixtureByType.PetriNet,
  assessments: {
    // ── green (score > 0) ──
    "11111111-1111-4111-a111-111111111111": A(
      "11111111-1111-4111-a111-111111111111",
      "node",
      5,
      "Correct initial marking on P1."
    ),
    "22222222-2222-4222-a222-222222222222": A(
      "22222222-2222-4222-a222-222222222222",
      "node",
      2,
      "Transition T1 is well placed."
    ),
    "edge-p1-t1": A("edge-p1-t1", "edge", 2, "Arc weight matches T1's demand."),
    // ── red (score < 0) ──
    "33333333-3333-4333-a333-333333333333": A(
      "33333333-3333-4333-a333-333333333333",
      "node",
      -1,
      "P2 capacity should not be bounded here."
    ),
    "edge-t1-p2": A(
      "edge-t1-p2",
      "edge",
      -1,
      "This arc direction is reversed."
    ),
    // ── blue (score === 0) ──
    "44444444-4444-4444-a444-444444444444": A(
      "44444444-4444-4444-a444-444444444444",
      "node",
      0,
      "P3 is acceptable but earns no points here."
    ),
    // ── graded, but no feedback (icon shows, See popover feedback is "-") ──
    "55555555-5555-4555-a555-555555555555": A(
      "55555555-5555-4555-a555-555555555555",
      "node",
      3
    ),
    // P4 (…666666) and the remaining arcs (edge-t1-p3, edge-p2-t2, edge-p3-t2,
    // edge-t2-p4) are intentionally left UNGRADED (no icon).
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
  render: () => <ApollonAssessable model={gradedPetriNetModel} readonly />,
}
