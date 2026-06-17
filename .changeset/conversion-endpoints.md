---
"@tumaet/server": minor
---

Render saved models to SVG and PNG over HTTP, not just PDF.

`POST /api/converter/svg` and `POST /api/converter/png` join the existing `/api/converter/pdf`, so a model can be converted to any of the three formats in a single request. PNG accepts a `scale` parameter (query or body, `1`–`4`, default `2`), renders sharply at that resolution, and is flattened onto a white background so it isn't transparent. All three share one render worker and queue and inherit the portable `compat` SVG (text centres like the editor everywhere) from `@tumaet/apollon`. SVG and PDF are served verbatim; only the PNG raster is touched — sized to the target resolution and given a hairline stem-darkening stroke so it doesn't read thinner than the vector outputs (Skia lays down less ink than a browser). See the new [Conversion API](https://ls1intum.github.io/Apollon/library/api/conversion-api) reference.
