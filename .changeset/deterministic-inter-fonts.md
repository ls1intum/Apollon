---
"@tumaet/apollon": minor
---

Headless and exported diagrams now render correctly and identically to the editor.

- **Bundled Inter font.** The editor sizes diagram text by measuring it, but the library never shipped the Inter font it measures with — so it fell back to the host's `system-ui`, whose metrics differ between operating systems. That mismatch grew nodes past their saved positions and made exported diagrams overlap. Inter (Latin, Greek, Cyrillic, Vietnamese) now ships with the library, inlined into `style.css` (~+170 KB gzipped), pinning text geometry across the editor, exports, and external SVG renderers.
- **Self-contained SVG export.** `ApollonEditor.exportModelAsSvg` now works in a headless browser without importing `@tumaet/apollon/style.css` — it brings the styling and font it needs. This fixes edges that could be drawn through node boxes and stops overhanging edge labels from being cropped. `compat`-mode exports embed the font so they open correctly in browsers, Inkscape, and PowerPoint.
- **Published model JSON Schema (#748).** The diagram model is now a stable, versioned, documented contract, shipped at `@tumaet/apollon/schema`.
- The font stack is exported as `FONT_FAMILY` for hosts that re-render or post-process diagram text.

See the new [Headless rendering](https://ls1intum.github.io/Apollon/library/api/headless-rendering) guide and the [Model JSON contract](https://ls1intum.github.io/Apollon/library/api/model-contract).
