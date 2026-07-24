---
"@tumaet/apollon": patch
---

Fix custom-colored elements vanishing from exports. Picking a swatch line/fill/text colour stored it as a bare `var(--apollon-swatch-*)` with no fallback, and the compat export pipeline (SVG, PNG, PDF, PPTX, server, VS Code) had no static value for those tokens, so it resolved them to an empty string — the coloured stroke/fill disappeared and only the default-black text survived. The swatch palette now has export fallbacks, so custom-coloured elements render in every format and diagram type (using the light-theme swatch value, matching the rest of the export pipeline). A test keeps the fallbacks in lockstep with the palette so retuning a swatch can't silently drift the exported colour.
