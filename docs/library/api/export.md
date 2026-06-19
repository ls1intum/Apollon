---
id: export
title: Export
description: SVG, PNG, PDF, and JSON export from a mounted editor or a headless model.
---

# Export

## SVG

```ts
const { svg, clip } = await editor.exportAsSVG({ svgMode: "web" })
```

- `svg: string` — serialised SVG markup
- `clip: { x, y, width, height }` — viewport of the rendered diagram

`ExportOptions`:

| Field              | Type                                                 | Default | Effect                                                                                                                              |
| ------------------ | ---------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `svgMode`          | `"web" \| "compat"`                                  | `"web"` | `"web"` keeps CSS variables for theme-adaptive rendering; `"compat"` resolves them and inlines fonts/attributes (PDF/PPT/Inkscape). |
| `margin`           | `number \| { top?, right?, bottom?, left?: number }` | `0`     | Extra space around the diagram bounding box.                                                                                        |
| `keepOriginalSize` | `boolean`                                            | `false` | If `true`, do not normalise the viewBox to the diagram bounds — preserve the editor's current pan/zoom framing.                     |
| `include`          | `string[]`                                           | —       | Render only the listed element ids. Mutually exclusive with `exclude`.                                                              |
| `exclude`          | `string[]`                                           | —       | Render everything except the listed element ids.                                                                                    |

## Headless SVG export (no mounted editor)

```ts
import { ApollonEditor, importDiagram } from "@tumaet/apollon"

const svgExport = await ApollonEditor.exportModelAsSvg(importDiagram(model), {
  svgMode: "compat",
})
```

`exportModelAsSvg` mounts the editor off-screen and serialises the rendered SVG,
so it needs a DOM plus canvas `measureText` and `getBBox`. To render saved models
in a batch — e.g. reviewing diagram submission versions — without a browser, use
the **jsdom + canvas** recipe in **[Headless rendering](./headless-rendering)**
(a browser is the heavier, pixel-exact alternative).

In a real browser the export is self-contained: it injects the layout CSS and
Inter font it needs, so you do **not** import `@tumaet/apollon/style.css` just to
export. (`style.css` is still required to mount the interactive
**[editor](../embedding/install)**.)

:::tip Always normalise first
Pass models through `importDiagram(...)` before exporting. It upgrades v2 / v3
payloads to the current v4 shape; feeding a stale shape straight in is a common
cause of garbled output.
:::

> The standalone **server's** conversion worker is the reference jsdom setup: it
> registers Inter on a Skia canvas, shims `getBBox`, and pre-seeds handle
> geometry. See **[Headless rendering](./headless-rendering)**.

## PNG / PDF

For browsers and embedders, import the ready-made helpers from
`@tumaet/apollon/export`. They consume the compat-mode SVG produced above and
fix the canvas-area cap (#667) — `svgToPng` rasterises in wasm memory instead of
a `<canvas>`, and `svgToPdf` emits true vector PDF.

```ts
import { svgToPng, svgToPdf } from "@tumaet/apollon/export"
// resvg's wasm binary isn't portably exported, so the host bundler supplies it.
import resvgWasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url" // Vite

const { svg, clip } = await editor.exportAsSVG({ svgMode: "compat" })

const { blob, clamped } = await svgToPng(svg, clip, {
  scale: 1.5,
  background: "#ffffff", // or null for transparent
  wasmInput: fetch(resvgWasmUrl),
})
const pdfBlob = await svgToPdf(svg, clip, { title: "diagram" })
```

`@resvg/resvg-wasm`, `jspdf` and `svg2pdf.js` are optional dependencies the
consumer installs; they load lazily, so importing the editor never pulls them
in. Over-budget diagrams come back with `clamped: true` and a reduced
`appliedScale`; an over-budget PNG throws `RasterTooLargeError`.
Inter ships Regular + Bold only, so italics render upright — matching the server.

> Server-side instead? The standalone server renders SVG, PNG, and PDF over
> HTTP via a Skia canvas + `pdfmake` — see the **[Conversion API](./conversion-api)**.

## JSON

```ts
const model = editor.model // UMLModel
const json = JSON.stringify(model)
```

Round-trip safe: `editor.model = JSON.parse(json)`.

## Wire-format versions

The library reads v2, v3, and v4 model JSON. Use `importDiagram(any)` to
normalise any version to the current v4 shape before assigning to `editor.model`
or passing to `exportModelAsSvg`.

```ts
import { importDiagram } from "@tumaet/apollon"

editor.model = importDiagram(maybeV2OrV3Json)
```

The v4 shape is published as a versioned JSON Schema — see the
**[Model JSON contract](./model-contract)** for the schema, the field-by-field
shape, and the versioning policy.
