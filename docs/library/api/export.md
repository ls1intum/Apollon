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

`exportModelAsSvg` mounts the editor off-screen and serialises the rendered
SVG, so it needs a **real browser DOM** (not jsdom). To render saved models in
a batch — e.g. reviewing diagram submission versions — use the Playwright recipe
and the font pitfall in **[Headless rendering](./headless-rendering)**.

:::tip Always normalise first
Pass models through `importDiagram(...)` before exporting. It upgrades v2 / v3
payloads to the current v4 shape; feeding a stale shape straight in is a common
cause of garbled output.
:::

> The standalone **server's** PDF / thumbnail worker is a _different_ pipeline:
> it renders under jsdom and pre-seeds element dimensions instead of measuring
> them live. Don't copy it for browser-based headless export — use the
> Playwright recipe above.

## PNG / PDF

PNG and PDF generation downstream of `exportAsSVG`. See the standalone webapp's export helpers (`useExportAsPNG`, `useExportAsPDF`) and the server's `pdf-conversion-worker-thread.ts` for two reference implementations — both consume the SVG produced above and pipe it through `@resvg/resvg-js` (PNG) or `pdfmake` (PDF).

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
