---
id: theming
title: Theming
description: Theme the embeddable Apollon editor with --apollon-* CSS custom properties, createApollonTheme, and the data-theme light/dark switch.
---

# Theming

The embeddable Apollon editor is themed entirely through **CSS custom
properties** (`--apollon-*`) plus an optional **`data-theme`** attribute. There
is no CSS-in-JS and no Tailwind in the published bundle — just one
self-contained, Preflight-free stylesheet that _references_ these variables with
built-in light/dark fallbacks. Theming is therefore framework-agnostic: it works
from React, Angular, a VS Code webview, or plain HTML, and an un-themed embed
renders correctly out of the box.

```ts
import "@tumaet/apollon/style.css" // the editor stylesheet (ships the defaults)
```

:::info `--apollon-*` is THE public theming contract
Those are the only variable names guaranteed stable across releases. The library
is Tailwind-free and ships its own self-contained `style.css`, so **do not**
reach for shadcn's unprefixed token names — `--color-*`, `--radius-*`, and the
webapp's `--home-*` variables are **internal** implementation details that are
not exposed by the published bundle and may change at any time. Theme
exclusively through `--apollon-*` (typed via `createApollonTheme`) and
`data-theme`.
:::

## Token architecture

The editor's tokens are organized in layers, light values in `:root` and dark
deltas in `:root[data-theme="dark"]`:

- **Primitives** — the only place literal colors live (the brand palette).
- **`--apollon-*`** — the public editor theming API. References primitives only,
  so an external embed is fully standalone. **This is the surface you tune.**
- **Editor chrome (`--apollon-chrome-*`)** — the floating palette, controls,
  minimap, header islands, and version rail. Almost every chrome value is
  `color-mix()`-**derived from the two tokens you already theme**
  (`--apollon-background` and `--apollon-primary-contrast`), so theming those two
  gives the chrome correct, cohesive light/dark values for free.

Every selector references its variable as `var(--apollon-x, <fallback>)`, so
overriding any subset is safe and forward-compatible — unset tokens keep the
stylesheet's built-in defaults.

## Quick start

```tsx
import { Apollon, createApollonTheme } from "@tumaet/apollon"

export function Editor() {
  return (
    <Apollon
      style={{ height: 600 }}
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

## `createApollonTheme`

`createApollonTheme(theme: ApollonTheme)` turns a typed, partial token object
into a framework-agnostic style object of `--apollon-*` CSS custom properties.
Only the keys you provide are emitted, so it composes with any styling layer:

```ts
import { createApollonTheme, type ApollonTheme } from "@tumaet/apollon"

const vars = createApollonTheme({
  primary: "#0f3a66",
  primaryContrast: "#ffffff",
  background: "#fafafa",
})
// → {
//     "--apollon-primary": "#0f3a66",
//     "--apollon-primary-contrast": "#ffffff",
//     "--apollon-background": "#fafafa",
//   }
```

Values are any valid CSS color/length string (`"#3e8acc"`, `"rgb(62 138 204)"`,
`"var(--my-brand)"`). The result is a plain object — spread it into a React
`style`/`theme` prop, or apply it imperatively:

```ts
const vars = createApollonTheme({ primary: "tomato" })
for (const [key, value] of Object.entries(vars)) {
  element.style.setProperty(key, value)
}
new ApollonEditor(element)
```

## The public token contract

### Typed tokens (`ApollonTheme` → `--apollon-*`)

These are the documented, stable color/radius tokens. The `ApollonTheme` field
is the ergonomic alias `createApollonTheme` maps to the CSS variable; you can
also set the variable directly in CSS.

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

:::tip Keep contrasting pairs in sync
The palette is internally balanced for WCAG AA. If you override `background` or
`primary`, override `primaryContrast` to match — `primaryContrast` is the
foreground used on top of `background`, and changing only one side can drop
text/UI below the AA contrast ratio. Verify the `background` ⇄ `primaryContrast`
pair (and `primary` against the surfaces it sits on) with a contrast checker.
:::

### Shape, elevation, and state tints (CSS-variable-only)

These stable `--apollon-*` variables tune the shared primitives' corner radii,
drop shadow, and a few state tints. They are **not** on `ApollonTheme` (the typed
surface stays focused on color), but the names are part of the public contract —
set them directly through `style` or a stylesheet rule.

| CSS variable                         | Used for                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `--apollon-radius-sm`                | Small radius — node hover/selection rings, chips, pills (default `4px`).             |
| `--apollon-radius-md`                | Control radius — inputs, toggles. Routes through `--apollon-radius` (default `6px`). |
| `--apollon-radius-lg`                | Panel / popover / menu radius (default `8px`).                                       |
| `--apollon-shadow`                   | Drop shadow for floating surfaces — menus, popovers, select listboxes.               |
| `--apollon-interactive-selection`    | Accent ring/fill marking interactive (quiz-pickable) elements (default amber).       |
| `--apollon-hover-neutral`            | Neutral hover wash for quiet controls, derived off `--apollon-primary-contrast`.     |
| `--apollon-dropzone-accent`          | Ring/stroke shown on an assessment feedback drop target on hover (default blue).     |
| `--apollon-dropzone-accent-fill`     | Translucent fill (40% of `--apollon-dropzone-accent`) outlining box/div targets.     |
| `--apollon-on-collaboration-cursor`  | Ink drawn on a collaborator's colored cursor/avatar (default white).                 |
| `--apollon-assessment-positive-text` | Glyph/text for a positive (rewarded) score — popover pill AND on-canvas badge.       |
| `--apollon-assessment-positive-bg`   | Soft tint behind a positive score (popover pill + canvas badge).                     |
| `--apollon-assessment-negative-text` | Glyph/text for a negative (penalty) score.                                           |
| `--apollon-assessment-negative-bg`   | Soft tint behind a negative score.                                                   |
| `--apollon-assessment-zero-text`     | Glyph/text for a zero score.                                                         |
| `--apollon-assessment-zero-bg`       | Soft tint behind a zero score.                                                       |
| `--apollon-assessment-ungraded-text` | Text for the "Not graded" pill (popover only — ungraded elements get no badge).      |
| `--apollon-assessment-ungraded-bg`   | Soft tint behind the "Not graded" pill.                                              |

```css
/* Sharpen the editor's corners and lift its menus a touch more. */
.apollon-editor {
  --apollon-radius-sm: 2px;
  --apollon-radius-md: 3px;
  --apollon-radius-lg: 6px;
  --apollon-shadow: 0 6px 20px rgb(0 0 0 / 22%);
}
```

`--apollon-radius-md` references `--apollon-radius`, so tuning the single base
`radius` token flows through to controls; override `-md` explicitly only when you
want it to diverge from the base.

### Collaboration cursor palette (`--apollon-collaboration-color-*`)

When real-time collaboration is enabled, each remote participant's cursor,
selection, and name tag is painted in one of eight stable palette slots, chosen
deterministically from the participant's name (so the same person keeps the same
color across a session). The defaults are an eight-hue ramp tuned to stay legible
on both the light and dark canvas; override any subset.

| CSS variable                      | Default hue |
| --------------------------------- | ----------- |
| `--apollon-collaboration-color-1` | amber       |
| `--apollon-collaboration-color-2` | green       |
| `--apollon-collaboration-color-3` | blue        |
| `--apollon-collaboration-color-4` | red         |
| `--apollon-collaboration-color-5` | violet      |
| `--apollon-collaboration-color-6` | teal        |
| `--apollon-collaboration-color-7` | orange      |
| `--apollon-collaboration-color-8` | cyan        |

### Color-picker swatch palette (`--apollon-swatch-*`)

The editor's color picker offers a fixed, accessibility-tuned nine-hue palette
for element fills and strokes. Each slot is a public, settable handle; the
defaults re-resolve per theme so the swatches stay legible on both canvases.

| CSS variable              | Default |
| ------------------------- | ------- |
| `--apollon-swatch-slate`  | slate   |
| `--apollon-swatch-red`    | red     |
| `--apollon-swatch-orange` | orange  |
| `--apollon-swatch-amber`  | amber   |
| `--apollon-swatch-green`  | green   |
| `--apollon-swatch-teal`   | teal    |
| `--apollon-swatch-blue`   | blue    |
| `--apollon-swatch-violet` | violet  |
| `--apollon-swatch-pink`   | pink    |

### Editor chrome (`--apollon-chrome-*`) — auto-derived, rarely set

The floating chrome (element palette, zoom/undo controls, minimap, header
islands, version rail) is painted from the `--apollon-chrome-*` band. **You
almost never set these.** Every chrome surface, border, and text color is
`color-mix()`-derived from `--apollon-background` and `--apollon-primary-contrast`,
so theming those two gives the chrome correct light/dark values for free. The
handful that are genuinely meant to be tuned:

| CSS variable                 | Used for                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `--apollon-chrome-accent`    | Accent for meaning (primary action, current marker). Defaults to `--apollon-primary`. |
| `--apollon-chrome-radius-sm` | Pill / small-control corner radius (default `6px`).                                   |
| `--apollon-chrome-radius-md` | Control corner radius (default `8px`).                                                |
| `--apollon-chrome-radius-lg` | Panel / rail corner radius (default `12px`).                                          |
| `--apollon-chrome-edge`      | Margin from the canvas edge for every cluster (default `10px`).                       |
| `--apollon-chrome-gap`       | Gap between adjacent clusters (default `8px`).                                        |

Everything else under `--apollon-chrome-*` (the derived surface/border/text ramp,
the glass tint and blur, shadows, motion tokens, and the dimensional
`btn`/`pad`/`hit`/`island-h` system) is **internal** — derived or structural, not
part of the stable contract. Don't depend on those names; theme `background` +
`primaryContrast` and let the chrome derive.

## Light and dark mode

The bundled stylesheet ships **light defaults in `:root`** and **dark deltas in
`:root[data-theme="dark"]`**. Dark mode is driven by a single mechanism: the
`data-theme` attribute. To switch the whole document to dark:

```ts
document.documentElement.setAttribute("data-theme", "dark")
document.documentElement.style.colorScheme = "dark"
```

The editor also reads `data-theme` from any **ancestor**, so you can scope dark
mode to a subtree instead of the whole page. Both the `<Apollon>` component and
the imperative `ApollonEditor` accept a `dataTheme` option that sets the
attribute directly on the mount node:

```tsx
<Apollon dataTheme="dark" />
```

```ts
new ApollonEditor(element, { dataTheme: "dark" })
```

If you omit `dataTheme`, the editor inherits whatever `data-theme` an ancestor
declares (or the light default). Per-variable `theme` overrides apply on top of
whichever light/dark base is active.

:::note OS dark mode is not automatic
The editor switches to dark **only** when `data-theme="dark"` is present — it
does not read `prefers-color-scheme` on its own. To follow the operating
system's preference, drive `data-theme` from a media query in your host:

```ts
const mq = window.matchMedia("(prefers-color-scheme: dark)")
const apply = () =>
  document.documentElement.setAttribute(
    "data-theme",
    mq.matches ? "dark" : "light"
  )
mq.addEventListener("change", apply)
apply()
```

:::

## Worked example: rebrand the editor

A complete rebrand — a brand accent, a matching dark palette, and softer
corners — driven from the host's own dark-mode state.

```tsx
import { Apollon, createApollonTheme } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

const light = createApollonTheme({
  primary: "#7c3aed", // brand violet
  primaryContrast: "#1a1024", // body ink on the light canvas
  background: "#ffffff",
  radius: "10px", // rounder controls (flows through --apollon-radius-md)
})

const dark = createApollonTheme({
  primary: "#a78bfa", // lighter violet, legible on a dark canvas
  primaryContrast: "#f5f3ff", // near-white ink
  background: "#161122", // deep violet-tinted canvas
  radius: "10px",
})

export function BrandedEditor({ isDark }: { isDark: boolean }) {
  return (
    <Apollon
      style={{ height: 600, ["--apollon-radius-lg" as string]: "14px" }}
      dataTheme={isDark ? "dark" : undefined}
      theme={isDark ? dark : light}
    />
  )
}
```

What this does:

- `primary` becomes the selection / link / highlight accent **and** the chrome
  accent (chrome falls back to `--apollon-primary`).
- `background` + `primaryContrast` re-derive the entire floating chrome
  (surfaces, borders, text) for both themes automatically — no chrome tokens set.
- `radius` retunes the base control rounding; the extra inline
  `--apollon-radius-lg` rounds menus/popovers further. Both are read as
  `var(--apollon-x, <fallback>)`, so they cascade cleanly.

For a non-React host, build the same objects and apply them imperatively:

```ts
import { ApollonEditor, createApollonTheme } from "@tumaet/apollon"

const el = document.getElementById("apollon")!
const vars = createApollonTheme({ primary: "#7c3aed", radius: "10px" })
for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v)
new ApollonEditor(el, { dataTheme: "dark" })
```

## Gotchas

- **Set the stylesheet.** Themes only re-color what `@tumaet/apollon/style.css`
  draws. If you forget the import, there is nothing to theme.
- **Override contrasting pairs together.** Changing `background` without
  `primaryContrast` (or vice versa) can break WCAG AA. The two also drive the
  whole derived chrome ramp, so a mismatched pair degrades chrome legibility too.
- **Don't theme internal tokens.** `--color-*`, `--radius-*`, `--home-*`, and the
  non-listed `--apollon-chrome-*` tokens are internal and may change. Only the
  `--apollon-*` names documented here are stable.
- **Theme prop wins over `style`.** In `<Apollon>`, `theme` is spread after
  `style`, so a token in `theme` always beats a same-named property in `style`.
- **Imperative themes apply at construction.** `new ApollonEditor(el, { theme })`
  writes the variables once on mount. To restyle a live imperative editor, set
  the CSS variables on the mount element yourself (`el.style.setProperty(...)`);
  React hosts get this for free because the `theme` prop is reactive.
- **OS dark mode needs wiring.** See the note above — the editor does not auto-
  follow `prefers-color-scheme`.
- **Containers need an explicit height** — unrelated to theming but the most
  common embedding mistake. See [Troubleshooting](/library/troubleshooting).

## Host patterns

### VS Code webview

VS Code applies `vscode-light` / `vscode-dark` / `vscode-high-contrast` classes
to `<body>`. Mirror those onto `data-theme` so the editor follows live theme
switches:

```ts
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

### Backward compatibility

`theme` and `dataTheme` are both optional. An embed that passes neither keeps
working exactly as-is: the stylesheet's per-property fallbacks
(`var(--apollon-primary, …)`) and the `:root` / `:root[data-theme="dark"]` blocks
fully define the default light and dark looks.
