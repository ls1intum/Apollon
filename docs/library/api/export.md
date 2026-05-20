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

| `svgMode` | Use when |
|---|---|
| `"web"` | Rendering in a browser; assumes the DOM stylesheet is loaded |
| `"compat"` | Inlining into PDF/PPT/other static formats — emits fully self-contained SVG with inlined fonts and computed styles |

## Headless SVG export (no mounted editor)

```ts
import { ApollonEditor, importDiagram } from "@tumaet/apollon"

const svgExport = await ApollonEditor.exportModelAsSvg(
  importDiagram(model),
  { svgMode: "compat" }
)
```

This is the same pipeline the standalone server uses to produce server-side PDF / preview thumbnails.

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
