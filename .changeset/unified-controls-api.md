---
"@tumaet/apollon": minor
---

Make the editor's built-in controls first-class and configurable. The element palette, minimap, and zoom/history cluster now route through the same overlay engine as host controls, so a single `controls` option can hide, move, re-configure, or replace each — identical across the imperative editor and the React component:

```ts
new ApollonEditor(el, {
  controls: {
    minimap: false, // hide
    zoom: { region: "bottom-center" }, // move / re-order / re-style
    palette: { render: () => myPalette() }, // replace
  },
})
// or reactively: <Apollon controls={…}/>, editor.setControls(…) / setControl(key, …)
```

This also fixes a phantom gap above the palette: with no top chrome registered, the palette no longer reserves ~64px for a header that isn't there (the overlay store is now the single inset authority, seeded synchronously so there's no first-paint slide either). The zoom cluster follows the WAI-ARIA APG toolbar pattern (single tab stop, arrow-key roving), and the palette/minimap expose accessible names.
