---
"@tumaet/apollon": minor
---

Controls API — i18n and immersion engine additions:

- **i18n (`labels`).** The editor's own strings (palette / zoom / minimap tooltips and aria-labels, and the editing popovers) are now a typed `ApollonLabels` dictionary with English defaults. A host localizes any subset via `ApollonOptions.labels` / `<Apollon labels={…}>` / `editor.setLabels(…)` — reactive, so a language switch needs no remount. `useLabels()` reads the active set inside custom chrome. Previously every string was hardcoded English, stranding tooltips in a localized host (e.g. Artemis).
- **Lane-stacking on bands.** Controls in a band now take an optional `lane`: same-lane controls sit along the band's axis and reserve the larger of them; different lanes STACK across the band and their reserved insets SUM. Two independently-registered bars on one edge (an exam bar + a "problem statement changed" banner; the library's own presence + a host header) now both get room instead of overlapping.
- **`<Apollon.SelectionToolbar>`.** A selection-anchored, screen-space toolbar (wraps React Flow's `NodeToolbar`) that follows the current selection and does not scale with zoom — the Figma/tldraw affordance.
- **Presence via the controls API.** Collaboration presence avatars are registered as a top-right control instead of a hand-positioned absolute element, so the engine places them and deconflicts them with host chrome in the same corner.
- **Inset-aware corner slots.** Corner controls (zoom, minimap, presence, host buttons) now float within the reserved band area — a bottom-corner cluster clears a footer band, a top-corner control clears a header band — instead of tucking under it. No-op until a band reserves room.
- **Keyboard-aware footer.** The `footer` band and bottom chrome ride above the mobile soft keyboard (`--apollon-keyboard-inset`, from `visualViewport`), so an action bar stays reachable while a label editor has focus.
