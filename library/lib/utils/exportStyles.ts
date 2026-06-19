import baseCss from "@xyflow/react/dist/base.css?inline"
import appCss from "@/styles/app.css?inline"

/**
 * Layout CSS the off-screen export mount needs to be self-contained, so a
 * consumer rendering headlessly never has to import `@tumaet/apollon/style.css`
 * for the export to be correct.
 *
 * The load-bearing rule is React Flow's `base.css` `.react-flow__node {
 * position: absolute }`: Apollon positions each connection `<Handle>` with an
 * inline `left/top: "X%"` (see `DefaultNodeWrapper`), and a percentage offset
 * resolves against the nearest *positioned* ancestor. React Flow sets the
 * node's transform/size inline but not `position` — that comes only from
 * `base.css`. Without it `.react-flow__node` is `position: static`, the handle
 * `%` offsets resolve against the wrong box, React Flow's on-mount
 * `getBoundingClientRect` handle measurement is wrong, and edges route through
 * the node boxes (the symptom reported for browser/Playwright exports). The
 * same `base.css` also positions `.react-flow__viewport/.react-flow__edges`,
 * which the `getBoundingClientRect`-based bounds math in `exportUtils` relies on.
 *
 * `app.css` adds `.apollon-canvas { flex: 1; ... }` so the canvas fills the
 * 4000×4000 mount container.
 *
 * WARNING: `app.css` is inlined verbatim into this lazy chunk. It must stay
 * free of `@font-face`, `url(...)`, and `@import`, or those assets leak into
 * this chunk (the Inter font is shipped separately, see `exportFonts.ts`).
 *
 * Reached only via a dynamic `import()` in `exportModelAsSvg`, so Rollup emits
 * it as its own chunk and these ~26 KB of CSS-as-string stay out of the main
 * bundle (mirrors the `exportFonts.ts` pattern). The chunk is emitted per build
 * entry (`dist/` and `dist/react/`).
 */
export const EXPORT_LAYOUT_CSS = `${baseCss}\n${appCss}`
