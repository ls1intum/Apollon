---
id: overlay-controls
title: Overlay controls
description: Floating canvas chrome in named regions — React, imperative, and host-portal facades, with an inset "make room" model.
---

# Overlay controls

Apollon renders an editor's chrome — toolbars, palettes, rails, banners — as
**floating controls anchored in named regions** of the canvas, not as separate
bars stacked around it. Host chrome and the editor's own overlays share one
collision-free layer, so they never overlap and the diagram knows how to make
room for them.

A control is positioned by **region** (where it sits) and can optionally
**reserve space** so the diagram "makes way" for it. Reservation is measured, not
guessed: a control that opts into an inset is measured by a shared
`ResizeObserver`, and the reserved space feeds `fitView` padding the way MapLibre
pads its viewport around UI. Reservation is per-side **max**, not sum — two
controls on the same side reserve the larger, not the total.

There are three facades over the same engine. Pick by how your host renders:

- a **React host** inside the editor tree → [`<ApollonControl>`](#the-react-way-apolloncontrol)
- a **one-off imperative widget** → [`editor.addControl(...)`](#the-imperative-way-addcontrol)
- a **non-React host**, or one needing its **own React root / context** (theme, router) → [`getRegionElement` + `createPortal`](#the-host-portal-escape-hatch)

## Regions

Every control names one `OverlayRegion`. The six corner regions are screen-space
React Flow panels; `header` / `left-rail` / `right-rail` are library-owned bands;
`on-canvas` is viewport-transformed and pans + zooms with the diagram.

| Region          | Where it sits                                                           |
| --------------- | ----------------------------------------------------------------------- |
| `top-left`      | Top-left corner, screen-space.                                          |
| `top-center`    | Top edge, centered, screen-space.                                       |
| `top-right`     | Top-right corner, screen-space (e.g. the collaboration presence bar).   |
| `bottom-left`   | Bottom-left corner, screen-space.                                       |
| `bottom-center` | Bottom edge, centered, screen-space.                                    |
| `bottom-right`  | Bottom-right corner, screen-space.                                      |
| `header`        | Full-width band pinned to the container top, above the `top-*` regions. |
| `left-rail`     | Full-height left band (e.g. the element palette).                       |
| `right-rail`    | Full-height right band (e.g. version history).                          |
| `on-canvas`     | Anchored in diagram coordinates — pans and zooms with the canvas.       |

Bands honor device safe-area insets: the `header` clears a notch, and the rails
sit between the header and any bottom chrome so they never tuck under a
full-width header band. Within one region, controls are ordered by
[`order`](#overlaycontroloptions) (lower renders toward the region's anchor edge).

## The React way: `<ApollonControl>`

The declarative facade. Mount it anywhere inside the `<Apollon>` tree; its
`children` are portaled into the chosen region **inside the canvas** while React
keeps owning their reconciliation and context. Children changes never touch the
overlay store — only real option changes (region, inset, order, …) push an
update.

```tsx
import { Apollon, ApollonControl, UMLDiagramType } from "@tumaet/apollon"

function Editor() {
  return (
    <Apollon defaultType={UMLDiagramType.ClassDiagram}>
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
re-registers a fresh control.

## The imperative way: `addControl`

When you hold an `ApollonEditor` instance and want to register a one-off widget,
call `addControl`. It takes the options plus a `render: () => ReactNode` and
**returns a disposer** — call it to remove the control.

```ts
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

```ts
// Patch a registered control's options or renderer (no-op if absent).
// The id is immutable — pass it first; any `id` in the patch is ignored.
editor.updateControl("my-app:banner", { region: "top-right" })

// Has this id been registered?
editor.hasControl("my-app:banner") // boolean
```

## The host-portal escape hatch

For a **non-React host**, or a React host that must render from its **own React
root** to keep its context (theme tokens, router, i18n), ask the editor for a
stable DOM node anchored in a region and render into it yourself with
`createPortal`.

```tsx
import { createPortal } from "react-dom"

// A stable node whose lifetime is the editor instance, not your subtree.
const target = editor.getRegionElement("right-rail")

function HostRail() {
  // Rendered from the HOST React root → keeps host theme/router context.
  return createPortal(
    <ThemeProvider theme={hostTheme}>
      <VersionHistory />
    </ThemeProvider>,
    target
  )
}

// When done with the rail:
editor.releaseRegionElement("right-rail")
```

`getRegionElement` registers a host control under the reserved id
`apollon:host:<region>` with `inset: "auto"`, so the diagram makes room for
whatever you mount. It is idempotent per region: calling it again returns the
same node without re-registering (so it never clobbers host-applied options).
`releaseRegionElement` unregisters that control and drops the node, so a later
re-acquire starts clean.

### Choosing a facade

| You have…                                                   | Use                                 |
| ----------------------------------------------------------- | ----------------------------------- |
| A React subtree inside `<Apollon>`                          | `<ApollonControl>`                  |
| An `ApollonEditor` handle and a one-off widget              | `editor.addControl(...)`            |
| A non-React host, or one needing its own React root/context | `getRegionElement` + `createPortal` |

## Reserving space (making room)

By default a control floats and reserves nothing. To make the diagram make way,
set `inset`. The reserved space is measured per region on its dominant axis
(height for top/bottom regions and `header`; width for the rails) and fed into
`fitView` padding.

`InsetContribution`:

| Value                       | Type                                             | Effect                                                  |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| `"auto"`                    | string literal                                   | Auto-measure the control on the region's dominant axis. |
| `{ top: 48, left: "auto" }` | `Partial<Record<OverlaySide, number \| "auto">>` | Mix explicit pixels with per-side `"auto"`.             |

```ts
editor.addControl({
  id: "my-app:header",
  region: "header",
  inset: "auto", // the diagram pads its fit to clear the header's height
  render: () => <Header />,
})
```

Reservation is **per-side max, not sum**: if two controls reserve on the same
side, the diagram clears the larger, not the total. The store derives a single
content-inset rect from all measurements and is the only inset authority.

`fitView` consumes those insets:

```ts
editor.fitView() // respectInsets defaults to true
```

| Option          | Type                                             | Default | Effect                                                                             |
| --------------- | ------------------------------------------------ | ------- | ---------------------------------------------------------------------------------- |
| `respectInsets` | `boolean`                                        | `true`  | Pad the fit by the reserved overlay insets. Set `false` to ignore chrome.          |
| `padding`       | `number \| Partial<Record<OverlaySide, number>>` | —       | Extra padding. A per-side object overrides the default 16px gutter on those sides. |
| `duration`      | `number`                                         | `200`   | Fit animation duration in ms.                                                      |

With no reserved chrome and a scalar (or absent) `padding`, `fitView` uses the
original fraction-based fit (`0.15`), so embedders without overlays stay
byte-identical. When insets exist, each side is padded by `inset + gutter` (gutter
defaults to 16px, or your per-side `padding` override). The fit is capped at
`maxZoom: 1.0`.

## `OverlayControlOptions`

The shared option set across all three facades.

| Field         | Type                | Default | Effect                                                                                          |
| ------------- | ------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `id`          | `string`            | —       | Stable, unique id. Re-adding the same id **replaces** (idempotent, StrictMode-safe). Required.  |
| `region`      | `OverlayRegion`     | —       | Where the control is anchored. Required.                                                        |
| `inset`       | `InsetContribution` | —       | Reserve viewport room so the diagram makes way. Default: reserves nothing (the control floats). |
| `order`       | `number`            | `0`     | Stacking within a region; lower renders toward the region's anchor edge.                        |
| `interactive` | `boolean`           | `true`  | When `false`, the region frame stays pointer-transparent over the control too.                  |
| `groupLabel`  | `string`            | —       | Wraps the control in a `role="group"` with this `aria-label`. No focus management is imposed.   |
| `visible`     | `boolean`           | `true`  | Hide without unregistering. While hidden, reserves no inset.                                    |
| `className`   | `string`            | —       | Applied to the control's wrapper element.                                                       |
| `style`       | `CSSProperties`     | —       | Inline style on the control's wrapper element.                                                  |

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
- **`id` is immutable in `updateControl`.** Pass it as the first argument; any
  `id` inside the patch is ignored, so a stray `patch.id` can't fork the control
  under a new key.
- **`updateControl` on an absent id is a no-op** — it does not create the control.
- **Reserved host ids.** `getRegionElement` owns `apollon:host:<region>`. Do not
  register your own controls under those ids; use a host-namespaced id instead.
- **Inspection selectors.** Each control's wrapper carries `data-apollon-control="<id>"`
  and each region container `data-apollon-region="<region>"` — stable hooks for
  tests and DOM inspection (not styling targets).

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
