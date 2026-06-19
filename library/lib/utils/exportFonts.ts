import interBoldWoff2 from "@/assets/fonts/Inter-Bold.woff2?inline"
import interRegularWoff2 from "@/assets/fonts/Inter-Regular.woff2?inline"

/**
 * Inter `@font-face` (base64 woff2) for self-contained `compat`-mode SVG
 * exports, so the file renders in Inter when opened away from the editor
 * (browser, Inkscape, PowerPoint). The woff2 is the same file `fonts.css`
 * bundles. resvg does not resolve data-URI `@font-face` (resvg#541) — pass the
 * font via its `fontFiles` instead; the embedded face is harmlessly ignored.
 *
 * Data-only and loaded lazily (dynamic `import()` in `exportModelAsSvg`) so the
 * woff2 lands in its own chunk instead of the main bundle.
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
