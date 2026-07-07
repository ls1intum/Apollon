---
"@tumaet/apollon": minor
---

Make the editor's built-in controls composition-first. The element palette, minimap, and zoom/history cluster are now first-class records in one overlay registry — the same one host controls use — addressed two ways that compile to identical records.

**React — compose them as `<Apollon>` children.** Presence renders, omission hides, typed props reconfigure; replace one by rendering your own control at its reserved id:

```tsx
<Apollon defaultModel={model}>
  <Apollon.Palette />
  <Apollon.Zoom region="bottom-center" history={false} />
  <Apollon.MiniMap region="bottom-right" />
  {/* minimap omitted? then it's hidden */}
</Apollon>
```

Composing children opts out of the defaults (omit children for the palette + zoom + minimap), so an empty composition is a bare canvas. `useControl(makeDescriptor, deps)` is the underlying primitive (react-map-gl shape) for custom controls and replacements — its `render` runs inside React Flow, so a replacement can drive the viewport.

**Vanilla / imperative — descriptor factories.** `paletteControl()`, `zoomControl({ history })`, `miniMapControl()` build the same records:

```ts
new ApollonEditor(el, { controls: [zoomControl({ history: false })] })
// omit `controls` for the defaults · `[]` for a bare canvas · a subset to show only those
editor.addControl(descriptor) // show · updateControl(id, patch) — move · removeControl(id) — hide
```

This replaces the previous `controls` config object and the `setControls` / `setControl` / `getControlConfig` methods. The minimap is registered honestly under its reserved id and participates in the same corner-slot layout as other built-ins rather than rendering behind a dead id.

It also fixes the two layout symptoms behind the redesign: the palette no longer changes size when an unrelated control moves (a two-tier engine now distinguishes bands, which reserve an edge, from floating slots, which reserve nothing), and controls no longer overlap.

**Regions, bands, and immersion.** Building on that engine:

- **`footer` region.** A full-width band pinned to the canvas bottom, symmetric to `header`. Registered chrome there reserves bottom room (the diagram, rails, and bottom-corner controls stay clear above it) and honours the device safe-area/gesture-bar inset — the natural home for truly docked host bars. Floating action islands can live in a bottom corner with an explicit bottom inset so they reserve camera room without lifting unrelated corner chrome.
- **Lane-stacking on bands.** Controls in a band take an optional `lane`: same-lane controls sit along the band's axis and reserve the larger of them; different lanes STACK across the band and their reserved insets SUM. Two independently-registered bars on one edge (an exam bar + a "problem statement changed" banner; the library's own presence + a host header) now both get room instead of overlapping.
- **Grid-framed bands.** The header/footer/rail bands are laid out in a CSS-grid frame over the full-bleed canvas (header/footer own the top/bottom rows, rails span the side tracks between those bands), so bands are structurally incapable of overlapping each other on any screen size — no more palette-over-header collision. Device safe-area and mobile-keyboard insets are handled once as grid padding.
- **Inset-aware corner slots.** Corner controls (zoom, minimap, presence, host buttons) float within the reserved band area — a bottom-corner cluster clears a footer band, a top-corner control clears a header band — instead of tucking under it. Bottom corners are extent-aware: they clear a side rail only where it actually reaches down to them, so a short palette leaves the bottom-left zoom cluster flush at the edge instead of stranded across an empty column.
- **Keyboard-aware footer.** The `footer` band and bottom chrome ride above the mobile soft keyboard (`--apollon-keyboard-inset`, from `visualViewport`), so an action bar stays reachable while a label editor has focus.
- **`<Apollon.SelectionToolbar>`.** A selection-anchored, screen-space toolbar (wraps React Flow's `NodeToolbar`) that follows the current selection and does not scale with zoom — the Figma/tldraw affordance.
- **Presence via the controls API.** Collaboration presence avatars register as a top-right control instead of a hand-positioned absolute element, so the engine places and deconflicts them with host chrome in the same corner.

**i18n (`labels`).** The editor's own strings (palette / zoom / minimap tooltips and aria-labels, and the editing popovers) are a typed `ApollonLabels` dictionary with English defaults. A host localizes any subset via `ApollonOptions.labels` / `<Apollon labels={…}>` / `editor.setLabels(…)` — reactive, so a language switch needs no remount. `useLabels()` reads the active set inside custom chrome. Previously every string was hardcoded English, stranding tooltips in a localized host (e.g. Artemis).

The zoom cluster keeps its glass islands and the WAI-ARIA APG toolbar pattern (single tab stop, arrow-key roving); the palette/minimap expose accessible names.
