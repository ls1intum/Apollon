import type { Meta, StoryObj } from "@storybook/react-vite"
import {
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

/**
 * **Reachability Graph** — the complete overview. `Playground` is the real,
 * editable editor (palette, selection, edit popups) loaded with a sample;
 * `Blank` is an empty editable canvas; `Elements` / `Edges` are galleries of
 * every shape / connector; the `Edit:` stories are the edit popovers. Use the
 * toolbar to switch light / dark. Everything for this diagram type lives in this
 * one Docs page.
 *
 * Tagged `!test` — these mount editor source (a 2nd React copy under the Vitest
 * runner), so they are visual: browse them here.
 */
const meta = {
  title: "Editor/Reachability Graph",
  tags: ["autodocs", "!test"],
  // The Docs page is the complete overview, but every story mounts a real
  // editor — rendering them all inline is slow. `inline: false` lazy-loads each
  // story in its own iframe (rendered on scroll), so the Docs page opens fast
  // while still showing everything.
  parameters: {
    docs: { story: { inline: false, height: "640px" } },
  },
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
