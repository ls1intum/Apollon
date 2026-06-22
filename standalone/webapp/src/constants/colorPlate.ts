export const secondary = "#A3A6A8"
// The chrome surface behind the headers (home + editor) and the version-history
// rail. A CSS variable pointing at the shared `--apollon-chrome-*` contract
// (library app.css) so the whole UI — palette, controls, minimap, header,
// version rail — is one theme-reactive surface in light and dark. Kept as a
// named export so `sx bgcolor` / `color-mix` call sites resolve it directly.
export const NAVBAR_BACKGROUND_COLOR = "var(--apollon-chrome-surface)"
