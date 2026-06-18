// Sidebar lives on the navbar's dark plate, independent of the document
// theme — these are the on-dark text shades and state tints used throughout.
// Backed by the semantic --home-on-dark-* tokens (tokens.css), which carry the
// always-dark rgba values so this fixed-dark plate renders identically in both
// the light and dark document themes.
export const TEXT_PRIMARY = "var(--home-on-dark-text)"
export const TEXT_MUTED = "var(--home-on-dark-text-muted)"
export const ROW_HOVER_BG = "var(--home-on-dark-row-hover)"
export const ROW_SELECTED_BG = "var(--home-on-dark-row-selected)"
