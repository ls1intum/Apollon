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

> **`--apollon-*` is THE public theming contract.** Those are the only variable
> names guaranteed stable across releases. The library is Tailwind-free and
> ships its own self-contained `style.css`, so **do not** reach for shadcn's
> unprefixed token names — `--color-*`, `--radius-*`, and the webapp's `--home-*`
> accent variables are **private/internal** implementation details that are not
> exposed by the published bundle and may change at any time. Theme exclusively
> through `--apollon-*` (typed via `createApollonTheme`) and `data-theme`.

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

| `ApollonTheme` field       | CSS variable                            | Used for                                            |
| -------------------------- | --------------------------------------- | --------------------------------------------------- |
| `primary`                  | `--apollon-primary`                     | Accent / brand color (selection, links, highlights) |
| `primaryContrast`          | `--apollon-primary-contrast`            | Foreground text on `background`                     |
| `secondary`                | `--apollon-secondary`                   | Muted / secondary accent                            |
| `background`               | `--apollon-background`                  | Canvas / surface background                         |
| `backgroundInverse`        | `--apollon-background-inverse`          | Inverse surface (e.g. tooltips)                     |
| `backgroundVariant`        | `--apollon-background-variant`          | Slightly raised surface variant                     |
| `surface`                  | `--apollon-surface`                     | Raised card / popover / menu surface                |
| `surfaceSunken`            | `--apollon-surface-sunken`              | Sunken / recessed surface                           |
| `surfaceHover`             | `--apollon-surface-hover`               | Hover state of the raised surface                   |
| `border`                   | `--apollon-border`                      | Default border / divider color                      |
| `borderSubtle`             | `--apollon-border-subtle`               | Subtle border / divider color                       |
| `radius`                   | `--apollon-radius`                      | Base corner radius for shared primitives            |
| `gray`                     | `--apollon-gray`                        | Neutral gray surface                                |
| `grayVariant`              | `--apollon-gray-variant`                | Stronger gray (borders / dividers)                  |
| `grid`                     | `--apollon-grid`                        | Canvas grid line color                              |
| `guideVertical`            | `--apollon-guide-vertical`              | Vertical alignment guide                            |
| `guideHorizontal`          | `--apollon-guide-horizontal`            | Horizontal alignment guide                          |
| `warning`                  | `--apollon-alert-warning-yellow`        | Warning alert accent                                |
| `warningBackground`        | `--apollon-alert-warning-background`    | Warning alert background                            |
| `warningBorder`            | `--apollon-alert-warning-border`        | Warning alert border                                |
| `danger`                   | `--apollon-alert-danger-color`          | Danger alert text                                   |
| `dangerBackground`         | `--apollon-alert-danger-background`     | Danger alert background                             |
| `dangerBorder`             | `--apollon-alert-danger-border`         | Danger alert border                                 |
| `switchBoxBorderColor`     | `--apollon-switch-box-border-color`     | Toggle / switch outline                             |
| `listGroupColor`           | `--apollon-list-group-color`            | List-group surface color                            |
| `btnOutlineSecondaryColor` | `--apollon-btn-outline-secondary-color` | Outline-secondary button color                      |
| `modalBottomBorder`        | `--apollon-modal-bottom-border`         | Modal footer divider                                |

> **Contrast / pairing.** The palette is internally balanced for WCAG AA. If you
> override `background` or `primary`, override `primaryContrast` to match —
> `primaryContrast` is the foreground used on top of `background`, and changing
> only one side can drop text/UI below the AA contrast ratio. When in doubt,
> verify the `background` ⇄ `primaryContrast` pair (and `primary` against the
> surfaces it sits on) with a contrast checker.

## Editor chrome (`--apollon-chrome-*`) — auto-derived, rarely set

The floating editor chrome — the element palette, zoom / undo controls, minimap,
header islands, and version rail — is painted from a second band of variables,
`--apollon-chrome-*`. **You almost never set these.** Every chrome surface,
border, and text color is `color-mix()`-**derived from the two tokens you already
theme** — `--apollon-background` and `--apollon-primary-contrast` — so theming
those two gives the chrome correct, cohesive light/dark values for free. They are
deliberately kept out of `ApollonTheme` / `createApollonTheme` for that reason:
the typed API is the surface you tune; chrome follows.

The handful that are genuinely meant to be tuned (and are safe to override) are:

| CSS variable                 | Used for                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `--apollon-chrome-accent`    | Accent for meaning (primary action, current marker). Defaults to `--apollon-primary`. |
| `--apollon-chrome-radius-sm` | Pill / small-control corner radius (default 6px).                                     |
| `--apollon-chrome-radius-md` | Control corner radius (default 8px).                                                  |
| `--apollon-chrome-radius-lg` | Panel / rail corner radius (default 12px).                                            |
| `--apollon-chrome-edge`      | Margin from the canvas edge for every cluster (default 10px).                         |
| `--apollon-chrome-gap`       | Gap between adjacent clusters (default 8px).                                          |

Everything else under `--apollon-chrome-*` (the derived surface / border / text
ramp, the glass tint + blur, shadows, motion tokens, and the dimensional
`btn`/`pad`/`hit`/`island-h` system) is **internal** — derived or structural, not
part of the stable contract. Don't depend on those names; theme `background` +
`primaryContrast` and let the chrome derive.

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

## Architecture guardrail

A few structural choices in the styling pipeline are **load-bearing and
intentional** — they exist to keep the published bundle framework-agnostic and
Tailwind-free. They are not accidental over-customization to "clean up":

- **Tailwind-free `--apollon-*` / raw-CSS surface.** The published library ships
  one self-contained, Preflight-free `style.css` that references `--apollon-*`
  variables with built-in fallbacks. There is intentionally **no Tailwind and no
  unprefixed token leakage** in the bundle, so embeds can't collide with a
  host's own utility classes or design tokens.
- **Empty-cva + `data-slot` primitives.** Components in `packages/ui` use
  deliberately empty `cva()` bases and `data-slot` attributes as stable styling
  hooks. The emptiness is the point — styling flows through the compiled CSS and
  `data-slot` selectors, not inline variants.
- **`@apply`-compiled `components.css`.** `packages/ui/dist/components.css` is
  compiled from `src/styles/components.css` (which uses `@apply`) by the
  `build:css` step. The compiled artifact is what consumers load; do not hand-
  edit it.
- **Canonical base-nova arbitrary values.** The arbitrary values baked into the
  base-nova primitives in `packages/ui` are the canonical design source. Keep
  them as-is rather than "rounding" them to nearby scale steps.

Treat these as fixed contracts. Changes here ripple into every embed and the
framework-agnostic guarantee, so they should be deliberate, not cosmetic.
