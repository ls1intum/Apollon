import type { CSSProperties } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useReactFlow } from "@xyflow/react"
import { Apollon, useControl, ZOOM_ID } from "@tumaet/apollon"
import { editorStoryMeta, fixtureByType } from "../_support/editor"

/**
 * The public **controls API** (`@tumaet/apollon`). The editor's built-in chrome —
 * the element **palette**, the **minimap**, and the **zoom / history** cluster —
 * are first-class controls on one overlay registry. In React you **compose** them
 * as `<Apollon>` children:
 *
 *   - **Presence renders it** — `<Apollon.Zoom/>` shows the cluster.
 *   - **Omission hides it** — leave a child out and it is gone (pass *some*
 *     children and the editor drops its defaults, so an empty compose = bare canvas).
 *   - **Typed props reconfigure it** — `<Apollon.Zoom region="bottom-center"
 *     history={false}/>`.
 *   - **Replace it** — register your own control at the reserved id (`ZOOM_ID`)
 *     with `useControl`, so it renders inside React Flow and can drive the viewport.
 *
 * The same descriptors drive the vanilla path — `new ApollonEditor(el, { controls:
 * [zoomControl(), …] })` — since both compile to the one registry. The `Playground`
 * story wires every knob to Storybook controls; the rest are focused recipes.
 */

// The six corner regions the zoom cluster can anchor to.
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
 * A fully-functional REPLACEMENT for the zoom cluster. It drives the viewport
 * through `useReactFlow`, which only resolves because `useControl` runs its
 * `render` INSIDE React Flow — the proof that a replacement is a real control, not
 * a static badge. Registering it at `ZOOM_ID` supersedes the built-in zoom.
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

/** Compose a replacement built-in: register `BrandedZoom` at the reserved zoom id. */
function ReplacementZoom({
  region,
}: {
  region: (typeof CORNER_REGIONS)[number]
}) {
  useControl(
    () => ({ id: ZOOM_ID, region, render: () => <BrandedZoom /> }),
    [region]
  )
  return null
}

interface ControlArgs {
  palette: boolean
  minimap: boolean
  minimapPosition: (typeof MINIMAP_CORNERS)[number]
  minimapPannable: boolean
  zoom: boolean
  zoomRegion: (typeof CORNER_REGIONS)[number]
  zoomHistory: boolean
  replaceZoom: boolean
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

const FULLSCREEN: CSSProperties = { height: "100vh", width: "100%" }

// ── Interactive playground ────────────────────────────────────────────────────
/**
 * Every knob of the controls API, wired to Storybook controls. Toggle a built-in
 * off (it vanishes), move it to another region, drop the zoom cluster's history,
 * or swap in a custom zoom — each edit re-composes the children, so the live
 * editor reacts.
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
    zoomHistory: true,
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
      description: "Replace the cluster with a custom control at `ZOOM_ID`",
      table: { category: "Zoom" },
      if: { arg: "zoom", truthy: true },
    },
    zoomHistory: {
      control: "boolean",
      description: "`history` — show the undo / redo island",
      table: { category: "Zoom" },
      if: { arg: "replaceZoom", truthy: false },
    },
  },
  render: (args) => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      style={FULLSCREEN}
    >
      {args.palette && <Apollon.Palette />}
      {args.zoom &&
        (args.replaceZoom ? (
          <ReplacementZoom region={args.zoomRegion} />
        ) : (
          <Apollon.Zoom region={args.zoomRegion} history={args.zoomHistory} />
        ))}
      {args.minimap && (
        <Apollon.MiniMap
          region={args.minimapPosition}
          pannable={args.minimapPannable}
        />
      )}
    </Apollon>
  ),
}

// ── Focused recipes ───────────────────────────────────────────────────────────
/** The editor as shipped — no children, so the palette + minimap + zoom defaults render. */
export const Default: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      style={FULLSCREEN}
    />
  ),
}

/**
 * Bare canvas. Providing ANY children (even the non-rendering `{false}` here) means
 * "I'm composing the chrome myself", so the editor stops injecting its palette /
 * zoom / minimap defaults. None of these children are chrome → nothing renders.
 * (Contrast `Default`, which passes no children at all and gets the full defaults.)
 */
export const BareCanvas: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      style={FULLSCREEN}
    >
      {false}
    </Apollon>
  ),
}

/** Move the zoom cluster to the bottom-center and the minimap to the top-right — one `region` each. */
export const Relocated: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      style={FULLSCREEN}
    >
      <Apollon.Palette />
      <Apollon.Zoom region="bottom-center" />
      <Apollon.MiniMap region="top-right" />
    </Apollon>
  ),
}

/** Reconfigure via typed props: drop undo/redo from the zoom cluster (`history={false}`). */
export const ZoomWithoutHistory: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      style={FULLSCREEN}
    >
      <Apollon.Palette />
      <Apollon.Zoom history={false} />
      <Apollon.MiniMap />
    </Apollon>
  ),
}

/** Replace the zoom cluster with a custom, fully-functional control at `ZOOM_ID`. */
export const CustomZoom: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      style={FULLSCREEN}
    >
      <Apollon.Palette />
      <ReplacementZoom region="bottom-left" />
      <Apollon.MiniMap />
    </Apollon>
  ),
}
