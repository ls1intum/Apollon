export const secondary = "#A3A6A8"
// The chrome surface behind the navbars (home + editor) and the version-history
// rail. Points at the shared `--apollon-chrome-*` contract (library app.css) so
// the whole UI — palette, controls, minimap, header, version rail — is one
// theme-reactive surface in both light and dark, instead of a fixed dark plate
// floating over a light canvas. Kept as a named export so existing call sites
// (sx `bgcolor`, `color-mix`) don't churn; the value is now a CSS variable.
export const NAVBAR_BACKGROUND_COLOR = "var(--apollon-chrome-surface)"
