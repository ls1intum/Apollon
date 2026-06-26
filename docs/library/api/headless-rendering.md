---
id: headless-rendering
title: Headless rendering
description: Render saved Apollon models to SVG/PNG headlessly — with jsdom + a Skia canvas (no browser) or in a real browser. Setup, fidelity caveats, and the supported recipes.
---

# Headless rendering

You have Apollon models on disk — exam submission versions, exported diagrams,
generated fixtures — and you want pictures of them without opening the editor by
hand. This is **headless rendering**: a distinct use case from
[embedding the editor](../embedding/install) in an app. You do not mount the
interactive editor or import a UI; you call one function,
`ApollonEditor.exportModelAsSvg(model, options)`, and get an SVG back.

`exportModelAsSvg` still needs a **DOM** (it mounts the editor off-screen to lay
the diagram out, then serialises it), plus canvas `measureText` and `getBBox`.
So "headless" means "no visible editor / no manual interaction" — not "no DOM".
You provide the DOM one of two ways.

## Which path do I need?

|                  | **jsdom + Skia canvas**               | **Real browser (Playwright/Puppeteer)**                         |
| ---------------- | ------------------------------------- | --------------------------------------------------------------- |
| Ships a browser? | No (Node only)                        | Yes                                                             |
| Best for         | batch jobs, servers, CI               | pixel-exact parity with the editor                              |
| DOM              | jsdom + `@napi-rs/canvas`             | the browser's own                                               |
| Fonts / CSS      | you register Inter + pre-seed handles | **self-contained — nothing to import**                          |
| Fidelity         | within ~10px of the editor            | identical to the editor                                         |
| Reference        | the standalone server (below)         | [recipe below](#render-in-a-real-browser-playwright--puppeteer) |

If you already run Playwright/Puppeteer, the browser path is the least code: the
export injects the layout CSS and the Inter font it needs itself, so **you do
not import `style.css` or wait on fonts** — see
[below](#render-in-a-real-browser-playwright--puppeteer). The jsdom path avoids
shipping a browser but needs the setup in the next sections.

## TL;DR (jsdom path)

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

- **Edge labels** (messages, multiplicities) are kept in the clip by a
  `measureText`-based bounds fallback — jsdom's `getBoundingClientRect` is zero
  for SVG text, so the fallback needs the registered canvas the `setup.ts` step
  above provides.
- **Text wrapping** matches the editor only if `navigator.userAgent` reports
  Chromium — `@chenglou/pretext` picks CJK break behaviour from it. Set a
  Chromium UA on the jsdom window.
- **Non-Latin / emoji / math glyphs** outside the registered Inter fall back to
  whatever faces are installed. A `node:*-slim` image ships none, so such
  glyphs render as tofu and measure inconsistently. Register covering fallback
  faces (e.g. Noto Sans + Noto Sans CJK + Noto Emoji) for submissions that may
  contain them, and pass the same files to resvg.

## SVG → PNG / PDF

> Don't want to wire this up yourself? The standalone server already does — POST
> a model to the **[Conversion API](./conversion-api)** and get SVG, PNG, or PDF
> back over HTTP.

The `compat` SVG is self-contained. To rasterise:

- **[`@resvg/resvg-js`](https://github.com/yisibl/resvg-js)** (fast, no browser):
  resvg does not resolve data-URI `@font-face`, so pass Inter via `fontFiles`
  and set `defaultFontFamily: "Inter"` — the same Inter you registered above, so
  measurement and rasterisation agree. The standalone webapp's
  `tests/helpers/resvgRender.ts` is a working reference. The server's conversion
  worker feeds the SVG straight to `pdfmake`.
- **Browser screenshot**: load the SVG in a page and screenshot it.

## Render in a real browser (Playwright / Puppeteer)

When you want pixel-exact parity with the editor — or you already drive a
browser — this is the simplest path. The export is **self-contained**:
`exportModelAsSvg` injects the layout CSS and the bundled Inter `@font-face` it
needs into its off-screen mount and waits for the font before measuring. You do
**not** import `@tumaet/apollon/style.css`, pre-seed handles, or
`await document.fonts.ready` yourself.

```js
import { chromium } from "playwright"

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

await page.setContent(`
<!DOCTYPE html>
<html><body>
  <script type="module">
    import { ApollonEditor, importDiagram } from "https://esm.sh/@tumaet/apollon@4.9.0";
    window.exportSVG = async (model) => {
      const result = await ApollonEditor.exportModelAsSvg(importDiagram(model), {
        svgMode: "compat",
        keepOriginalSize: true,
      });
      return typeof result === "string" ? result : result.svg;
    };
  </script>
</body></html>
`)

const model = JSON.parse(fs.readFileSync("your-model.json", "utf8"))
const svg = await page.evaluate((m) => window.exportSVG(m), model)
```

`importDiagram` normalises v2 / v3 payloads to v4. `svgMode: "compat"` resolves
CSS variables and embeds Inter so the file renders correctly when opened away
from the page (browser, Inkscape, PowerPoint).

See also: **[Export](./export)** for the full `ExportOptions` table and
**[Model JSON contract](./model-contract)** for the model shape.
