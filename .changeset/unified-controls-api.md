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

Passing any children opts out of the defaults, so an empty composition is a bare canvas. `useControl(makeDescriptor, deps)` is the underlying primitive (react-map-gl shape) for custom controls and replacements — its `render` runs inside React Flow, so a replacement can drive the viewport.

**Vanilla / imperative — descriptor factories.** `paletteControl()`, `zoomControl({ history })`, `miniMapControl()` build the same records:

```ts
new ApollonEditor(el, { controls: [zoomControl({ history: false })] })
// omit `controls` for the defaults · `[]` for a bare canvas · a subset to show only those
editor.addControl(descriptor) // show · updateControl(id, patch) — move · removeControl(id) — hide
```

This replaces the previous `controls` config object and the `setControls` / `setControl` / `getControlConfig` methods. The minimap is registered honestly as a self-positioning React-Flow-native widget (it renders its own `<Panel>` and reserves no room) rather than a direct render behind a dead id.

It also fixes the two layout symptoms behind the redesign: the palette no longer changes size when an unrelated control moves (a two-tier engine now distinguishes bands, which reserve an edge, from floating slots, which reserve nothing), and controls no longer overlap. The zoom cluster keeps its glass islands and the WAI-ARIA APG toolbar pattern (single tab stop, arrow-key roving); the palette/minimap expose accessible names.
