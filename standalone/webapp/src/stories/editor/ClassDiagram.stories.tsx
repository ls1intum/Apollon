import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import type { Assessment, UMLModel } from "@tumaet/apollon"
import {
  editorStoryMeta,
  ApollonEditable,
  ApollonAssessable,
  ApollonFixture,
  fixtureByType,
  EditorStoreDecorator,
  ElementGallery,
  EdgeGallery,
  SeededPopoverHarness,
  makeNode,
  makeEdge,
} from "../_support/editor"
import { ClassEditPopover } from "@tumaet/apollon/components/popovers/classDiagram/ClassEditPopover"
import { ClassGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/classDiagram/ClassGiveFeedbackPopover"
import { ClassSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/classDiagram/ClassSeeFeedbackPopover"
import { EdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ClassDiagramEdgeEditPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

import adapter from "assets/diagramTemplates/Adapter.json"
import bridge from "assets/diagramTemplates/Bridge.json"
import command from "assets/diagramTemplates/Command.json"
import observer from "assets/diagramTemplates/Observer.json"
import factory from "assets/diagramTemplates/Factory.json"

const meta = {
  title: "Editor/Class Diagram",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const asModel = (m: unknown) => m as unknown as UMLModel

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.ClassDiagram} />,
}

/** Editable blank canvas — build a class diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="ClassDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ClassDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ClassDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Class node editor — name, stereotype, attributes, methods. */
export const EditClass: Story = {
  name: "Edit: Class",
  parameters: { layout: "centered" },
  tags: ["autodocs", "test"],
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("class-1", "class", {
            name: "Account",
            stereotype: undefined,
            attributes: [{ id: "a1", name: "+ balance: number" }],
            methods: [{ id: "m1", name: "+ deposit(amount)" }],
          })
        )
      }
    >
      <ClassEditPopover elementId="class-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Popover title + the seeded node name bound into its name input (the
    // name, attribute and method inputs all share the same placeholder, so
    // assert by display value instead).
    await expect(canvas.getByText("Class")).toBeInTheDocument()
    await expect(canvas.getByDisplayValue("Account")).toBeVisible()
    // The seeded attribute + method rows render their editable text.
    await expect(canvas.getByDisplayValue("+ balance: number")).toBeVisible()
    await expect(canvas.getByDisplayValue("+ deposit(amount)")).toBeVisible()
  },
}

/** Association editor — type, swap, source/target role + multiplicity. */
export const EditAssociation: Story = {
  name: "Edit: Association",
  parameters: { layout: "centered" },
  tags: ["autodocs", "test"],
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      width={360}
      seed={(diagram) => {
        diagram.getState().addNode(makeNode("a", "class", { name: "A" }))
        diagram.getState().addNode(makeNode("b", "class", { name: "B" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "ClassBidirectional", "a", "b", {
            sourceRole: "owner",
            sourceMultiplicity: "1",
            targetRole: "items",
            targetMultiplicity: "*",
          })
        )
      }}
    >
      <EdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Popover title + the seeded role/multiplicity values bound into the inputs.
    await expect(canvas.getByText("Edge")).toBeInTheDocument()
    await expect(canvas.getByDisplayValue("owner")).toBeVisible()
    await expect(canvas.getByDisplayValue("items")).toBeVisible()
    await expect(canvas.getByDisplayValue("*")).toBeVisible()
  },
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Give = the grader's input form (score + comment per element row); See =
// the read-only review of a stored assessment. The See stories seed the
// diagram store's `assessments` map (keyed by model-element id), which is where
// SeeFeedbackAssessmentBox reads its score/feedback from via `getAssessment`.

/** Give-feedback form for a class node — score + comment for node, attrs, methods. */
export const GiveFeedbackClass: Story = {
  name: "Feedback (Give): Class",
  parameters: { layout: "centered" },
  tags: ["autodocs", "test"],
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("class-1", "class", {
            name: "Account",
            attributes: [{ id: "a1", name: "+ balance: number" }],
            methods: [{ id: "m1", name: "+ deposit(amount)" }],
          })
        )
      }
    >
      <ClassGiveFeedbackPopover elementId="class-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // One give-feedback box per row (node + attribute + method): each renders
    // an empty Points input + Feedback textarea (labelled, not placeholdered),
    // all blank in the fresh-grade flow (nothing seeded into the assessments map).
    const points = canvas.getAllByLabelText("Points")
    const feedback = canvas.getAllByLabelText("Feedback")
    await expect(points).toHaveLength(3)
    await expect(feedback).toHaveLength(3)
    await expect(points[0]).toHaveValue(null)
    await expect(feedback[0]).toHaveValue("")
    await expect(
      canvas.getByRole("button", { name: /next assessment/i })
    ).toBeInTheDocument()
  },
}

/**
 * Give-feedback form opened on an ALREADY-GRADED class — the re-grading flow.
 * The seed populates the assessments map, so each box's Points/Feedback fields
 * hydrate from `existing?.score`/`existing?.feedback` (the
 * GiveFeedbackAssessmentBox pre-populate branch) rather than starting blank.
 */
export const GiveFeedbackPrefilled: Story = {
  name: "Feedback (Give): Class — pre-filled",
  parameters: { layout: "centered" },
  tags: ["autodocs", "test"],
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("class-1", "class", {
            name: "Account",
            attributes: [{ id: "a1", name: "+ balance: number" }],
            methods: [{ id: "m1", name: "+ deposit(amount)" }],
          })
        )
        diagram.getState().setAssessments({
          "class-1": {
            modelElementId: "class-1",
            elementType: "node",
            score: 7,
            feedback: "Solid class, but balance should be private.",
          },
          a1: {
            modelElementId: "a1",
            elementType: "attribute",
            score: 2,
            feedback: "Correct type and visibility.",
          },
          m1: {
            modelElementId: "m1",
            elementType: "method",
            score: 3,
            feedback: "Validate that the amount is positive.",
          },
        })
      }}
    >
      <ClassGiveFeedbackPopover elementId="class-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The number input holds the seeded score; type=number → numeric value.
    const points = canvas.getAllByLabelText("Points")
    await expect(points[0]).toHaveValue(7)
    // The textarea is pre-populated with the seeded feedback (re-grade flow).
    await expect(
      canvas.getByDisplayValue("Solid class, but balance should be private.")
    ).toBeVisible()
    await expect(
      canvas.getByDisplayValue("Validate that the amount is positive.")
    ).toBeVisible()
  },
}

/** See-feedback (read-only) view of a class node with a graded assessment. */
export const SeeFeedbackClass: Story = {
  name: "Feedback (See): Class",
  parameters: { layout: "centered" },
  tags: ["autodocs", "test"],
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("class-1", "class", {
            name: "Account",
            attributes: [{ id: "a1", name: "+ balance: number" }],
            methods: [{ id: "m1", name: "+ deposit(amount)" }],
          })
        )
        diagram.getState().setAssessments({
          "class-1": {
            modelElementId: "class-1",
            elementType: "node",
            score: 8,
            feedback: "Good class — balance should be private, not public.",
          },
          a1: {
            modelElementId: "a1",
            elementType: "attribute",
            score: 2,
            feedback: "Correct type and visibility.",
          },
          m1: {
            modelElementId: "m1",
            elementType: "method",
            score: 3,
            feedback: "Validate that the amount is positive.",
          },
        })
      }}
    >
      <ClassSeeFeedbackPopover elementId="class-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Each box shows its read-only score as a signed badge + its feedback
    // (node +8, attr +2, method +3).
    await expect(canvas.getByText("+8")).toBeInTheDocument()
    await expect(canvas.getByText("+2")).toBeInTheDocument()
    await expect(canvas.getByText("+3")).toBeInTheDocument()
    await expect(canvas.getByText(/balance should be private/)).toBeVisible()
    await expect(canvas.getByText(/amount is positive/)).toBeVisible()
  },
}

/**
 * PROTOTYPICAL see-feedback coverage — every tone the redesigned See box can
 * render, side by side in ONE class popover so the whole vocabulary is visible
 * at a glance. The box no longer shows an ambiguous bare "-"; each state has a
 * distinct rendering:
 *  - node:        positive score → a signed "+5" badge + feedback
 *  - attr-zero:   score 0 → a "0" (blue/zero-tone) badge + feedback
 *  - attr-neg:    negative score → a signed "-2" badge + feedback
 *  - attr-nofb:   graded but EMPTY feedback → tone badge + muted "No comment"
 *  - method-ungraded: UNGRADED (id omitted from setAssessments) → "Not graded"
 *    badge, no feedback line (the box reads `getAssessment(id)` → undefined)
 *  - method-long: a ~480-char feedback paragraph (long-text wrap + popover scroll)
 */
export const SeeFeedbackStates: Story = {
  name: "Feedback (See): All states",
  parameters: { layout: "centered" },
  tags: ["autodocs", "test"],
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("class-1", "class", {
            name: "Account",
            attributes: [
              { id: "attr-zero", name: "+ balance: number" },
              { id: "attr-neg", name: "+ id: number" },
              { id: "attr-nofb", name: "+ owner: String" },
            ],
            methods: [
              { id: "method-ungraded", name: "+ close()" },
              { id: "method-long", name: "+ deposit(amount)" },
            ],
          })
        )
        diagram.getState().setAssessments({
          // (a) positive score + feedback
          "class-1": {
            modelElementId: "class-1",
            elementType: "node",
            score: 5,
            feedback: "Well-modelled class with a clear responsibility.",
          },
          // (b) score 0 + feedback
          "attr-zero": {
            modelElementId: "attr-zero",
            elementType: "attribute",
            score: 0,
            feedback: "No points: balance should not be publicly visible.",
          },
          // (c) negative score + feedback
          "attr-neg": {
            modelElementId: "attr-neg",
            elementType: "attribute",
            score: -2,
            feedback: "Penalty: exposing a raw id breaks encapsulation.",
          },
          // (d) graded with EMPTY feedback → tone badge + muted "No comment"
          "attr-nofb": {
            modelElementId: "attr-nofb",
            elementType: "attribute",
            score: 1,
            feedback: "",
          },
          // (e) method-ungraded is intentionally OMITTED → "Not graded" badge
          // (f) graded + a long (~480 char) feedback paragraph
          "method-long": {
            modelElementId: "method-long",
            elementType: "method",
            score: 4,
            feedback:
              "This method needs a much more thorough explanation: the score reflects that while the signature is acceptable, you have not documented the pre-conditions, the post-conditions, the thrown exceptions, or the expected side effects. A grader reading this later must be able to reconstruct your full reasoning from the feedback alone, so please expand on the expected post-conditions in the method contract and describe how a caller is meant to recover from a failure here.",
          },
        })
      }}
    >
      <ClassSeeFeedbackPopover elementId="class-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Each of the four redesigned tones renders explicitly and unambiguously:
    // a positive signed score (node = +5)…
    await expect(canvas.getByText("+5")).toBeInTheDocument()
    // …a negative signed score (attr-neg = -2)…
    await expect(canvas.getByText("-2")).toBeInTheDocument()
    // …the UNGRADED method (id omitted from setAssessments) → "Not graded"…
    await expect(canvas.getByText("Not graded")).toBeInTheDocument()
    // …and the graded-but-empty-feedback attr → muted "No comment".
    await expect(canvas.getByText("No comment")).toBeInTheDocument()
    // The long feedback paragraph still renders in full (partial match).
    await expect(
      canvas.getByText(/expected post-conditions in the method contract/)
    ).toBeVisible()
  },
}

/** Give-feedback form for an association edge — a single score + comment row. */
export const GiveFeedbackAssociation: Story = {
  name: "Feedback (Give): Association",
  parameters: { layout: "centered" },
  tags: ["autodocs", "test"],
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(makeNode("a", "class", { name: "A" }))
        diagram.getState().addNode(makeNode("b", "class", { name: "B" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "ClassBidirectional", "a", "b"))
      }}
    >
      <EdgeGiveFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // A single give-feedback box for the edge: one blank Points + Feedback pair.
    await expect(canvas.getByLabelText("Points")).toHaveValue(null)
    await expect(canvas.getByLabelText("Feedback")).toHaveValue("")
    await expect(
      canvas.getByRole("button", { name: /next assessment/i })
    ).toBeInTheDocument()
  },
}

/** See-feedback (read-only) view of an association edge with a graded assessment. */
export const SeeFeedbackAssociation: Story = {
  name: "Feedback (See): Association",
  parameters: { layout: "centered" },
  tags: ["autodocs", "test"],
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(makeNode("a", "class", { name: "A" }))
        diagram.getState().addNode(makeNode("b", "class", { name: "B" }))
        diagram
          .getState()
          .addEdge(makeEdge("edge-1", "ClassBidirectional", "a", "b"))
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 1,
            feedback: "Multiplicity is missing on the target end.",
          },
        })
      }}
    >
      <EdgeSeeFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The stored edge assessment renders read-only: a signed +1 badge + feedback.
    await expect(canvas.getByText("+1")).toBeInTheDocument()
    await expect(
      canvas.getByText(/Multiplicity is missing on the target end\./)
    ).toBeVisible()
  },
}

// ── Assessment editor (full editor, grading mode) ────────────────────────────
/** The full editor in Assessment mode — click an element to give feedback. */
export const Assessment: Story = {
  name: "Assessment: Give Feedback",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={fixtureByType.ClassDiagram} />,
}

// The shipped ClassDiagram fixture has `assessments: {}`, so the read-only
// review surface would render an entirely UNGRADED diagram. Spread a real
// assessment map (keyed by the fixture's actual node / attribute / method /
// edge ids — read from tests/fixtures/class-diagram.json) so the canvas shows
// every on-canvas AssessmentIcon state at once: score>0 → green check,
// score<0 → red cross, score===0 → blue warn, plus graded-without-feedback,
// while >=1 element (Color, Legend, Package, …) stays ungraded (no icon).
const A = (
  modelElementId: string,
  elementType: string,
  score: number,
  feedback?: string
): Assessment => ({ modelElementId, elementType, score, feedback })

const gradedClassModel: UMLModel = {
  ...fixtureByType.ClassDiagram,
  assessments: {
    // ── green (score > 0) ──
    "550e8400-e29b-41d4-a716-446655440001": A(
      "550e8400-e29b-41d4-a716-446655440001",
      "node",
      5,
      "Well-modelled base class."
    ),
    a1: A("a1", "attribute", 2, "Correct type and visibility."),
    m1: A("m1", "method", 1, "Good — consider a return type."),
    "edge-inheritance-dog-animal": A(
      "edge-inheritance-dog-animal",
      "edge",
      2,
      "Correct inheritance direction."
    ),
    // ── red (score < 0) ──
    "550e8400-e29b-41d4-a716-446655440003": A(
      "550e8400-e29b-41d4-a716-446655440003",
      "node",
      -1,
      "Dog should not redeclare inherited members."
    ),
    "edge-dependency-imovable-vehicle": A(
      "edge-dependency-imovable-vehicle",
      "edge",
      -1,
      "This dependency is the wrong way around."
    ),
    // ── blue (score === 0) ──
    "550e8400-e29b-41d4-a716-446655440002": A(
      "550e8400-e29b-41d4-a716-446655440002",
      "node",
      0,
      "Interface is fine but adds no points here."
    ),
    "edge-bidirectional-dog-imovable": A(
      "edge-bidirectional-dog-imovable",
      "edge",
      0,
      "A unidirectional association would be clearer."
    ),
    // ── graded, but no feedback (icon shows, See popover feedback is "-") ──
    "550e8400-e29b-41d4-a716-446655440004": A(
      "550e8400-e29b-41d4-a716-446655440004",
      "node",
      3
    ),
    a5: A("a5", "attribute", 1),
    // Color (…440005), Legend (…440006), Package (…440000) and the remaining
    // attributes / methods / edges are intentionally left UNGRADED (no icon).
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
  name: "Assessment: See Feedback",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonAssessable model={gradedClassModel} readonly />,
}

// ── Templates (GoF starters) ─────────────────────────────────────────────────
export const TemplateAdapter: Story = {
  name: "Template: Adapter",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(adapter)} />,
}
export const TemplateBridge: Story = {
  name: "Template: Bridge",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(bridge)} />,
}
export const TemplateCommand: Story = {
  name: "Template: Command",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(command)} />,
}
export const TemplateObserver: Story = {
  name: "Template: Observer",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(observer)} />,
}
export const TemplateFactory: Story = {
  name: "Template: Factory",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(factory)} />,
}
