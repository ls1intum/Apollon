---
"@tumaet/apollon": minor
---

Embedding apps can now compose Apollon's built-in editor controls instead of accepting fixed chrome. Use `<Apollon.Palette />`, `<Apollon.Zoom />`, `<Apollon.MiniMap />`, or `<ApollonDefaultControls />` as `<Apollon>` children to keep, move, configure, hide, or replace the palette, zoom/history controls, and minimap.

Imperative hosts can configure the same controls with `paletteControl()`, `zoomControl()`, `miniMapControl()`, and `defaultControls()`. Omitting `controls` keeps the default chrome, passing `[]` renders a bare canvas, and `addControl` / `updateControl` / `removeControl` manage custom or built-in controls at runtime.

Localize the editor’s own tooltips, aria labels, and edit/assessment popovers through `labels`, `editor.setLabels(...)`, and `useLabels()`. Built-in and custom controls now stay clear of each other and keep diagram content visible across responsive layouts.
