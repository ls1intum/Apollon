// Shared DATA (no CSS, no React, no Tailwind) for the two parallel color
// pickers: the Tailwind webapp `ColorPicker` (color-picker.tsx) and the
// embed-safe editor `EditorColorPicker` (library StyleEditor/ColorButtons.tsx).
// The two COMPONENTS stay separate on purpose (the editor ships Tailwind-free
// markup), but the swatch palette ordering and the native-input fallback are one
// source of truth and live here so they can't drift. Importing this from the
// editor is embed-safe: it's plain TS with zero styling.

// `<input type="color">` requires a literal 7-char hex value attribute — it
// rejects CSS vars and the empty string — so this platform-mandated fallback is
// the one hex the pickers cannot tokenize. Named so it isn't a magic literal.
export const NATIVE_COLOR_INPUT_FALLBACK = "#000000"

// Ordered swatch palette, by base name. Each picker prefixes these into its own
// token namespace: the webapp into `--color-swatch-*` (the semantic Tailwind
// bridge) and the editor into `--apollon-swatch-*` (the raw apollon tokens).
// The value a picker hands back is the resolved `var(...)` reference, so a
// chosen swatch re-resolves per theme.
export const SWATCH_NAMES = [
  "slate",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
] as const

export type SwatchName = (typeof SWATCH_NAMES)[number]
