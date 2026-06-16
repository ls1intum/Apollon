/**
 * The diagram text font stack — the single source of truth.
 *
 * This is a dependency-free leaf module on purpose: several modules read these
 * values at import-init time (e.g. `MultilineText`, `svgTextLayout`), and
 * `constants.ts` transitively imports those via the node SVG components. Keeping
 * the font stack here — rather than in `constants.ts` — means it is fully
 * initialised before any of those readers run, avoiding a temporal-dead-zone
 * crash from the import cycle. `constants.ts` re-exports both for convenience.
 *
 * Apollon self-hosts the leading family, `Inter`, via an `@font-face` bundled
 * into the library stylesheet (`lib/styles/fonts.css`). Node geometry is derived
 * from canvas `measureText`, so the resolved font must be deterministic across
 * every renderer — editor, headless export, server PDF, external SVG renderers.
 * Shipping Inter pins those metrics so a diagram lays out identically everywhere.
 *
 * The `@font-face` family token, the `measureText` font, and the exported
 * `font-family` attribute all MUST stay byte-identical to `FONT_FAMILY` —
 * otherwise the editor measures one face and renders another, and nodes overlap
 * (the classic headless-render bug). Import these instead of re-typing the stack.
 */
export const FONT_FAMILY =
  "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif"

/** Default font size for diagram text, in CSS pixels. */
export const DEFAULT_FONT_SIZE = 16
