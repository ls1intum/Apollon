---
"@tumaet/apollon": minor
---

Adds `@tumaet/apollon/export` — `svgToPng` and `svgToPdf` — for reliable in-browser PNG and vector-PDF export of an exported diagram SVG. The previous client approach rasterised through a `<canvas>`, which silently produced an empty PNG and a blurry, size-capped PDF once a diagram grew past the browser's canvas-area limit; these render off-canvas, so large diagrams export cleanly. `svgToPng` downscales a very large diagram to a pixel budget (reporting the applied scale) and throws `RasterTooLargeError` when it can't fit. Abstract-class names export upright, since the bundled Inter ships without an italic face.
