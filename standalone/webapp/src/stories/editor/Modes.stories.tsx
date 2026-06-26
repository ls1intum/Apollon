import type { Meta, StoryObj } from "@storybook/react-vite"
import { within, expect, userEvent, waitFor } from "storybook/test"
import { Apollon, ApollonMode } from "@tumaet/apollon/react"
import { AssessmentSelectableWrapper } from "@tumaet/apollon/components/wrapper/AssessmentSelectableWrapper"
import {
  editorStoryMeta,
  ApollonFixture,
  ApollonHighlightPicker,
  ApollonWithHighlights,
  SelectionHarness,
  fixtureByType,
  makeNode,
} from "../_support/editor"

// The editor's INTERACTIVE MODES — the surfaces the per-type stories skip: the
// quiz interactive-element picker (ApollonView.Highlight), the host-driven
// highlight overlay (setElementHighlights), the assessment-review SELECTION
// model, the Exporting mode, and the dark theme. Full-editor stories mount a
// second React copy of the editor so they stay out of the Vitest runner
// (editorStoryMeta's `!test`); the lightweight SELECTION stories opt back IN
// (`tags: ["test", ...]`) with a `play` that asserts the rendered selection.

const meta = {
  title: "Editor/Modes",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Real ids from tests/fixtures/class-diagram.json — used to key the host
// highlight overlay onto concrete elements.
const ANIMAL_NODE_ID = "550e8400-e29b-41d4-a716-446655440001"
const DEPENDENCY_EDGE_ID = "edge-dependency-imovable-vehicle"

// The inline-style signature the assessment-selection wrapper paints onto a
// selected/hovered element (its border + color-mix fill both reference this
// CSS custom property). cssstyle preserves `var()` values verbatim, so this is
// a deterministic substring to assert against.
const SELECTION_STYLE_TOKEN = "apollon-interactive-selection"

// ── Highlight view (interactive-element picker) ──────────────────────────────
/** The quiz "highlight" picker the playground's Highlight toggle opens — click elements to mark them interactive. */
export const HighlightPicker: Story = {
  name: "Highlight: Interactive Element Picker",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonHighlightPicker model={fixtureByType.ClassDiagram} />,
}

// ── Host-driven highlight overlay ────────────────────────────────────────────
/** The imperative `editor.setElementHighlights(...)` overlay — Athena/missing-feedback tints painted over real ids. */
export const HostHighlights: Story = {
  name: "Highlight: Host Element Highlights",
  parameters: { layout: "fullscreen" },
  render: () => (
    <ApollonWithHighlights
      model={fixtureByType.ClassDiagram}
      highlights={{
        [ANIMAL_NODE_ID]: "rgba(23,162,184,0.35)",
        [DEPENDENCY_EDGE_ID]: "rgba(220,53,69,0.4)",
      }}
    />
  ),
}

// ── Assessment-review selection (lightweight → testable) ─────────────────────
/** A single element selected on the see-feedback review surface — carries the selection border + fill. */
export const SelectionSingle: Story = {
  name: "Selection: Single Element",
  tags: ["test", "!autodocs", "!dev"],
  parameters: { layout: "centered" },
  render: () => (
    <SelectionHarness
      diagramType="ClassDiagram"
      seed={(diagram) =>
        diagram
          .getState()
          .addNode(makeNode("class-1", "class", { name: "Account" }))
      }
      selectedIds={["class-1"]}
    >
      <AssessmentSelectableWrapper elementId="class-1">
        <div>Account</div>
      </AssessmentSelectableWrapper>
    </SelectionHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Account")).toBeInTheDocument()
    const el = canvasElement.querySelector(
      '[data-apollon-element-id="class-1"]'
    )
    expect(el).not.toBeNull()
    expect(el?.getAttribute("style") ?? "").toContain(SELECTION_STYLE_TOKEN)
  },
}

/** Selecting a class node auto-selects its nested members — node, attribute and method all read selected. */
export const SelectionNested: Story = {
  name: "Selection: Node With Nested Members",
  tags: ["test", "!autodocs", "!dev"],
  parameters: { layout: "centered" },
  render: () => (
    <SelectionHarness
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
      // node + its attribute + method, exactly what clicking the node selects.
      selectedIds={["class-1", "a1", "m1"]}
    >
      <AssessmentSelectableWrapper elementId="class-1">
        <div>Account</div>
      </AssessmentSelectableWrapper>
      <AssessmentSelectableWrapper elementId="a1">
        <div>+ balance: number</div>
      </AssessmentSelectableWrapper>
      <AssessmentSelectableWrapper elementId="m1">
        <div>+ deposit(amount)</div>
      </AssessmentSelectableWrapper>
    </SelectionHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Account")).toBeInTheDocument()
    for (const id of ["class-1", "a1", "m1"]) {
      const el = canvasElement.querySelector(
        `[data-apollon-element-id="${id}"]`
      )
      expect(el, `wrapper for ${id}`).not.toBeNull()
      expect(el?.getAttribute("style") ?? "").toContain(SELECTION_STYLE_TOKEN)
    }
  },
}

/** Hovering an unselected element on the review surface paints the same highlight ring — proven by hover in play. */
export const SelectionHover: Story = {
  name: "Selection: Hover Highlight",
  tags: ["test", "!autodocs", "!dev"],
  parameters: { layout: "centered" },
  render: () => (
    <SelectionHarness
      diagramType="ClassDiagram"
      seed={(diagram) =>
        diagram
          .getState()
          .addNode(makeNode("hover-1", "class", { name: "Color" }))
      }
      // Nothing pre-selected — the highlight is driven by the hover in play().
      selectedIds={[]}
    >
      <AssessmentSelectableWrapper elementId="hover-1">
        <div>Color</div>
      </AssessmentSelectableWrapper>
    </SelectionHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Color")).toBeInTheDocument()
    const el = canvasElement.querySelector(
      '[data-apollon-element-id="hover-1"]'
    )
    expect(el).not.toBeNull()
    // Idle: no selection styling yet.
    expect(el?.getAttribute("style") ?? "").not.toContain(SELECTION_STYLE_TOKEN)
    await userEvent.hover(el as Element)
    await waitFor(() =>
      expect(
        canvasElement
          .querySelector('[data-apollon-element-id="hover-1"]')
          ?.getAttribute("style") ?? ""
      ).toContain(SELECTION_STYLE_TOKEN)
    )
  },
}

// ── Exporting mode ───────────────────────────────────────────────────────────
/** Exporting mode renders the diagram as a static export — selection, popovers and editing affordances are dropped. */
export const Exporting: Story = {
  name: "Mode: Exporting",
  parameters: { layout: "fullscreen" },
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      mode={ApollonMode.Exporting}
      readonly
      style={{ height: "100vh", width: "100%" }}
    />
  ),
}

// ── Dark theme ───────────────────────────────────────────────────────────────
/** The full editor under the dark `--apollon-*` palette (`dataTheme="dark"`). */
export const ThemeDark: Story = {
  name: "Theme: Dark",
  parameters: { layout: "fullscreen" },
  render: () => (
    <ApollonFixture model={fixtureByType.ClassDiagram} dataTheme="dark" />
  ),
}
