import React from "react"

/**
 * The `--apollon-*` (and a few derived) custom properties are scoped to the
 * `.apollon-editor` subtree, NOT `:root`. Base UI popups (Popover, Select,
 * Tooltip) portal to `document.body`, which escapes that subtree — so a
 * portaled popup would otherwise fall back to the default light theme even
 * when the editor is embedded with a dark or custom theme.
 *
 * We copy the RESOLVED values of these variables onto the portaled popup's
 * inline style so it paints with the same theme as the editor that opened it.
 */
export const APOLLON_PORTAL_THEME_VARS = [
  "--apollon-primary",
  "--apollon-primary-contrast",
  "--apollon-background",
  "--apollon-background-variant",
  "--apollon-hover-neutral",
  "--apollon-gray-variant",
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
