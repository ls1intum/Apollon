---
"@tumaet/apollon": minor
---

Add a `@tumaet/apollon/export` entry point with `svgToPng` (resvg via wasm) and `svgToPdf` (svg2pdf.js + jsPDF) for reliable browser raster/vector export of a compat-mode Apollon SVG. This fixes the canvas-area-cap silent failure (#667), where complex diagrams produced a 0-byte PNG and a blurry, canvas-bound PDF.

`svgToPng` renders into wasm memory instead of a `<canvas>`, so the browser's per-platform canvas-area limit (~16 MP on iOS/WebKit) no longer applies; the render area is clamped to a configurable 75 MP budget and over-budget diagrams report `clamped`. `svgToPdf` emits true vector PDF and registers the bundled Inter (Regular + Bold) with jsPDF so no text is silently dropped. An over-budget PNG throws a typed `RasterTooLargeError` so callers can show an actionable message.

`@resvg/resvg-wasm`, `jspdf` and `svg2pdf.js` are optional dependencies, loaded lazily, so importing the editor never pulls them in — the editor bundles are unchanged. The renderers are kept external to the published chunk; the lazy `/export` chunk inlines the Inter ttf (~660 KB raw, ~297 KB gzipped) and only downloads when an export runs. The resvg wasm binary is supplied by the host via `svgToPng`'s `wasmInput` option (it is not portably exported by `@resvg/resvg-wasm`).
