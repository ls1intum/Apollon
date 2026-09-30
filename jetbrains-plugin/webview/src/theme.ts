import { useSyncExternalStore } from "react"

export type ApollonDataTheme = "light" | "dark"

/**
 * `ThemeBridge.kt` (Phase 4) pushes the IDE's look and feel onto
 * `<html data-theme>` and its `--apollon-*` custom properties directly —
 * unlike the VS Code extension there is no intermediate `--vscode-*` token
 * namespace to bind through, so this file only needs to read the attribute.
 */
const read = (): ApollonDataTheme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light"

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  })
  return () => observer.disconnect()
}

/** The IDE's active theme, as Apollon's `dataTheme`. Follows live LaF switches. */
export function useHostTheme(): ApollonDataTheme {
  return useSyncExternalStore(subscribe, read)
}
