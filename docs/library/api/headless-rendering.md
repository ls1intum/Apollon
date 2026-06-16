---
id: headless-rendering
title: Headless rendering
description: Render saved Apollon models to SVG/PNG in a real browser with Playwright — and why mismatched fonts cause overlapping elements.
---

# Headless rendering

You have Apollon models on disk — exam submission versions, exported diagrams,
generated fixtures — and you want pictures of them without opening the editor by
hand. This page is the supported recipe.

## TL;DR

- `ApollonEditor.exportModelAsSvg(model, options)` renders a model to SVG, but
  it needs a **real browser DOM** (it measures text with canvas `measureText`
  and `getBBox`). Run it under **Playwright or Puppeteer**, not jsdom.
- Load the library **stylesheet** (`@tumaet/apollon/style.css`) in the page and
  `await document.fonts.ready` before exporting. This is the single most common
  mistake — skip it and elements **overlap** (see below).
- Always `importDiagram(model)` first to normalise v2 / v3 payloads to v4.

## Why elements overlap (the font trap)

Apollon sizes text-bearing nodes (classes, objects, …) from the **measured
width of their text**. The measurement uses the font named first in the diagram
font stack: `Inter`. The library now **self-hosts Inter** (bundled into
`style.css`), so as long as that stylesheet is loaded, every renderer — the
editor, headless export, the server, your Playwright job — measures against the
exact same glyphs and a diagram lays out identically everywhere.

If you render in a browser where Inter is **not** available (you forgot the
stylesheet, or you measured before `document.fonts.ready` resolved), the stack
falls through to `system-ui`. A headless Linux Chromium resolves `system-ui` to
a font with **different metrics** than the desktop machine the diagram was
authored on, so nodes grow or shrink relative to their saved positions — and
overlap. That is exactly the symptom of a headless export that "looks nothing
like the website".

> **Use a version that bundles Inter.** Self-hosted Inter ships in
> `@tumaet/apollon` ≥ 4.7.0. On older versions you must inject the Inter font
> into the page yourself before exporting.

## Recipe: model JSON → SVG with Playwright

This runs the library's own export inside a headless Chromium page and reads the
SVG string back out. It mirrors the "vanilla embed" approach, with the two fixes
that matter: **load the stylesheet** and **await the fonts**.

```ts
// render.ts — run with: npx tsx render.ts model.json out.svg
import { chromium } from "playwright"
import { readFileSync, writeFileSync } from "node:fs"

const VERSION = "4.7.0" // pin a version that bundles Inter

const model = JSON.parse(readFileSync(process.argv[2], "utf8"))

const browser = await chromium.launch()
const page = await browser.newPage()

// A blank page that loads Apollon + its stylesheet from a CDN. The stylesheet
// is what registers the bundled Inter @font-face.
await page.setContent(
  `<!doctype html><html><head>
     <link rel="stylesheet" href="https://esm.sh/@tumaet/apollon@${VERSION}/style.css">
   </head><body></body></html>`,
  { waitUntil: "load" }
)

const svg = await page.evaluate(
  async ({ model, version }) => {
    const { ApollonEditor, importDiagram } = await import(
      `https://esm.sh/@tumaet/apollon@${version}`
    )
    // Wait for the bundled Inter to finish loading before we measure text.
    await document.fonts.ready
    const { svg } = await ApollonEditor.exportModelAsSvg(importDiagram(model), {
      svgMode: "compat",
    })
    return svg
  },
  { model, version: VERSION }
)

writeFileSync(process.argv[3], svg)
await browser.close()
```

`svgMode: "compat"` additionally embeds Inter into the SVG as a base64
`@font-face`, so the file renders in the right font even when opened later in a
browser, Inkscape, or PowerPoint — no font install required.

## SVG → PNG / PDF

The SVG above is self-contained. To rasterise:

- **Browser screenshot** (most faithful — resolves the embedded `@font-face`):
  load the SVG in a Playwright page and `element.screenshot()`, or set it as an
  `<img>` and screenshot that.
- **[`@resvg/resvg-js`](https://github.com/yisibl/resvg-js)** (fast, no
  browser): resvg does not resolve data-URI `@font-face`, so pass Inter
  explicitly via `fontFiles` / `fontBuffers` and set `defaultFontFamily:
"Inter"`. Use the same Inter you render the editor with for pixel-identical
  output. The standalone webapp's `tests/helpers/resvgRender.ts` is a working
  reference.

## Bundler / offline variant

If you bundle the library yourself instead of using a CDN, the only change is
the import: ship a small page that does
`import { ApollonEditor, importDiagram } from "@tumaet/apollon"` and
`import "@tumaet/apollon/style.css"`, then run the same
`await document.fonts.ready` → `exportModelAsSvg` flow inside Playwright. The
stylesheet import is what registers Inter — don't drop it.

## Don't use jsdom for this

`exportModelAsSvg` relies on canvas `measureText` and SVG `getBBox`. jsdom
implements neither faithfully (text measurement degrades to a crude
characters-times-constant estimate), so node sizes come out wrong and elements
overlap. Use a real browser. The standalone **server** renders under jsdom only
because it **pre-seeds** every element's dimensions before rendering — a
different pipeline that is not exposed as a public API.

See also: **[Export](./export)** for the full `ExportOptions` table and the
JSON round-trip.
