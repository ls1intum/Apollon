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
import { ComponentEditPopover } from "@tumaet/apollon/components/popovers/componentDiagram/ComponentEditPopover"
import { ComponentSubsystemEditPopover } from "@tumaet/apollon/components/popovers/componentDiagram/ComponentSubsystemEditPopover"
import { ComponentEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ComponentDiagramEdgeEditPopover"
import { DefaultNodeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeGiveFeedbackPopover"
import { DefaultNodeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/DefaultNodeSeeFeedbackPopover"
import { EdgeGiveFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeGiveFeedbackPopover"
import { EdgeSeeFeedbackPopover } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeSeeFeedbackPopover"

const meta = {
  title: "Editor/Component Diagram",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Popover-harness feedback stories run in the Vitest runner: the
// ["autodocs","test"] tag keeps them scannable in Docs AND test-gated, and
// each `play` asserts the seeded content rendered (so a regression that blanks
// a popover fails the suite rather than passing silently).
const popoverTags = ["autodocs", "test"]

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.ComponentDiagram} />,
}

/** Editable blank canvas — build a component diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="ComponentDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ComponentDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ComponentDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Component node editor — name + component-header toggle. */
export const EditComponent: Story = {
  name: "Edit: Component",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ComponentDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("component-1", "component", {
            name: "AuthService",
            isComponentHeaderShown: true,
          })
        )
      }
    >
      <ComponentEditPopover elementId="component-1" />
    </SeededPopoverHarness>
  ),
}

/** Subsystem node editor — name + subsystem-header toggle. */
export const EditComponentSubsystem: Story = {
  name: "Edit: Subsystem",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ComponentDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("subsystem-1", "componentSubsystem", {
            name: "Billing",
            isComponentSubsystemHeaderShown: true,
          })
        )
      }
    >
      <ComponentSubsystemEditPopover elementId="subsystem-1" />
    </SeededPopoverHarness>
  ),
}

/** Dependency edge editor — line style, swap, edge type, connection info. */
export const EditComponentDependency: Story = {
  name: "Edit: Dependency",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ComponentDiagram"
      width={360}
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("source", "component", {
            name: "AuthService",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().addNode(
          makeNode("target", "component", {
            name: "UserStore",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().addEdge(
          makeEdge("edge-1", "ComponentDependency", "source", "target", {
            label: "uses",
          })
        )
      }}
    >
      <ComponentEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

// ── Feedback popovers (Assessment mode) ──────────────────────────────────────
// Components render via the shared DEFAULT node, so these exercise the
// DefaultNode give/see feedback popovers. Give = the grader's score + comment
// form; See = the read-only review, which reads from the diagram store's
// `assessments` map (keyed by model-element id).

/** Give-feedback form for a component node (shared default-node feedback popover). */
export const GiveFeedbackComponent: Story = {
  name: "Feedback (Give): Component",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ComponentDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("component-1", "component", {
            name: "AuthService",
            isComponentHeaderShown: true,
          })
        )
      }
    >
      <DefaultNodeGiveFeedbackPopover elementId="component-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header names the seeded component; the box renders a score + feedback form.
    await canvas.findByText("AuthService")
    await canvas.findByText("Points")
    await canvas.findByText("Feedback")
  },
}

/** See-feedback (read-only) view of a component node with a graded assessment. */
export const SeeFeedbackComponent: Story = {
  name: "Feedback (See): Component",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ComponentDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("component-1", "component", {
            name: "AuthService",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().setAssessments({
          "component-1": {
            modelElementId: "component-1",
            elementType: "node",
            score: 3,
            feedback: "Well-scoped component with a single responsibility.",
          },
        })
      }}
    >
      <DefaultNodeSeeFeedbackPopover elementId="component-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The seeded node score + feedback are rendered read-only.
    await canvas.findByText("+3")
    await canvas.findByText(
      "Well-scoped component with a single responsibility."
    )
  },
}

/** Give-feedback form for a dependency edge — a single score + comment row. */
export const GiveFeedbackDependency: Story = {
  name: "Feedback (Give): Dependency",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ComponentDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("source", "component", {
            name: "AuthService",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().addNode(
          makeNode("target", "component", {
            name: "UserStore",
            isComponentHeaderShown: true,
          })
        )
        diagram
          .getState()
          .addEdge(
            makeEdge("edge-1", "ComponentDependency", "source", "target")
          )
      }}
    >
      <EdgeGiveFeedbackPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The edge feedback header names the edge by its type; the box is a form.
    await canvas.findByText("ComponentDependency")
    await canvas.findByText("Points")
    await canvas.findByText("Feedback")
  },
}

/** See-feedback (read-only) view of a dependency edge with an assessment. */
export const SeeFeedbackDependency: Story = {
  name: "Feedback (See): Dependency",
  tags: popoverTags,
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ComponentDiagram"
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("source", "component", {
            name: "AuthService",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().addNode(
          makeNode("target", "component", {
            name: "UserStore",
            isComponentHeaderShown: true,
          })
        )
        diagram
          .getState()
          .addEdge(
            makeEdge("edge-1", "ComponentDependency", "source", "target")
          )
        diagram.getState().setAssessments({
          "edge-1": {
            modelElementId: "edge-1",
            elementType: "edge",
            score: 2,
            feedback: "This dependency points the wrong way around.",
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
    await canvas.findByText("ComponentDependency")
    await canvas.findByText("+2")
    await canvas.findByText("This dependency points the wrong way around.")
  },
}
