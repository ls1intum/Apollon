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
  // The shared @tumaet/ui primitives (input, select, button, tooltip) paint from
  // these aliases rather than from `--apollon-*`. They are re-declared on
  // `.apollon-editor` (see tokens.css) so they track a scoped theme; a popup
  // portaled to <body> leaves that subtree, so it has to carry them along or its
  // input borders and placeholder ink stay at the document's light values.
  "--home-surface-sunken",
  "--home-surface-raised",
  "--home-border-default",
  "--home-text-secondary",
  "--home-text-muted",
  "--home-accent-contrast",
  "--home-shadow-overlay",
  "--home-radius-md",
  "--home-radius-lg",
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

/**
 * Popups copy *resolved values*, so they must re-copy them whenever anything
 * that changes what the tokens resolve to changes. Without that, a theme switch
 * leaves an open menu — and every later one anchored to the same element —
 * painting the palette it first resolved under.
 *
 * One observer serves every popup: an editor keeps dozens of tooltips mounted.
 */
let themeVersion = 0
const themeListeners = new Set<() => void>()
let stopObservingTheme: (() => void) | undefined

const bumpThemeVersion = () => {
  themeVersion += 1
  for (const listener of themeListeners) listener()
}

function observeTheme(): () => void {
  const observer = new MutationObserver(bumpThemeVersion)

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class", "style"],
  })
  // `class` only: a palette drag writes `body.style.overflow`, which must not
  // repaint every popup. VS Code marks its theme kind with a class on <body>.
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  })
  // A scoped mount lives anywhere in the tree and may appear after the first
  // popup subscribes, so watch the whole document for `data-theme` flips.
  observer.observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-theme"],
  })
  // A host may swap the <style> that declares its variables rather than touch
  // any attribute — VS Code re-injects its `--vscode-*` block on every switch.
  observer.observe(document.head, { childList: true })

  const media = window.matchMedia?.("(prefers-color-scheme: dark)")
  media?.addEventListener("change", bumpThemeVersion)

  return () => {
    observer.disconnect()
    media?.removeEventListener("change", bumpThemeVersion)
  }
}

const subscribeToTheme = (listener: () => void): (() => void) => {
  themeListeners.add(listener)
  stopObservingTheme ??= observeTheme()
  return () => {
    themeListeners.delete(listener)
    if (themeListeners.size === 0) {
      stopObservingTheme?.()
      stopObservingTheme = undefined
    }
  }
}

const getThemeVersion = () => themeVersion

/** A counter that changes whenever `--apollon-*` may resolve to new values. */
const useApollonThemeVersion = (): number =>
  React.useSyncExternalStore(subscribeToTheme, getThemeVersion, getThemeVersion)

/**
 * The {@link resolveApollonThemeVars} of `anchor`, kept current as the theme
 * changes — spread onto a portaled popup. Hold the anchor in state (a callback
 * `ref`) rather than a `useRef`, so the popup resolves its tokens on the render
 * that attaches the trigger instead of a frame later.
 */
export function usePortalThemeVars(
  anchor: Element | null | undefined
): React.CSSProperties {
  const version = useApollonThemeVersion()
  return React.useMemo(() => {
    // The tokens live in the DOM, not in this closure, so `version` is what
    // tells the memo they may have changed. Read it, or the linter and the
    // React Compiler both conclude it is not a dependency.
    void version
    return resolveApollonThemeVars(anchor)
  }, [anchor, version])
}
