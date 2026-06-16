import interBoldWoff2 from "@/assets/fonts/Inter-Bold.woff2?inline"
import interRegularWoff2 from "@/assets/fonts/Inter-Regular.woff2?inline"

/**
 * Inter `@font-face` CSS for self-contained `compat`-mode SVG exports.
 *
 * The two imports are base64 `data:` URLs produced by Vite's `?inline` loader
 * from the **exact same** woff2 files bundled into the editor stylesheet
 * (`lib/styles/fonts.css`). One source of truth means the metrics the editor
 * measured against (canvas `measureText`) and the glyphs a viewer renders are
 * byte-identical — there is no second font to drift.
 *
 * This module is intentionally data-only and is loaded lazily (a dynamic
 * `import()` in `ApollonEditor.exportModelAsSvg`), so the ~110 KB of base64
 * lands in its own chunk instead of bloating the main entry bundles. Web-mode
 * exports never load it.
 *
 * Why embed at all: a `compat` SVG is meant to be opened away from the editor
 * — a browser tab, Inkscape, PowerPoint, a headless Playwright screenshot —
 * all of which resolve `@font-face`, so text renders in Inter exactly as
 * on-screen. (Pure-Rust renderers like resvg do not yet resolve data-URI
 * `@font-face` — resvg#541 — so for those, pass the bundled Inter via
 * `fontFiles`; the embedded face is harmlessly ignored.)
 */
export const INTER_FONT_FACE_CSS = `
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(${interRegularWoff2}) format("woff2");
}
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(${interBoldWoff2}) format("woff2");
}
`.trim()
