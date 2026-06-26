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
