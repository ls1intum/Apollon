---
"@tumaet/server": minor
---

Render saved models to SVG and PNG over HTTP, not just PDF.

`POST /api/converter/svg` and `POST /api/converter/png` join the existing `/api/converter/pdf`, so a model can be converted to any of the three formats in a single request. PNG accepts a `scale` parameter (query or body, `1`–`4`, default `2`), renders sharply at that resolution, and is flattened onto a white background so it isn't transparent. All three formats share one render worker and queue.

All outputs centre text like the editor: Apollon positions node labels with `dominant-baseline`, which browsers honour but most non-browser viewers (macOS Preview, Inkscape, PowerPoint, the PNG rasterizer) ignore — so every format resolves it to an explicit baseline, and the PNG additionally stem-darkens to match the on-screen weight. See the new [Conversion API](https://ls1intum.github.io/Apollon/library/api/conversion-api) reference.
