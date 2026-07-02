---
"@tumaet/webapp": minor
---

Configure the embedded editor's theme live from the playground. A new theme panel exposes the public `--apollon-*` tokens in tiers — Essentials first (brand, background, foreground, radius, grid), then Advanced surfaces/shape/chrome, then feature-specific groups (assessment, collaboration, highlight, color-picker) that each carry a "Show me in the editor" button so their effect is actually visible. Colors get a swatch + value field, lengths get sliders, and there's a light/dark switch, per-control reset, and a copy-as-embed `createApollonTheme` snippet that emits `dataTheme="dark"` when dark is active. Controls show the value the editor actually resolves in the current theme (not a hardcoded light default).
