# Theming `@tumaet/apollon`

The embeddable Apollon editor is themed entirely through **CSS custom
properties** (`--apollon-*`) plus an optional **`data-theme`** attribute. There
is no CSS-in-JS and no Tailwind in the published bundle — just one
self-contained, Preflight-free stylesheet that _references_ these variables with
built-in light/dark fallbacks. That makes theming framework-agnostic: it works
from React, VS Code webviews, or plain HTML, and an un-themed embed renders
correctly out of the box.

```ts
import "@tumaet/apollon/style.css" // the editor stylesheet (loads the defaults)
```

## Quick start

```tsx
import { Apollon } from "@tumaet/apollon/react"
import { createApollonTheme } from "@tumaet/apollon"

export function Editor() {
  return (
    <Apollon
      style={{ height: "100%" }}
      theme={createApollonTheme({
        primary: "#ff5722",
        primaryContrast: "#ffffff",
      })}
    />
  )
}
```

`theme` is spread onto the editor's mount node as inline CSS variables. Anything
you don't set falls back to the stylesheet defaults, so partial themes are fine.

## The `--apollon-*` variable contract

These are the stable, documented variables. Every selector in the editor
stylesheet references them as `var(--apollon-x, <fallback>)`, so overriding any
subset is safe and forward-compatible. The typed `ApollonTheme` field is the
ergonomic alias `createApollonTheme` maps to the CSS variable.

| `ApollonTheme` field | CSS variable                         | Used for                                            |
| -------------------- | ------------------------------------ | --------------------------------------------------- |
| `primary`            | `--apollon-primary`                  | Accent / brand color (selection, links, highlights) |
| `primaryContrast`    | `--apollon-primary-contrast`         | Foreground text on `background`                     |
| `secondary`          | `--apollon-secondary`                | Muted / secondary accent                            |
| `background`         | `--apollon-background`               | Canvas / surface background                         |
| `backgroundInverse`  | `--apollon-background-inverse`       | Inverse surface (e.g. tooltips)                     |
| `backgroundVariant`  | `--apollon-background-variant`       | Slightly raised surface variant                     |
| `gray`               | `--apollon-gray`                     | Neutral gray surface                                |
| `grayVariant`        | `--apollon-gray-variant`             | Stronger gray (borders / dividers)                  |
| `grid`               | `--apollon-grid`                     | Canvas grid line color                              |
| `guideVertical`      | `--apollon-guide-vertical`           | Vertical alignment guide                            |
| `guideHorizontal`    | `--apollon-guide-horizontal`         | Horizontal alignment guide                          |
| `warning`            | `--apollon-alert-warning-yellow`     | Warning alert accent                                |
| `warningBackground`  | `--apollon-alert-warning-background` | Warning alert background                            |
| `warningBorder`      | `--apollon-alert-warning-border`     | Warning alert border                                |
| `danger`             | `--apollon-alert-danger-color`       | Danger alert text                                   |
| `dangerBackground`   | `--apollon-alert-danger-background`  | Danger alert background                             |
| `dangerBorder`       | `--apollon-alert-danger-border`      | Danger alert border                                 |

> The stylesheet also defines a few internal `--apollon-*` variables
> (`--apollon-switch-box-border-color`, `--apollon-list-group-color`,
> `--apollon-btn-outline-secondary-color`, `--apollon-modal-bottom-border`).
> These are not part of the typed `ApollonTheme` surface but can still be set
> directly via CSS or the `theme` prop if you need to.

## Light / dark — the `data-theme` mechanism

The bundled stylesheet ships **light defaults in `:root`** and **dark deltas in
`:root[data-theme="dark"]`**. To switch the whole document to dark, set the
attribute on the document root (and let the browser style native controls):

```ts
document.documentElement.setAttribute("data-theme", "dark")
document.documentElement.style.colorScheme = "dark"
```

The editor also reads `data-theme` from any **ancestor**, so you can scope dark
mode to a subtree instead of the whole page. The `<Apollon>` component and the
imperative `ApollonEditor` both accept a `dataTheme` option that sets the
attribute directly on the mount node:

```tsx
<Apollon dataTheme="dark" />
```

```ts
new ApollonEditor(element, { dataTheme: "dark" })
```

If you omit `dataTheme`, the editor inherits whatever `data-theme` an ancestor
declares (or the light default). The per-variable `theme` overrides apply on
top of whichever light/dark base is active.

## `createApollonTheme`

```ts
import { createApollonTheme, type ApollonTheme } from "@tumaet/apollon"

const theme: Record<`--apollon-${string}`, string> = createApollonTheme({
  primary: "#0f3a66",
  primaryContrast: "#ffffff",
  background: "#fafafa",
})
// → { "--apollon-primary": "#0f3a66", "--apollon-primary-contrast": "#ffffff", "--apollon-background": "#fafafa" }
```

`createApollonTheme(theme: ApollonTheme)` returns a framework-agnostic style
object of `--apollon-*` CSS custom properties. Only the keys you provide are
emitted — unset tokens keep the stylesheet's fallbacks. The result is a plain
object, so it composes with any styling layer:

```tsx
// React inline style
<Apollon theme={createApollonTheme({ primary: "tomato" })} />
```

```ts
// Imperative — set on the host element yourself
const vars = createApollonTheme({ primary: "tomato" })
for (const [key, value] of Object.entries(vars)) {
  element.style.setProperty(key, value)
}
new ApollonEditor(element)
```

## Host patterns

### External React embedders

Pass `theme` (and optionally `dataTheme`) to `<Apollon>`. Drive dark mode from
your app's own state:

```tsx
import { Apollon } from "@tumaet/apollon/react"
import { createApollonTheme } from "@tumaet/apollon"

function EmbeddedEditor({ dark }: { dark: boolean }) {
  return (
    <Apollon
      style={{ height: "100%" }}
      dataTheme={dark ? "dark" : undefined}
      theme={createApollonTheme({ primary: "#0f3a66" })}
    />
  )
}
```

The `theme` prop is spread **after** `style`, so a theme token always wins over
a same-named property you happen to set in `style`.

### VS Code webview

VS Code auto-applies `vscode-light` / `vscode-dark` / `vscode-high-contrast`
classes to `<body>`. Map those to `data-theme` so the editor follows live theme
switches with no JS — either with a tiny observer, or purely in CSS by scoping
the palette per class (what the bundled Apollon VS Code editor does):

```css
/* CSS-only: re-declare the dark palette under the vscode-dark body class */
body.vscode-dark,
body.vscode-high-contrast {
  --apollon-background: #181a18;
  --apollon-primary-contrast: white;
  /* …the rest of the dark contract… */
}
```

```ts
// or: mirror the body class onto data-theme once, then rely on the defaults
const sync = () => {
  const dark = document.body.classList.contains("vscode-dark")
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light")
}
new MutationObserver(sync).observe(document.body, {
  attributes: true,
  attributeFilter: ["class"],
})
sync()
```

### The Apollon webapp

The standalone webapp owns dark mode via its theme store, which toggles
`data-theme` + `color-scheme` on `document.documentElement`. The editor inherits
that automatically. The app additionally **bridges its accent to the editor
accent** in its own root scope only — `--apollon-primary: var(--home-accent-base)`
— so the embedded editor matches the app's brand. That bridge lives in the
webapp's CSS (never in the published library default), so external embeds keep
the neutral blue default unless they opt in.

## Backward compatibility

`theme` and `dataTheme` are both optional. Existing embeds that pass neither
keep working exactly as before: the stylesheet's per-property fallbacks
(`var(--apollon-primary, #3e8acc)`, etc.) and the `:root` / `:root[data-theme]`
blocks fully define the default light and dark looks.
