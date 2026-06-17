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

> The standalone **server's** PDF worker is the reference jsdom setup: it
> registers Inter on a Skia canvas, shims `getBBox`, and pre-seeds handle
> geometry. See **[Headless rendering](./headless-rendering)**.

## PNG / PDF

PNG and PDF generation happens downstream of `exportAsSVG`. See the standalone webapp's export helpers (`useExportAsPNG`, `useExportAsPDF`) and the server's `conversion-worker-thread.ts` for two reference implementations — both consume the SVG produced above and pipe it through `@resvg/resvg-js` (PNG) or `pdfmake` (PDF).

> Don't want to build this yourself? The standalone server already exposes SVG,
> PNG, and PDF over HTTP — see the **[Conversion API](./conversion-api)**.

## JSON

```ts
const model = editor.model // UMLModel
const json = JSON.stringify(model)
```

Round-trip safe: `editor.model = JSON.parse(json)`.

## Wire-format versions

The library reads v2, v3, and v4 model JSON. Use `importDiagram(any)` to normalize any version to the current v4 shape before assigning to `editor.model` or passing to `exportModelAsSvg`.

```ts
import { importDiagram } from "@tumaet/apollon"

editor.model = importDiagram(maybeV2OrV3Json)
```

The v4 shape is published as a versioned JSON Schema — see the
**[Model JSON contract](./model-contract)** for the schema, the field-by-field
shape, and the versioning policy.
