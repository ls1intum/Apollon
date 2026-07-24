---
id: overlay-controls
title: Overlay controls
description: Compose built-in editor chrome and add host controls in named canvas regions, with optional reserved space for fitView.
---

# Overlay controls

Apollon renders editor chrome — the palette, zoom controls, minimap, and host
buttons or rails — as **controls anchored in named canvas regions**. Built-in and
host controls use the same placement rules, so they can be composed instead of
being fixed around the editor.

Most hosts start with one of these tasks:

- **Keep the defaults and add one React button:** render `<ApollonDefaultControls />`
  plus an `<ApollonControl>` child.
- **Show only selected built-ins:** list `<Apollon.Zoom />`, `<Apollon.MiniMap />`,
  and/or `<Apollon.Palette />` as `<Apollon>` children.
- **Mount host-owned UI with its own context:** use `getRegionElement()` and render
  into it from your host root.

A control chooses a **region** and can optionally **reserve space**. Reserved space
is measured in pixels and used by `editor.fitView()` so diagram content is not
framed underneath chrome. Controls on the same side usually reserve the larger of
their sizes; controls in different band `lane`s stack and reserve the sum.

There are three API styles over the same registry. Pick by how your host renders:

- a **React host** inside the editor tree → [`<ApollonControl>`](#react-apolloncontrol)
- a **one-off imperative widget** → [`editor.addControl(...)`](#imperative-addcontrol)
- a **non-React host**, or one needing its **own React root / context** (theme, router) → [`getRegionElement` + `createPortal`](#the-host-portal-escape-hatch)

## Regions

Every control names one `OverlayRegion`. The six corner regions and the `header` /
`footer` / `left-rail` / `right-rail` bands are screen-space cells of a single CSS
grid laid over the canvas. The grid keeps normal-sized bands and corner regions
from overlapping; oversized host chrome should be made responsive or scrollable
by the host. `on-canvas` is viewport-transformed and
pans + zooms with the diagram.

| Region          | Where it sits                                                           |
| --------------- | ----------------------------------------------------------------------- |
| `top-left`      | Top-left corner, screen-space.                                          |
| `top-center`    | Top edge, centered, screen-space.                                       |
| `top-right`     | Top-right corner, screen-space (e.g. the collaboration presence bar).   |
| `bottom-left`   | Bottom-left corner, screen-space.                                       |
| `bottom-center` | Bottom edge, centered, screen-space.                                    |
| `bottom-right`  | Bottom-right corner, screen-space.                                      |
| `header`        | Full-width band pinned to the container top, above the `top-*` regions. |
| `footer`        | Full-width band pinned to the container bottom (e.g. an action bar).    |
| `left-rail`     | Full-height left band (e.g. the element palette).                       |
| `right-rail`    | Full-height right band (e.g. version history).                          |
| `on-canvas`     | Anchored in diagram coordinates — pans and zooms with the canvas.       |

Bands honor device safe-area insets: `header`/`footer` clear a notch or gesture
bar, and the rails sit between them so they never tuck under a full-width band.
Within one region, controls are ordered by
[`order`](#overlaycontroloptions) (lower renders toward the region's anchor edge).

## React: `<ApollonControl>`

The declarative API. Mount it anywhere inside the `<Apollon>` tree; its
`children` are portaled into the chosen region **inside the canvas** while React
keeps owning their reconciliation and context. Children changes never touch the
overlay store — only real option changes (region, inset, order, …) push an
update.

```tsx no-check
import {
  Apollon,
  ApollonControl,
  ApollonDefaultControls,
  UMLDiagramType,
} from "@tumaet/apollon"

function Editor() {
  return (
    <Apollon defaultType={UMLDiagramType.ClassDiagram}>
      <ApollonDefaultControls />
      <ApollonControl id="my-app:export" region="top-right" groupLabel="Export">
        <button type="button" onClick={exportDiagram}>
          Export
        </button>
      </ApollonControl>
    </Apollon>
  )
}
```

`ApollonControlProps` is [`OverlayControlOptions`](#overlaycontroloptions) plus
`children: ReactNode`. The component renders `null` in the host tree; the visible
output is the portaled `children`. The `id` must be stable — changing it
re-registers a fresh control. Supplying children to `<Apollon>` means you own the
composition; include `<ApollonDefaultControls />` (or the individual
`<Apollon.Palette />`, `<Apollon.Zoom />`, `<Apollon.MiniMap />`) when a custom
child should keep the default chrome visible.

## Imperative: `addControl`

When you hold an `ApollonEditor` instance and want to register a one-off widget,
call `addControl`. It takes the options plus a `render: () => ReactNode` and
**returns a disposer** — call it to remove the control.

```tsx no-check
const dispose = editor.addControl({
  id: "my-app:banner",
  region: "top-center",
  render: () => <ReadOnlyBanner />,
})

// later
dispose()
```

`render` runs inside the editor's React Flow context, so it does **not** carry
your host's React context (theme providers, router). If you need that, use the
[host-portal escape hatch](#the-host-portal-escape-hatch) instead.

Companion methods:

```ts no-check
// Patch a registered control's options or renderer (no-op if absent).
// The id is immutable — pass it first; any `id` in the patch is ignored.
editor.updateControl("my-app:banner", { region: "top-right" })

// Unregister by id (no-op if absent) — equivalent to the disposer above.
editor.removeControl("my-app:banner")

// Has this id been registered?
editor.hasControl("my-app:banner") // boolean

// Read an immutable options snapshot (undefined if absent; render is omitted).
editor.getControl("my-app:banner")?.region
```

## Built-in controls

The editor's own chrome — the element **palette**, the **minimap**, and the
**zoom / history** cluster — are ordinary records in this same registry under
reserved ids (`PALETTE_ID`, `ZOOM_ID`, `MINIMAP_ID`). You compose them the same
two ways.

Built-in renderers support these regions:

| Built-in       | Supported regions                                                                     |
| -------------- | ------------------------------------------------------------------------------------- |
| Palette        | `left-rail`, `right-rail`                                                             |
| Zoom / history | any `OverlayRegion`                                                                   |
| MiniMap        | `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right` |

Moving `PALETTE_ID` or `MINIMAP_ID` with `updateControl()` keeps those renderer
limits and throws for unsupported regions. If you replace a built-in by supplying
your own `render` at its reserved id, it becomes a normal custom control and can
use any valid region.

**React — as `<Apollon>` children.** Presence renders, omission hides, typed
props reconfigure. Passing _any_ children makes the composition explicit, so you
list exactly the chrome you want. Use `<ApollonDefaultControls />` to keep the
standard palette + zoom + minimap next to custom children; pass `null` or an empty
fragment for a bare canvas. A conditional child expression still counts as
children in React, even when it currently renders `false`; use
`<ApollonDefaultControls />` when defaults must stay visible next to conditional
custom chrome.

```tsx no-check
import { Apollon, UMLDiagramType } from "@tumaet/apollon"

function Editor() {
  return (
    <Apollon defaultType={UMLDiagramType.ClassDiagram}>
      <Apollon.Palette />
      <Apollon.Zoom region="bottom-center" history={false} />
      <Apollon.MiniMap region="bottom-right" />
      {/* minimap omitted? then it is hidden */}
    </Apollon>
  )
}
```

Replace a built-in by rendering your own control at its reserved id with
`useControl` — because its `render` runs inside React Flow, a replacement can
drive the viewport (`useReactFlow`). Supplying a new renderer at a reserved id is
an explicit replacement; after that, the control follows the normal
`OverlayRegion` rules instead of the built-in renderer's placement limits.

```tsx no-check
import { useControl, ZOOM_ID, type OverlayRegion } from "@tumaet/apollon"

function BrandedZoom({ region = "bottom-left" }: { region?: OverlayRegion }) {
  useControl(
    () => ({ id: ZOOM_ID, region, render: () => <MyZoom /> }),
    [region]
  )
  return null
}
```

**Vanilla / imperative — descriptor factories.** `paletteControl()`,
`zoomControl({ history })`, and `miniMapControl()` build the same records. Omit
`controls` for the defaults, pass `[]` for a bare canvas, or a subset to show
only those:

```tsx no-check
import {
  ApollonEditor,
  ZOOM_ID,
  paletteControl,
  zoomControl,
} from "@tumaet/apollon"

new ApollonEditor(el, {
  controls: [paletteControl(), zoomControl({ history: false })],
})

// Later, address a built-in by its reserved id:
editor.updateControl(ZOOM_ID, { region: "bottom-center" }) // move
editor.removeControl(ZOOM_ID) // hide
```

To keep every default **and** add your own, spread `defaultControls()`:

```tsx no-check
import { ApollonEditor, defaultControls } from "@tumaet/apollon"

const myBanner = () => ({
  id: "my-app:banner",
  region: "top-center",
  render: () => <ReadOnlyBanner />,
})

new ApollonEditor(el, { controls: [...defaultControls(), myBanner()] })
```

The minimap participates in the same corner-region layout as other built-ins. It
reserves no room by default, so moving unrelated chrome never resizes it, and it
never resizes the palette.

## The host-portal escape hatch

For a **non-React host**, or a React host that must render from its **own React
root** to keep its context (theme tokens, router, i18n), ask the editor for a
stable DOM node anchored in a region and render into it yourself with
`createPortal`.

```tsx no-check
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

function HostRail({ editor }) {
  const [target, setTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const node = editor.getRegionElement("right-rail")
    setTarget(node)
    return () => editor.releaseRegionElement("right-rail")
  }, [editor])

  if (!target) return null

  // Rendered from the HOST React root → keeps host theme/router/i18n context.
  // The wrapper opts interactive content back into pointer events and prevents
  // canvas pan/drag/wheel from starting underneath the rail.
  return createPortal(
    <div className="nopan nodrag nowheel" style={{ pointerEvents: "auto" }}>
      <ThemeProvider theme={hostTheme}>
        <VersionHistory />
      </ThemeProvider>
    </div>,
    target
  )
}
```

`getRegionElement` registers a host control under the reserved id
`apollon:host:<region>` with `inset: "auto"`, so the diagram makes room for
whatever you mount. The host mount is pointer-transparent by default so empty
space in a full-width header/footer or rail does not block canvas panning; set
`pointer-events: auto` on your mounted root (and use `nopan nodrag nowheel` for
interactive UI) where controls should handle input. Calling `getRegionElement`
again returns the same node without re-registering. `releaseRegionElement`
unregisters the control and drops the node, so a later acquire starts clean.

### Choosing an API style

| You have…                                                   | Use                                 |
| ----------------------------------------------------------- | ----------------------------------- |
| A React subtree inside `<Apollon>`                          | `<ApollonControl>`                  |
| An `ApollonEditor` handle and a one-off widget              | `editor.addControl(...)`            |
| A non-React host, or one needing its own React root/context | `getRegionElement` + `createPortal` |

## Reserving space (making room)

By default a control floats and reserves nothing. To make the diagram make way,
set `inset`. The reserved space is measured per region on its dominant axis
(height for top/bottom regions and `header`/`footer`; width for the rails) and
fed into `fitView` padding.

`InsetContribution`:

| Value                       | Type                                             | Effect                                                  |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| `"auto"`                    | string literal                                   | Auto-measure the control on the region's dominant axis. |
| `{ top: 48, left: "auto" }` | `Partial<Record<OverlaySide, number \| "auto">>` | Mix explicit pixels with per-side `"auto"`.             |

```tsx no-check
editor.addControl({
  id: "my-app:header",
  region: "header",
  inset: "auto", // the diagram pads its fit to clear the header's height
  render: () => <Header />,
})
```

Two controls reserving on the same side (or the same band lane) clear the
**larger**, not the total; controls in different band lanes stack and their
reservations **sum**. `fitView()` reads the combined measured inset for each
side.

`fitView` consumes those insets:

```ts no-check
editor.fitView() // respectInsets defaults to true
```

| Option          | Type                                             | Default | Effect                                                                             |
| --------------- | ------------------------------------------------ | ------- | ---------------------------------------------------------------------------------- |
| `respectInsets` | `boolean`                                        | `true`  | Pad the fit by the reserved overlay insets. Set `false` to ignore chrome.          |
| `padding`       | `number \| Partial<Record<OverlaySide, number>>` | —       | Extra padding. A per-side object overrides the default 16px gutter on those sides. |
| `duration`      | `number`                                         | `200`   | Fit animation duration in ms.                                                      |

With no reserved chrome, no device safe area and a scalar (or absent) `padding`,
`fitView` keeps the existing fraction-based padding behavior (`0.15`). Otherwise
each side is padded by `safe area + inset + gutter` (gutter defaults to 16px, or
your per-side `padding` override). The fit is capped at `maxZoom: 1.0`.

The **device safe area** — the notch, Dynamic Island, home indicator, and the
mobile soft keyboard — is always cleared, even when `respectInsets` is `false`
and even on an edge where no control reserves anything. It is a hardware
constraint rather than chrome, so neither `respectInsets` nor a per-side
`padding` override can opt out of it: `padding` replaces the gutter, not the safe
area. Chrome reservations are measured from each control's own box, which begins
_inside_ the safe area, so the two never double-count.

## `OverlayControlOptions`

The shared option set across all three API styles.

| Field         | Type                | Default | Effect                                                                                                                                                                                       |
| ------------- | ------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `string`            | —       | Stable, unique id. Re-adding the same id **replaces** (idempotent, StrictMode-safe). Required.                                                                                               |
| `region`      | `OverlayRegion`     | —       | Where the control is anchored. Required.                                                                                                                                                     |
| `inset`       | `InsetContribution` | —       | Reserve viewport room so the diagram makes way. Default: reserves nothing (the control floats).                                                                                              |
| `order`       | `number`            | `0`     | Stacking within a region; lower renders toward the region's anchor edge.                                                                                                                     |
| `lane`        | `number`            | `0`     | Band-only. Same-lane controls sit along the band's axis and reserve the larger; different lanes stack across the cross-axis and their reservations **sum**. Ignored for corners/`on-canvas`. |
| `interactive` | `boolean`           | `true`  | When `false`, the region frame stays pointer-transparent over the control too.                                                                                                               |
| `groupLabel`  | `string`            | —       | Wraps the control in a `role="group"` with this `aria-label`. No focus management is imposed.                                                                                                |
| `visible`     | `boolean`           | `true`  | Hide without unregistering. While hidden, reserves no inset.                                                                                                                                 |
| `className`   | `string`            | —       | Applied to the control's wrapper element.                                                                                                                                                    |
| `style`       | `CSSProperties`     | —       | Inline style on the control's wrapper element.                                                                                                                                               |

An interactive control opts pointer events back in over the pointer-transparent
region frame and blocks canvas pan / zoom / wheel beneath it, so dragging the
control never drags the diagram.

## Errors & gotchas

- **Unknown region throws.** `addControl` and `getRegionElement` throw
  `[ApollonEditor] <method>: unknown region: <region>` for any region not in the
  known set. Mistakes fail loudly at the API edge, not silently in the renderer.
- **Empty id throws.** `addControl` throws
  `[ApollonEditor] addControl: id must be non-empty`.
- **Ids must be unique.** Re-using an id **replaces** the existing control rather
  than adding a second one — the intended idempotent, StrictMode-safe behavior
  (React StrictMode double-invokes effects; the replace makes that a no-op).
  Namespace your ids (e.g. `"my-app:export"`) to avoid colliding with the
  editor's own controls.
- **Built-in moves keep built-in limits.** Updating `PALETTE_ID` or `MINIMAP_ID`
  without replacing `render` still validates the built-in renderer's supported
  regions. Replace the renderer to use those ids as fully custom controls.
- **`id` is immutable in `updateControl`.** Pass it as the first argument; any
  `id` inside the patch is ignored, so a stray `patch.id` can't fork the control
  under a new key.
- **`updateControl` on an absent id is a no-op** — it does not create the control.
- **Reserved host ids.** `getRegionElement` owns `apollon:host:<region>`. Do not
  register your own controls under those ids; use a host-namespaced id instead.
- **Inspection selectors.** Each control's wrapper carries `data-apollon-control="<id>"`
  and each region container `data-apollon-region="<region>"` — stable hooks for
  tests and DOM inspection (not styling targets).

## Patterns & boundaries

- **Bands reserve by default; corner regions don't.** A control in `header` /
  `footer` / `left-rail` / `right-rail` reserves its measured cross-size with no
  `inset` set; a corner region floats and reserves nothing. Only pass `inset` to
  opt a corner control into reserving room. On a band, `inset: "auto"` is redundant (it already
  measures); an explicit `inset` just sets that control's own lane contribution
  instead of measuring it — it still stacks with the other lanes.
- **Stack multiple bars on one edge two ways.** Compose them in one control (a flex
  column inside a single `<ApollonControl>`) when one owner lays out the whole
  edge; or give independently-registered controls different **`lane`** numbers when
  separate owners share the edge (e.g. an exam bar in `lane: 0` and a "problem
  statement changed" banner in `lane: 1`, or the library's own presence sitting
  above host chrome). Same-lane controls sit along the band's axis and reserve the
  larger; different lanes stack and their insets **sum**. Either way the diagram
  clears the full stack.
- **Use `footer` only for a real bottom bar.** A `footer` control owns the full
  bottom edge, so bottom-corner chrome (zoom, minimap, host buttons) clears it.
  For a floating action island that only occupies the bottom-right corner, use
  `region="bottom-right"` with `inset={{ bottom: "auto" }}` instead: the diagram
  still reserves bottom room for the island, but unrelated bottom-left chrome
  stays flush.
- **Corners clear full-width bands and same-side rails.** Top/bottom corner
  controls sit below a header and above a footer structurally. Side rails share
  the side track with the corner regions and are padded by the measured same-side
  corner extent, so short rails leave corners flush while tall rails avoid covering
  them. The built-in minimap uses the same corner regions, so it stacks with host
  controls in its region instead of applying its own side offsets.
- **i18n.** Editor UI strings exposed in `ApollonLabels` are
  host-overridable via `labels` (see [i18n](#i18n) below); pass a partial map in
  your language.
- **Resizable rails are re-measured live.** The built-in Fit button and
  `editor.fitView()` use the current rail size. If you want the viewport to
  reframe continuously while a host rail is dragged, debounce your own
  `editor.fitView()` call.
- **Keyboard-aware footer.** The `footer` band and bottom chrome ride above the
  mobile soft keyboard, so an action bar stays reachable while an input has focus.
- **Modals stay in your tree.** There is no scrim/overlay region; render dialogs,
  confirms and toasts in your own React tree (or your host modal system), not as
  controls. The controls API is for chrome anchored to the canvas edges/corners.

## Selection toolbar

`<Apollon.SelectionToolbar>` renders a screen-space, constant-size toolbar that
follows the current node selection. It reserves no canvas room and only appears
when React Flow has a selection anchor.

```tsx no-check
import { Apollon } from "@tumaet/apollon"

function SelectionActions() {
  return (
    <Apollon.SelectionToolbar ariaLabel="Selection actions" position="top">
      <button type="button">Delete</button>
    </Apollon.SelectionToolbar>
  )
}
```

It defaults to `role="group"`; pass `role="toolbar"` only when your children
implement toolbar keyboard behavior such as roving focus. Use this for actions
attached to the selected node(s). Use `on-canvas` instead for content that lives
in diagram coordinates and scales with zoom.

## i18n

The editor UI strings exposed in the typed `ApollonLabels` dictionary ship with
English defaults. Public names follow React Flow's `MiniMap` casing for the
component and factory (`<Apollon.MiniMap />`, `miniMapControl()`), while label
keys use the exact exported `ApollonLabels` names (`miniMap`, `showMinimap`,
`hideMinimap`, ...). The surface includes the built-in palette / zoom / minimap
tooltips and aria-labels, plus the edit/assessment popover copy. Override any
subset:

```tsx
import { Apollon, type ApollonLabels } from "@tumaet/apollon"

const labels = {
  zoomIn: "Vergrößern",
  zoomOut: "Verkleinern",
  showMinimap: "Übersicht anzeigen",
  zoomReadout: (percent) => `Zoom bei ${percent} %`,
} satisfies Partial<ApollonLabels>

export function LocalizedEditor() {
  return <Apollon labels={labels} />
}
```

Imperative: `new ApollonEditor(el, { labels })` or `editor.setLabels(labels)`.
Both merge over the English defaults per key (omitted keys stay English) and are
**reactive** — switching language re-renders editor-owned UI without a remount.
Use the exported `ApollonLabels` type and `DEFAULT_LABELS` object to inspect the
full key set. `useLabels()` is for controls rendered inside the editor's React
Flow tree, such as descriptor `render` callbacks or `useControl` replacements;
for `<ApollonControl>` children and `getRegionElement` portals, pass translated
strings from your host context. The few strings that interpolate a value (e.g.
the zoom readout) are functions so a translation keeps control of word order.

The library ships English only and bundles no locale files: the host owns the
translation table and any locale plumbing (which language to load, RTL direction,
number/date formatting). `labels` is the single seam — Apollon does not read the
browser locale or format numbers on the host's behalf.

## Accessibility & theming

- Setting `groupLabel` wraps the control in an element with `role="group"` and the
  given `aria-label`. Beyond that, **no focus management is imposed** — keyboard
  order and roving focus inside your control are yours to own.
- Interactive controls block canvas pan / zoom / wheel by **pointer events only**,
  never keyboard. Keyboard interaction with the diagram is unaffected by an
  overlay sitting above it.
- Controls render inside the canvas and inherit Apollon's theme variables, so
  light/dark adapt automatically when you style with the editor's CSS custom
  properties (e.g. `--apollon-background`).
