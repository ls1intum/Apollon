import React from "react"

/**
 * Base UI popups (menus, selects, tooltips, the color picker) portal to
 * `document.body`, escaping the `.apollon-editor` subtree that scopes `--apollon-*`.
 * A scoped `dataTheme`/`theme` sets tokens on the mount node only, so a portaled
 * popup falls back to the document's (light) default unless we carry the theme
 * over: we copy the resolved token values off the editor container onto the popup.
 *
 * Must list the COMPLETE overridable surface, not a curated subset — the drift
 * test fails if it drops below the typed tokens + swatches. (`--apollon-chrome-*`
 * are excluded on purpose: they re-resolve only within `.apollon-editor`, so a
 * <body>-portaled popup must paint with base tokens, never chrome tokens.)
 */
export const APOLLON_PORTAL_THEME_VARS = [
  // Typed createApollonTheme() surface.
  "--apollon-primary",
  "--apollon-primary-foreground",
  "--apollon-foreground",
  "--apollon-secondary",
  "--apollon-background",
  "--apollon-background-variant",
  "--apollon-gray",
  "--apollon-gray-variant",
  "--apollon-grid",
  "--apollon-guide-vertical",
  "--apollon-guide-horizontal",
  "--apollon-danger",
  "--apollon-surface",
  "--apollon-surface-sunken",
  "--apollon-border",
  "--apollon-border-subtle",
  "--apollon-radius",
  // Radius scale + elevation the shared primitives paint with.
  "--apollon-radius-sm",
  "--apollon-radius-md",
  "--apollon-radius-lg",
  "--apollon-shadow",
  // Accent / neutral washes used by menu + control states.
  "--apollon-hover-neutral",
  "--apollon-on-collaboration-cursor",
  "--apollon-interactive-selection",
  // Color-picker swatch palette (the picker popup portals to <body>).
  "--apollon-swatch-slate",
  "--apollon-swatch-red",
  "--apollon-swatch-orange",
  "--apollon-swatch-amber",
  "--apollon-swatch-green",
  "--apollon-swatch-teal",
  "--apollon-swatch-blue",
  "--apollon-swatch-violet",
  "--apollon-swatch-pink",
  // Assessment score-pill tones — the give/see-feedback popovers portal to
  // <body>, so without these the pills fall back to root/light values.
  "--apollon-assessment-positive-text",
  "--apollon-assessment-positive-bg",
  "--apollon-assessment-negative-text",
  "--apollon-assessment-negative-bg",
  "--apollon-assessment-zero-text",
  "--apollon-assessment-zero-bg",
  "--apollon-assessment-ungraded-text",
  "--apollon-assessment-ungraded-bg",
  // App-level (webapp) surfaces some portaled panels reuse.
  "--panel-background",
  "--panel-shadow",
  "--text",
  "--popover-divider",
] as const

/**
 * Read the computed {@link APOLLON_PORTAL_THEME_VARS} off the editor container
 * that owns `anchor` (its closest `.apollon-editor` ancestor, falling back to
 * the anchor itself) and return them as an inline-style object to spread onto a
 * portaled popup. Returns `{}` when there is no anchor yet.
 */
export function resolveApollonThemeVars(
  anchor: Element | null | undefined
): React.CSSProperties {
  const source = anchor?.closest(".apollon-editor") ?? anchor
  if (!source) return {}

  const computed = getComputedStyle(source)
  const resolved: Record<string, string> = {}
  for (const variable of APOLLON_PORTAL_THEME_VARS) {
    const value = computed.getPropertyValue(variable).trim()
    if (value) resolved[variable] = value
  }
  return resolved as React.CSSProperties
}
