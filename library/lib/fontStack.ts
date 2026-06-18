/**
 * The diagram text font stack — single source of truth for the measured,
 * rendered, and exported font (must stay byte-identical across all three, or
 * the editor measures one face and renders another and nodes overlap). Apollon
 * self-hosts the leading `Inter` family; see `lib/styles/fonts.css`.
 *
 * Dependency-free leaf module on purpose: `MultilineText` / `svgTextLayout` read
 * these at import-init, and `constants.ts` transitively imports those via the
 * node SVGs — defining the stack here (and re-exporting from `constants.ts`)
 * keeps it initialised first, avoiding a temporal-dead-zone crash on the cycle.
 */
export const FONT_FAMILY =
  "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif"

/** Canvas `measureText` / rendered text size for diagram labels, in CSS px. */
export const DEFAULT_FONT_SIZE = 16
