---
"@tumaet/server": minor
---

Render saved models to SVG and PNG over HTTP, not just PDF.

`POST /api/converter/svg` and `POST /api/converter/png` join the existing `/api/converter/pdf`, so a model can be converted to any of the three formats with a single request. PNG accepts a `scale` parameter (query or body, `1`–`4`, default `2`). All three formats run through one render worker and shared queue. See the new [Conversion API](https://ls1intum.github.io/Apollon/library/api/conversion-api) reference.
