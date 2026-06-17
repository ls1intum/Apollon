---
id: headless-rendering
title: Headless rendering
description: Render saved Apollon models to SVG/PNG with no browser, using jsdom + a Skia canvas. Why text-sized diagrams overlap without it, and how to fix it.
---

# Headless rendering

You have Apollon models on disk — exam submission versions, exported diagrams,
generated fixtures — and you want pictures of them without opening the editor by
hand, ideally without shipping a whole browser. This page is the supported
recipe.

## TL;DR

- `ApollonEditor.exportModelAsSvg(model, options)` needs a DOM, canvas
  `measureText`, and `getBBox`. The lightweight way to provide them is
  **jsdom + a real canvas** — no browser, no Playwright.
- jsdom has **no canvas**, so on its own `measureText` degrades to a crude
  `text.length × 8` estimate and **text-sized diagrams (class, object,
  communication, sfc) overlap**. Give jsdom a real canvas by aliasing the
  `canvas` package to [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas)
  (Skia, prebuilt binaries, no system libraries) and registering the bundled
  Inter font.
- Always `importDiagram(model)` first to normalise v2 / v3 payloads to v4.

The standalone server is the reference implementation:
[`jsdom-shims.ts`](https://github.com/ls1intum/Apollon/blob/main/standalone/server/src/workers/jsdom-shims.ts)
and
[`conversion-service.ts`](https://github.com/ls1intum/Apollon/blob/main/standalone/server/src/services/conversion-service.ts).

## Why text-sized diagrams overlap (the canvas trap)

Apollon sizes text-bearing nodes from the **measured width of their text** (a
class grows to fit its widest member). Measurement goes through canvas
`measureText`. Under bare jsdom there is no canvas, so the width is guessed as
`text.length × 8` — wrong enough that nodes grow past their saved positions and
collide. Fixed-size diagrams (activity, petri net, flowchart, …) look fine;
text-sized ones don't. Giving jsdom a real, Inter-loaded canvas fixes it.

## Recipe: model JSON → SVG with jsdom (no browser)

**1. Alias `canvas` to `@napi-rs/canvas`.** jsdom backs `HTMLCanvasElement` with
a single `require("canvas")`; point that at Skia. With pnpm, add a dependency
to the package that runs the export:

```jsonc
// package.json — pin exactly for reproducible batch runs
"dependencies": {
  "canvas": "npm:@napi-rs/canvas@1.0.0",
  "global-jsdom": "^28",
  "jsdom": "^28"
}
```

**2. Install jsdom + register Inter before importing the library.** Apollon
measures text at module load, so the font and DOM must exist first. Register the
**same Inter** the library bundles (and that resvg uses for rasterising) so the
measured metrics match the editor:

```ts
// setup.ts — imported first, before @tumaet/apollon
import { GlobalFonts } from "canvas"
import "global-jsdom/register"

GlobalFonts.registerFromPath("/path/to/Inter-Regular.ttf", "Inter")
GlobalFonts.registerFromPath("/path/to/Inter-Bold.ttf", "Inter")

// Report Chromium so @chenglou/pretext wraps text like the editor did.
Object.defineProperty(window.navigator, "userAgent", {
  configurable: true,
  value:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
})

// jsdom's getBBox is a constant 10×10 stub; read each shape's viewBox instead.
const proto = window.SVGElement.prototype as unknown as {
  getBBox: () => DOMRect
}
proto.getBBox = function () {
  const vb = (this as unknown as Element).getAttribute?.("viewBox")
  if (vb) {
    const [x, y, width, height] = vb.split(/[\s,]+/).map(Number)
    if ([x, y, width, height].every(Number.isFinite))
      return { x, y, width, height } as DOMRect
  }
  return { x: 0, y: 0, width: 0, height: 0 } as DOMRect
}
```

jsdom also lacks `ResizeObserver` / `requestAnimationFrame` — shim them too (see
the reference `jsdom-shims.ts`).

**3. Export.** Server-side rendering can't measure handle geometry, so pre-seed
each node's `width` / `height` / `measured` and edge handles before exporting
(see `normalizeModelForServerRender` in the reference `conversion-service.ts`):

```ts
import { ApollonEditor, importDiagram } from "@tumaet/apollon"

const { svg, clip } = await ApollonEditor.exportModelAsSvg(
  importDiagram(model),
  { svgMode: "compat" }
)
```

Run it in a **worker thread** so the jsdom globals stay out of your main
process. `svgMode: "compat"` resolves CSS variables and embeds Inter as a base64
`@font-face`, so the SVG renders in the right font when opened in a browser,
Inkscape, or PowerPoint.

### Fidelity for grading

`@napi-rs/canvas` is Skia (Chromium's rasterizer family), so measured widths
track the browser closely — text-sized nodes land within one 10px min-width grid
step of the browser-authored sizes across all 13 diagram types. It is **not**
bit-identical: Skia shaping differs slightly from Chromium's HarfBuzz, so an
occasional label near a grid boundary can be ~10px wider or narrower. If you
need pixel-exact parity with the editor, use the browser path below.

When the export is a forensic record of a graded submission, know these limits:

- **Edge labels** (messages, multiplicities) are kept in the clip via a
  `measureText`-based bounds fallback — jsdom's `getBoundingClientRect` is zero
  for SVG text, and without the fallback an overhanging label is silently
  cropped. Ensure that fallback (the `setup.ts` font registration above) is in
  place, or labels can be lost.
- **Text wrapping** matches the editor only if `navigator.userAgent` reports
  Chromium — `@chenglou/pretext` picks CJK break behaviour from it. Set a
  Chromium UA on the jsdom window.
- **Non-Latin / emoji / math glyphs** outside the registered Inter fall back to
  whatever faces are installed. A `node:*-slim` image ships none, so such
  glyphs render as tofu and measure inconsistently. Register covering fallback
  faces (e.g. Noto Sans + Noto Sans CJK + Noto Emoji) for submissions that may
  contain them, and pass the same files to resvg.

## SVG → PNG / PDF

The `compat` SVG is self-contained. To rasterise:

- **[`@resvg/resvg-js`](https://github.com/yisibl/resvg-js)** (fast, no browser):
  resvg does not resolve data-URI `@font-face`, so pass Inter via `fontFiles`
  and set `defaultFontFamily: "Inter"` — the same Inter you registered above, so
  measurement and rasterisation agree. The standalone webapp's
  `tests/helpers/resvgRender.ts` is a working reference. The server's PDF worker
  feeds the SVG straight to `pdfmake`.
- **Browser screenshot**: load the SVG in a page and screenshot it.

## Alternative: render in a real browser

If you need pixel-exact browser fidelity (or already run Playwright/Puppeteer),
load `@tumaet/apollon` + `@tumaet/apollon/style.css` in a page, `await
document.fonts.ready`, then call `exportModelAsSvg`. The stylesheet registers the
bundled Inter; don't drop it. This is heavier than jsdom — reach for it only when
the ~10px shaping difference above matters.

See also: **[Export](./export)** for the full `ExportOptions` table and
**[Model JSON contract](./model-contract)** for the model shape.
