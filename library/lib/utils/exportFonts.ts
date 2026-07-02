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
 *
 * Only the two UPRIGHT faces are inlined. Abstract classes/methods are italic,
 * but embedding the italic woff2 pair too would roughly double this base64
 * payload (~180 KB) to serve a single case: a raw `.svg` opened in a renderer
 * that won't synthesize oblique (e.g. Inkscape). Everywhere that matters already
 * has real italic without inlining it here — the editor and the PNG/PDF export
 * paths load it from `fonts.css` / the bundled ttf `fontFiles`, and a browser
 * opening the `.svg` synthesizes the slant from the embedded regular. So the
 * only fallback is upright abstract text when that `.svg` is opened in a
 * non-synthesizing external editor.
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
