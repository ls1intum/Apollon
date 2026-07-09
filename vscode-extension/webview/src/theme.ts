import { useSyncExternalStore } from "react"

/**
 * VS Code puts `vscode-light` / `vscode-dark` / `vscode-high-contrast` /
 * `vscode-high-contrast-light` on `<body>` and swaps them live. Apollon's chrome
 * keys its dark variants off `data-theme`, so map one onto the other. The two
 * high-contrast themes are light/dark variants themselves; their heightened
 * borders come from the `--vscode-*` tokens the editor palette is bound to in
 * index.css, not from a third `data-theme` value.
 */
export type ApollonDataTheme = "light" | "dark"

const read = (): ApollonDataTheme => {
  const classes = document.body.classList
  const highContrastDark =
    classes.contains("vscode-high-contrast") &&
    !classes.contains("vscode-high-contrast-light")
  return classes.contains("vscode-dark") || highContrastDark ? "dark" : "light"
}

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange)
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => observer.disconnect()
}

/** The active VS Code theme, as Apollon's `dataTheme`. Follows live switches. */
export function useVsCodeTheme(): ApollonDataTheme {
  return useSyncExternalStore(subscribe, read)
}
