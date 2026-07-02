// Typed theming API surface for @tumaet/ui consumers (and, re-exported, for
// @tumaet/apollon embedders).
//
// The contract is the public `--apollon-*` CSS custom properties plus the
// `data-theme` attribute. `createApollonTheme` turns a typed, partial token
// object into a framework-agnostic style object of CSS custom properties that
// a host can spread onto any element's `style` (React inline style, a DOM
// `element.style`, etc.). Only the keys you provide are emitted, so un-themed
// embeds keep working off the stylesheet's built-in per-property fallbacks.

/**
 * The documented, stable subset of the `--apollon-*` editor theming tokens.
 *
 * Every field is optional: provide only the tokens you want to override; the
 * rest fall back to the library's built-in light/dark values. Values are any
 * valid CSS color/length string (e.g. `"#3e8acc"`, `"rgb(62 138 204)"`,
 * `"var(--my-brand)"`).
 *
 * See `library/THEMING.md` for the full variable contract and host patterns.
 */
export interface ApollonTheme {
  /** Accent / brand color. Maps to `--apollon-primary`. */
  primary?: string
  /**
   * Ink drawn ON `primary` (accent buttons, the active tool). Defaults to white;
   * set it when `primary` is light so on-accent text stays legible (white-on-light
   * otherwise). Maps to `--apollon-primary-foreground`.
   */
  primaryForeground?: string
  /**
   * Page foreground — the ink drawn on `background` (text, icons, chrome).
   * This is NOT "a color that contrasts with `primary`"; it is the editor's
   * base text color, and the whole chrome ramp derives from it plus
   * `background`. Maps to `--apollon-foreground`.
   */
  foreground?: string
  /** Muted/secondary accent. Maps to `--apollon-secondary`. */
  secondary?: string

  /** Canvas / surface background. Maps to `--apollon-background`. */
  background?: string
  /** Slightly raised surface variant. Maps to `--apollon-background-variant`. */
  backgroundVariant?: string

  /** Neutral gray surface. Maps to `--apollon-gray`. */
  gray?: string
  /** Stronger gray (borders/dividers). Maps to `--apollon-gray-variant`. */
  grayVariant?: string

  /** Canvas grid line color. Maps to `--apollon-grid`. */
  grid?: string

  /** Vertical alignment guide color. Maps to `--apollon-guide-vertical`. */
  guideVertical?: string
  /** Horizontal alignment guide color. Maps to `--apollon-guide-horizontal`. */
  guideHorizontal?: string

  /** Error/danger text color (e.g. validation messages). Maps to `--apollon-danger`. */
  danger?: string

  /** Raised card/popover/menu surface. Maps to `--apollon-surface`. */
  surface?: string
  /** Sunken/recessed surface (e.g. wells, muted areas). Maps to `--apollon-surface-sunken`. */
  surfaceSunken?: string
  /** Default border / divider color. Maps to `--apollon-border`. */
  border?: string
  /** Subtle border / divider color. Maps to `--apollon-border-subtle`. */
  borderSubtle?: string
  /** Base corner radius for shared primitives (CSS length). Maps to `--apollon-radius`. */
  radius?: string
}

// Single source of truth mapping each typed field to its CSS custom property.
// Keeps `createApollonTheme` declarative and the THEMING.md table verifiable.
//
// The typed surface is intentionally minimal: only tokens the Base UI editor
// paints. The chrome derives from `background` + `foreground`.
const TOKEN_VAR_MAP: Record<keyof ApollonTheme, `--apollon-${string}`> = {
  primary: "--apollon-primary",
  primaryForeground: "--apollon-primary-foreground",
  foreground: "--apollon-foreground",
  secondary: "--apollon-secondary",
  background: "--apollon-background",
  backgroundVariant: "--apollon-background-variant",
  gray: "--apollon-gray",
  grayVariant: "--apollon-gray-variant",
  grid: "--apollon-grid",
  guideVertical: "--apollon-guide-vertical",
  guideHorizontal: "--apollon-guide-horizontal",
  danger: "--apollon-danger",
  surface: "--apollon-surface",
  surfaceSunken: "--apollon-surface-sunken",
  border: "--apollon-border",
  borderSubtle: "--apollon-border-subtle",
  radius: "--apollon-radius",
}

/**
 * Build a framework-agnostic style object of `--apollon-*` CSS custom
 * properties from a (partial) {@link ApollonTheme}.
 *
 * Only the keys you provide are emitted — undefined fields are skipped so the
 * library's built-in fallbacks stay in effect. The result can be spread onto
 * any `style` object/attribute:
 *
 * ```tsx
 * <Apollon theme={createApollonTheme({ primary: "#ff5722" })} />
 * ```
 *
 * @param theme partial token object; unset tokens fall back to the defaults.
 * @returns a record of `--apollon-*` variables to their string values.
 */
export function createApollonTheme(
  theme: ApollonTheme
): Record<`--apollon-${string}`, string> {
  const style: Record<`--apollon-${string}`, string> = {}
  for (const key of Object.keys(TOKEN_VAR_MAP) as (keyof ApollonTheme)[]) {
    const value = theme[key]
    if (value !== undefined) {
      style[TOKEN_VAR_MAP[key]] = value
    }
  }
  return style
}
