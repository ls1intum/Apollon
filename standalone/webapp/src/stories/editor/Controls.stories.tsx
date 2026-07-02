import type { CSSProperties } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useReactFlow } from "@xyflow/react"
import { Apollon } from "@tumaet/apollon"
import type { ControlsOptions } from "@tumaet/apollon"
import { editorStoryMeta, fixtureByType } from "../_support/editor"

/**
 * The public **controls API** (`@tumaet/apollon`). The editor's built-in chrome —
 * the element **palette**, the **minimap**, and the **zoom / history** cluster —
 * are first-class controls on the overlay engine, driven by one `controls` option
 * that is byte-identical across `new ApollonEditor(el, { controls })`,
 * `<Apollon controls={…}/>`, and the imperative `editor.setControls(…)` /
 * `setControl(key, …)`.
 *
 * Each built-in accepts three levels of control:
 *   - `false` — hide it.
 *   - a **placement** object — `{ region, order, inset, className, style, props }`
 *     to move / re-order / re-style / re-configure it.
 *   - `{ render }` — replace it entirely with your own node.
 *
 * The `Playground` story wires every knob to Storybook controls; because
 * `<Apollon controls>` is reactive, editing a control re-renders the live editor.
 * The remaining stories are focused recipes.
 */

// The six React-Flow panel corners the zoom cluster can anchor to.
const CORNER_REGIONS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const

// The minimap self-positions, so only the four true corners are meaningful.
const MINIMAP_CORNERS = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
] as const

/**
 * A fully-functional REPLACEMENT for the zoom cluster: rendered inside ReactFlow,
 * so it can drive the viewport through `useReactFlow`. This is what a host passes
 * as `controls.zoom.render` — proof that a replacement is a real control, not a
 * static badge.
 */
function BrandedZoom() {
  const rf = useReactFlow()
  const btn: CSSProperties = {
    all: "unset",
    cursor: "pointer",
    width: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    borderRadius: 8,
    fontSize: 18,
    lineHeight: 1,
  }
  return (
    <div
      role="toolbar"
      aria-label="Custom zoom"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        borderRadius: 999,
        background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
        color: "white",
        boxShadow: "0 4px 14px rgba(79,70,229,0.4)",
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      <button
        type="button"
        style={btn}
        aria-label="Zoom out"
        onClick={() => rf.zoomOut()}
      >
        −
      </button>
      <button
        type="button"
        style={btn}
        aria-label="Zoom in"
        onClick={() => rf.zoomIn()}
      >
        +
      </button>
      <span style={{ padding: "0 6px", letterSpacing: 0.3 }}>Custom</span>
    </div>
  )
}

interface ControlArgs {
  palette: boolean
  minimap: boolean
  minimapPosition: (typeof MINIMAP_CORNERS)[number]
  minimapPannable: boolean
  zoom: boolean
  zoomRegion: (typeof CORNER_REGIONS)[number]
  zoomShowZoom: boolean
  zoomShowHistory: boolean
  replaceZoom: boolean
}

/** Assemble the public `controls` object from the flat Storybook args. */
function controlsFromArgs(a: ControlArgs): ControlsOptions {
  return {
    palette: a.palette ? {} : false,
    minimap: a.minimap
      ? { region: a.minimapPosition, props: { pannable: a.minimapPannable } }
      : false,
    zoom: !a.zoom
      ? false
      : a.replaceZoom
        ? { region: a.zoomRegion, render: () => <BrandedZoom /> }
        : {
            region: a.zoomRegion,
            props: { showZoom: a.zoomShowZoom, showHistory: a.zoomShowHistory },
          },
  }
}

const meta = {
  title: "Editor/Controls",
  ...editorStoryMeta,
  parameters: {
    ...editorStoryMeta.parameters,
    layout: "fullscreen",
  },
} satisfies Meta

export default meta
type Story = StoryObj<ControlArgs>

// ── Interactive playground ────────────────────────────────────────────────────
/**
 * Every knob of the controls API, wired to Storybook controls. Toggle a built-in
 * off, move it to another region, flip its `props`, or replace the zoom cluster —
 * the live editor reacts because `<Apollon controls>` is reactive.
 */
export const Playground: Story = {
  name: "Playground (interactive)",
  args: {
    palette: true,
    minimap: true,
    minimapPosition: "bottom-right",
    minimapPannable: true,
    zoom: true,
    zoomRegion: "bottom-left",
    zoomShowZoom: true,
    zoomShowHistory: true,
    replaceZoom: false,
  },
  argTypes: {
    palette: { control: "boolean", table: { category: "Palette" } },
    minimap: { control: "boolean", table: { category: "Minimap" } },
    minimapPosition: {
      control: "select",
      options: MINIMAP_CORNERS,
      table: { category: "Minimap" },
      if: { arg: "minimap", truthy: true },
    },
    minimapPannable: {
      control: "boolean",
      table: { category: "Minimap" },
      if: { arg: "minimap", truthy: true },
    },
    zoom: { control: "boolean", table: { category: "Zoom" } },
    zoomRegion: {
      control: "select",
      options: CORNER_REGIONS,
      table: { category: "Zoom" },
      if: { arg: "zoom", truthy: true },
    },
    replaceZoom: {
      control: "boolean",
      description: "Replace the cluster with a custom `render`",
      table: { category: "Zoom" },
      if: { arg: "zoom", truthy: true },
    },
    zoomShowZoom: {
      control: "boolean",
      description: "`props.showZoom` — the zoom buttons + readout",
      table: { category: "Zoom" },
      if: { arg: "replaceZoom", truthy: false },
    },
    zoomShowHistory: {
      control: "boolean",
      description: "`props.showHistory` — the undo / redo buttons",
      table: { category: "Zoom" },
      if: { arg: "replaceZoom", truthy: false },
    },
  },
  render: (args) => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      controls={controlsFromArgs(args)}
      style={{ height: "100vh", width: "100%" }}
    />
  ),
}

// ── Focused recipes ───────────────────────────────────────────────────────────
/** The editor as shipped — palette, minimap, and zoom/history cluster in their default homes. */
export const Default: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      style={{ height: "100vh", width: "100%" }}
    />
  ),
}

/** `{ palette: false, minimap: false, zoom: false }` — a distraction-free canvas with no chrome. */
export const BareCanvas: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      controls={{ palette: false, minimap: false, zoom: false }}
      style={{ height: "100vh", width: "100%" }}
    />
  ),
}

/** Move the zoom cluster to the bottom-center and the minimap to the top-right — one `region` each. */
export const Relocated: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      controls={{
        zoom: { region: "bottom-center" },
        minimap: { region: "top-right" },
      }}
      style={{ height: "100vh", width: "100%" }}
    />
  ),
}

/** Re-configure via `props`: drop undo/redo from the zoom cluster (`showHistory: false`). */
export const ZoomWithoutHistory: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      controls={{ zoom: { props: { showHistory: false } } }}
      style={{ height: "100vh", width: "100%" }}
    />
  ),
}

/** Replace the zoom cluster with a custom, fully-functional control via `render`. */
export const CustomZoom: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      controls={{ zoom: { render: () => <BrandedZoom /> } }}
      style={{ height: "100vh", width: "100%" }}
    />
  ),
}
